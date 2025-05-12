# profiles/agent_views.py
from __future__ import annotations

import asyncio
import base64
import inspect
import json
import queue
import threading
from typing import Dict, Generator, List, Optional

from django.core.cache import cache
from django.http import StreamingHttpResponse
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from pipeline_agents.openai_client import client
from pipeline_agents.profile_builder import build_profile_builder_agent
from voice.views import _get_client

from .models import AgentMessage
from .serializers import AgentMessageSerializer


# ───────────────────────── helpers ──────────────────────────────
def make_prompt(hist: List[AgentMessage], latest: str) -> str:
    return "\n".join(
        [
            *(
                f"{'User' if m.role == 'user' else 'Assistant'}: {m.content}"
                for m in hist
            ),
            f"User: {latest}",
        ]
    )


def _maybe_call(attr):
    if callable(attr):
        try:
            if len(inspect.signature(attr).parameters) == 0:
                return attr()
        except Exception:  # pragma: no cover
            pass
    return attr


def extract_tool_schema(tool) -> Dict:
    """Return an OpenAI-compatible JSON schema for any FunctionTool."""
    for name in (
        "openai_schema",
        "schema",
        "_schema",
        "function_schema",
        "to_openai_schema",
        "to_openai",
        "json_schema",
        "as_openai_schema",
    ):
        if hasattr(tool, name):
            obj = _maybe_call(getattr(tool, name))
            if isinstance(obj, dict):
                return obj

    # Agents-SDK fall-backs
    if hasattr(tool, "params_json_schema"):  # ≥ 0.0.18
        return {
            "type": "function",
            "function": {
                "name": getattr(tool, "name", "unnamed_tool"),
                "description": getattr(tool, "description", "") or "",
                "parameters": tool.params_json_schema,
            },
        }
    if hasattr(tool, "model_dump"):  # pydantic model
        return tool.model_dump()

    raise AttributeError("Unable to locate schema on FunctionTool")


async def _invoke_tool(tool, raw_args: Dict) -> str:
    """
    Call FunctionTool regardless of signature variant.
    Accepts either a string payload_json or kwargs.
    """
    fn = tool.on_invoke_tool
    sig = inspect.signature(fn)
    pos_params = [
        p
        for p in sig.parameters.values()
        if p.kind
        in (
            inspect.Parameter.POSITIONAL_ONLY,
            inspect.Parameter.POSITIONAL_OR_KEYWORD,
        )
    ]

    wants_ctx = len(pos_params) == 2 and pos_params[0].name in ("ctx", "context")
    wants_input = (
        len(pos_params) == 1 and pos_params[0].name in ("input", "payload_json")
    ) or (len(pos_params) == 2 and pos_params[1].name in ("input", "payload_json"))

    if wants_input:
        payload_str = (
            raw_args
            if isinstance(raw_args, str)
            else json.dumps(raw_args, separators=(",", ":"))
        )
        if wants_ctx:
            return await fn(None, payload_str)
        return await fn(payload_str)

    # kwargs style – make sure payload_json is present if expected
    if "payload_json" in sig.parameters and "payload_json" not in raw_args:
        raw_args = {"payload_json": json.dumps(raw_args, separators=(",", ":"))}

    return await fn(**raw_args)


# ───────────────────────── main view ────────────────────────────
class ProfileBuilderAgentView(APIView):
    """
    POST /api/agent/profile-builder/
      Body : {"message": "..."}
      ND-JSON stream   →   {"delta":"Hi", "done":false} … {"delta":"", "done":true}
    """

    permission_classes = [permissions.IsAuthenticated]
    LOCK_TIMEOUT = 60
    CONTENT_TYPE = "application/x-ndjson"

    # ───────────────────────── POST ──────────────────────────
    def post(self, request, *args, **kwargs):
        latest = (request.data.get("message") or "").strip()
        if not latest:
            return Response(
                {"detail": "Missing 'message' field"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        lock_key = f"profile-builder-lock-{user.id}"
        if not cache.add(lock_key, True, self.LOCK_TIMEOUT):
            return Response(
                {"detail": "Agent is already generating a reply, please wait."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # persist user message
        AgentMessage.objects.create(user=user, role="user", content=latest)

        # conversation context
        history = list(AgentMessage.objects.filter(user=user).order_by("created_at"))
        prompt = make_prompt(history, latest)
        meta = build_profile_builder_agent(user_email=user.email)

        system_msg = {"role": "system", "content": meta.instructions}
        user_msg = {"role": "user", "content": prompt}
        tool_schemas = [extract_tool_schema(t) for t in meta.tools]
        tool_lookup = {t.name: t for t in meta.tools}

        q: "queue.Queue[str | dict]" = queue.Queue()

        # ─────────── background worker ───────────
        def worker() -> None:
            async def _run() -> None:
                try:
                    msgs: List[Dict] = [system_msg, user_msg]

                    # 1️⃣  **First pass – STREAMED**
                    stream1 = await client.chat.completions.create(
                        model="gpt-3.5-turbo-0125",
                        messages=msgs,
                        tools=tool_schemas,
                        stream=True,  # ←-- changed from False
                    )

                    collected_tokens: List[str] = []
                    tool_calls_buffer: list = []

                    async for chunk in stream1:
                        delta = chunk.choices[0].delta

                        # ---- tool call path --------------------------------
                        if getattr(delta, "tool_calls", None):
                            tool_calls_buffer.extend(delta.tool_calls)
                            # No tokens should have been sent before a tool call,
                            # so we DON'T push anything to the queue here.
                            continue

                        # ---- normal content path ---------------------------
                        if delta.content:
                            text = delta.content
                            collected_tokens.append(text)
                            q.put(text)

                    # Did the model decide to invoke a tool?
                    if tool_calls_buffer:
                        # Discard any partial assistant text (should be none).
                        collected_tokens = []

                        # wrap the tool-call “assistant” message
                        msgs.append(
                            {
                                "role": "assistant",
                                "tool_calls": [
                                    tc.model_dump() for tc in tool_calls_buffer
                                ],
                                "content": None,
                            }
                        )

                        # Execute each tool synchronously
                        for tc in tool_calls_buffer:
                            fn_name = tc.function.name
                            arg_json = tc.function.arguments or "{}"
                            kwargs = json.loads(arg_json)

                            result = await _invoke_tool(tool_lookup[fn_name], kwargs)

                            msgs.append(
                                {
                                    "role": "tool",
                                    "tool_call_id": tc.id,
                                    "content": result,
                                }
                            )

                        # 2️⃣  **Second pass – final assistant stream**
                        stream2 = await client.chat.completions.create(
                            model="gpt-4o",
                            messages=msgs,
                            stream=False,
                        )

                        async for chunk in stream2:
                            tok = chunk.choices[0].delta.content or ""
                            if tok:
                                collected_tokens.append(tok)
                                q.put(tok)

                    final_reply = "".join(collected_tokens)

                    # signal end
                    q.put({"__done__": True, "reply": final_reply})

                except Exception as exc:
                    q.put({"__error__": str(exc)})
                finally:
                    cache.delete(lock_key)

            asyncio.run(_run())

        threading.Thread(target=worker, daemon=True).start()

        # ─────────── Streaming HTTP response ───────────
        def event_stream() -> Generator[bytes, None, None]:
            while True:
                item = q.get()
                if isinstance(item, str):  # incremental token
                    yield json.dumps({"delta": item, "done": False}).encode() + b"\n"
                    continue

                # error sentinel
                if "__error__" in item:
                    yield json.dumps({"error": item["__error__"]}).encode() + b"\n"
                    break

                # done sentinel
                reply: str = item["reply"]

                # optional TTS (non-blocking)
                audio_b64: Optional[str] = None
                try:
                    speech = _get_client().audio.speech.create(
                        model="tts-1",
                        voice="alloy",
                        input=reply,
                        response_format="mp3",
                    )
                    audio_b64 = base64.b64encode(speech.content).decode()
                except Exception:
                    pass

                # persist assistant message
                AgentMessage.objects.create(user=user, role="assistant", content=reply)

                payload = {"delta": "", "done": True}
                if audio_b64:
                    payload["audio_base64"] = audio_b64
                if "profile_updated" in reply:
                    payload["profile_updated_at"] = user.profile.updated_at.isoformat()

                yield json.dumps(payload).encode() + b"\n"
                break

        return StreamingHttpResponse(event_stream(), content_type=self.CONTENT_TYPE)


# ───────────────────────── history endpoint ─────────────────────
class AgentHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        qs = AgentMessage.objects.filter(user=request.user).order_by("created_at")
        return Response(AgentMessageSerializer(qs, many=True).data)

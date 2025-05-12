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

# ── singleton AsyncOpenAI client ────────────────────────────────
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
    """Return an OpenAI-compatible schema dict for every FunctionTool fork."""
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

    if hasattr(tool, "params_json_schema"):  # current Agents SDK
        return {
            "type": "function",
            "function": {
                "name": getattr(tool, "name", "unnamed_tool"),
                "description": getattr(tool, "description", "") or "",
                "parameters": tool.params_json_schema,
            },
        }

    if hasattr(tool, "model_dump"):  # pydantic model fallback
        return tool.model_dump()

    raise AttributeError("Unable to locate schema on FunctionTool")


async def _invoke_tool(tool, raw_args: Dict) -> str:
    """
    Call FunctionTool regardless of signature variant and always supply the
    payload in the shape it expects.

    Supports:
      • (ctx, input)          – classic two-positional
      • (input)               – single positional
      • keyword-only (payload_json=…) or (**kwargs)
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

    # Does the tool want a single *string* payload?
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

    # Keyword-style tools – ensure they still get `payload_json` as a string
    if "payload_json" in sig.parameters and "payload_json" not in raw_args:
        raw_args = {"payload_json": json.dumps(raw_args, separators=(",", ":"))}

    return await fn(**raw_args)


# ───────────────────────── main view ────────────────────────────
class ProfileBuilderAgentView(APIView):
    """
    POST /api/agent/profile-builder/
      Body : {"message": "..."}
      Stream (ND-JSON):
        {"delta":"Hi","done":false}
        …
        {"delta":"","done":true,"audio_base64":"…"}
    """

    permission_classes = [permissions.IsAuthenticated]
    LOCK_TIMEOUT = 60
    CONTENT_TYPE = "application/x-ndjson"

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

        AgentMessage.objects.create(user=user, role="user", content=latest)

        history = list(AgentMessage.objects.filter(user=user).order_by("created_at"))
        prompt = make_prompt(history, latest)
        meta = build_profile_builder_agent(user_email=user.email)

        system_msg = {"role": "system", "content": meta.instructions}
        user_msg = {"role": "user", "content": prompt}
        tool_schemas = [extract_tool_schema(t) for t in meta.tools]
        tool_lookup = {t.name: t for t in meta.tools}

        q: "queue.Queue[str | dict]" = queue.Queue()

        # ── background worker ───────────────────────────────────────────
        def worker() -> None:
            async def _run() -> None:
                try:
                    # 1️⃣  first call – let model decide if it needs a tool
                    first = await client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[system_msg, user_msg],
                        tools=tool_schemas,
                        stream=False,
                    )
                    msgs: List[Dict] = [system_msg, user_msg]
                    choice0 = first.choices[0].message

                    if getattr(choice0, "tool_calls", None):
                        # ── run each tool synchronously ─────────────────
                        for tc in choice0.tool_calls:
                            fn_name = tc.function.name
                            arg_json = tc.function.arguments or "{}"
                            kwargs = json.loads(arg_json)

                            result = await _invoke_tool(tool_lookup[fn_name], kwargs)

                            msgs.append(
                                {  # assistant tool-call wrapper
                                    "role": "assistant",
                                    "tool_calls": [tc.model_dump()],
                                    "content": None,
                                }
                            )
                            msgs.append(
                                {  # tool result message
                                    "role": "tool",
                                    "tool_call_id": tc.id,
                                    "content": result,
                                }
                            )
                    else:
                        if choice0.content:  # model already answered
                            q.put(choice0.content)

                    # 2️⃣  final assistant stream ───────────────────────
                    stream = await client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=msgs,
                        stream=True,
                    )
                    full: List[str] = []
                    async for chunk in stream:
                        tok = chunk.choices[0].delta.content or ""
                        if tok:
                            full.append(tok)
                            q.put(tok)

                    q.put({"__done__": True, "reply": "".join(full)})

                except Exception as exc:
                    q.put({"__error__": str(exc)})
                finally:
                    cache.delete(lock_key)

            asyncio.run(_run())

        threading.Thread(target=worker, daemon=True).start()

        # ── streaming HTTP response ───────────────────────────────────
        def event_stream() -> Generator[bytes, None, None]:
            while True:
                item = q.get()
                if isinstance(item, str):
                    yield json.dumps({"delta": item, "done": False}).encode() + b"\n"
                elif "__error__" in item:
                    yield json.dumps({"error": item["__error__"]}).encode() + b"\n"
                    break
                else:  # done sentinel
                    reply: str = item["reply"]

                    # optional TTS
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

                    AgentMessage.objects.create(
                        user=user, role="assistant", content=reply
                    )

                    payload = {"delta": "", "done": True}
                    if audio_b64:
                        payload["audio_base64"] = audio_b64
                    if "profile_updated" in reply:
                        payload["profile_updated_at"] = (
                            user.profile.updated_at.isoformat()
                        )

                    yield json.dumps(payload).encode() + b"\n"
                    break

        return StreamingHttpResponse(event_stream(), content_type=self.CONTENT_TYPE)


# ───────────────────────── history endpoint ─────────────────────
class AgentHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        qs = AgentMessage.objects.filter(user=request.user).order_by("created_at")
        return Response(AgentMessageSerializer(qs, many=True).data)

# employers/agent_views.py
from __future__ import annotations

import asyncio
import base64
import inspect
import json
import logging
import queue
import threading
from json import JSONDecodeError
from typing import Dict, Generator, List, Optional

from django.core.cache import cache
from django.http import StreamingHttpResponse
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User as AccountUser
from employers.serializers import EmployerSerializer
from pipeline_agents.employer_agent import build_employer_agent
from pipeline_agents.openai_client import client
from profiles.models import AgentMessage
from profiles.serializers import AgentMessageSerializer
from voice.views import _get_client

log = logging.getLogger(__name__)


# ───────────────────────── helpers ──────────────────────────────
def make_prompt(hist: List[AgentMessage], latest: str) -> str:
    """Concatenate conversation history into a single prompt string."""
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
    """Utility: call attr if it's a zero-arg callable, otherwise return attr."""
    if callable(attr):
        try:
            if len(inspect.signature(attr).parameters) == 0:
                return attr()
        except Exception:  # pragma: no cover
            pass
    return attr


def extract_tool_schema(tool) -> Dict:
    """Extract the OpenAI function schema from a FunctionTool (supports various SDK versions)."""
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
    if hasattr(tool, "params_json_schema"):
        return {
            "type": "function",
            "function": {
                "name": getattr(tool, "name", "unnamed_tool"),
                "description": getattr(tool, "description", "") or "",
                "parameters": tool.params_json_schema,
            },
        }
    if hasattr(tool, "model_dump"):
        return tool.model_dump()
    raise AttributeError("Unable to locate schema on FunctionTool")


async def _invoke_tool(tool, raw_args: Dict | str) -> str:
    """Invoke a tool's on_invoke_tool callback with proper argument signature handling."""
    fn = tool.on_invoke_tool
    sig = inspect.signature(fn)
    pos_params = [
        p
        for p in sig.parameters.values()
        if p.kind
        in (inspect.Parameter.POSITIONAL_ONLY, inspect.Parameter.POSITIONAL_OR_KEYWORD)
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
        return await fn(None, payload_str) if wants_ctx else await fn(payload_str)
    # If tool expects no input or different signature, just call it (no args)
    return await fn()


# ───────────────────────── Agent chat view ─────────────────────────
class EmployerAgentView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    LOCK_TIMEOUT = 60
    CONTENT_TYPE = "application/x-ndjson"

    def post(self, request, *args, **kwargs):
        latest = (request.data.get("message") or "").strip()
        if not latest:
            return Response({"detail": "Missing 'message' field"}, status=400)
        user = request.user
        # Only allow employer accounts to use this agent
        if hasattr(user, "role") and user.role != AccountUser.Role.EMPLOYER:
            return Response(
                {"detail": "This endpoint is for employer accounts only."},
                status=status.HTTP_403_FORBIDDEN,
            )
        lock_key = f"employer-agent-lock-{user.id}"
        if not cache.add(lock_key, True, self.LOCK_TIMEOUT):
            return Response(
                {"detail": "Agent is already generating a reply, please wait."},
                status=429,
            )
        # Save user message to history
        AgentMessage.objects.create(user=user, role="user", content=latest)
        # Build prompt from history and latest message
        history = list(AgentMessage.objects.filter(user=user).order_by("created_at"))
        prompt = make_prompt(history, latest)
        # Initialize employer agent (system prompt + tools)
        agent_meta = build_employer_agent(user_email=user.email)
        system_msg = {"role": "system", "content": agent_meta.instructions}
        user_msg = {"role": "user", "content": prompt}
        tool_schemas = [extract_tool_schema(t) for t in agent_meta.tools]
        tool_lookup = {t.name: t for t in agent_meta.tools}

        q: queue.Queue[str | dict] = queue.Queue()

        # ─────────── background worker (agent logic) ───────────
        def worker() -> None:
            async def _run() -> None:
                try:
                    msgs: List[Dict] = [system_msg, user_msg]
                    # First stage: call model with possible function tools (streaming)
                    stream1 = await client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=msgs,
                        tools=tool_schemas,
                        stream=True,
                    )
                    collected: List[str] = []
                    tool_call_frags: dict[int, dict] = {}
                    async for chunk in stream1:
                        delta = chunk.choices[0].delta
                        # If the model is attempting a function call, collect it
                        if getattr(delta, "tool_calls", None):
                            for part in delta.tool_calls:
                                idx = part.index
                                entry = tool_call_frags.setdefault(
                                    idx, {"id": part.id, "name": None, "arguments": ""}
                                )
                                if part.function.name:
                                    entry["name"] = part.function.name
                                if part.function.arguments:
                                    entry["arguments"] += part.function.arguments
                            continue
                        # Otherwise, collect any partial assistant content
                        if delta.content:
                            collected.append(delta.content)
                            q.put(delta.content)
                    if tool_call_frags:
                        # Model decided to use tools – prepare second stage
                        collected.clear()
                        tool_calls = [
                            frag
                            for _, frag in sorted(tool_call_frags.items())
                            if frag["name"]
                        ]
                        # Append the assistant message with the function call(s)
                        msgs.append(
                            {
                                "role": "assistant",
                                "tool_calls": [
                                    {
                                        "id": t["id"],
                                        "type": "function",
                                        "function": {
                                            "name": t["name"],
                                            "arguments": t["arguments"],
                                        },
                                    }
                                    for t in tool_calls
                                ],
                                "content": None,
                            }
                        )
                        # Execute each tool call and append the results as tool responses
                        for t in tool_calls:
                            fn_name = t["name"]
                            arg_json = t["arguments"] or "{}"
                            try:
                                kwargs = json.loads(arg_json)
                            except JSONDecodeError:
                                # If arguments aren't valid JSON, pass as raw string
                                kwargs = {"payload_json": arg_json.strip()}
                            result = await _invoke_tool(tool_lookup[fn_name], kwargs)
                            # If the tool was a navigation command, enqueue a navigate event for client
                            if fn_name == "navigate_to_v1" and isinstance(kwargs, dict):
                                path = kwargs.get("path", "/")
                                q.put(json.dumps({"navigate": path}))
                            msgs.append(
                                {
                                    "role": "tool",
                                    "tool_call_id": t["id"],
                                    "type": "function",
                                    "content": result,
                                }
                            )
                        # Second stage: call model again with tool results, to generate final answer
                        stream2 = await client.chat.completions.create(
                            model="gpt-4o",
                            messages=msgs,
                            stream=True,
                        )
                        async for chunk in stream2:
                            tok = chunk.choices[0].delta.content or ""
                            if tok:
                                collected.append(tok)
                                q.put(tok)
                    # After streaming is done, assemble final response
                    q.put(
                        {
                            "__done__": True,
                            "reply": "".join(collected),
                            "had_tool_calls": bool(tool_call_frags),
                        }
                    )
                except Exception as exc:
                    log.exception("Agent worker failed: %s", exc)
                    q.put({"__error__": str(exc)})
                finally:
                    cache.delete(lock_key)

            asyncio.run(_run())

        threading.Thread(target=worker, daemon=True).start()

        # ─────────── foreground: streaming HTTP response ───────────
        def event_stream() -> Generator[bytes, None, None]:
            while True:
                item = q.get()
                # Stream partial content
                if isinstance(item, str):
                    yield json.dumps({"delta": item, "done": False}).encode() + b"\n"
                    continue
                # Handle error: output error message and terminate
                if "__error__" in item:
                    yield json.dumps({"error": item["__error__"]}).encode() + b"\n"
                    break
                # Completed response
                reply: str = item["reply"]
                audio_b64: Optional[str] = None
                # Attempt to generate TTS audio for the reply
                try:
                    speech = _get_client().audio.speech.create(
                        model="tts-1",
                        voice="alloy",
                        input=reply,
                        response_format="mp3",
                    )
                    audio_b64 = base64.b64encode(speech.content).decode()
                except Exception:  # pragma: no cover
                    pass
                # Save assistant message to history
                AgentMessage.objects.create(user=user, role="assistant", content=reply)
                # Prepare final payload
                payload: Dict[str, object] = {"delta": "", "done": True}
                if item.get("had_tool_calls"):
                    # If any tool was used, include updated employer profile data for frontend
                    user.refresh_from_db()
                    if hasattr(user, "employer") and user.employer:
                        payload["employer"] = EmployerSerializer(user.employer).data
                if audio_b64:
                    payload["audio_base64"] = audio_b64
                yield json.dumps(payload).encode() + b"\n"
                break

        return StreamingHttpResponse(event_stream(), content_type=self.CONTENT_TYPE)


# ───────────────────────── chat history view ─────────────────────
class AgentHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        try:
            qs = AgentMessage.objects.filter(user=request.user).order_by("created_at")
            return Response(AgentMessageSerializer(qs, many=True).data)
        except Exception as exc:
            log.exception("History endpoint failed for %s: %s", request.user, exc)
            return Response(
                {"detail": "Unable to load chat history."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

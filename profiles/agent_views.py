# profiles/agent_views.py
from __future__ import annotations

import asyncio
import base64
import json
import queue
import threading
from typing import Generator, List, Optional

from agents import Runner
from django.core.cache import cache
from django.http import StreamingHttpResponse
from openai import AsyncOpenAI
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from pipeline_agents.profile_builder import build_profile_builder_agent
from voice.views import _get_client

from .models import AgentMessage
from .serializers import AgentMessageSerializer


# ───────────────────────── helpers ────────────────────────────
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


def chunk(text: str, n: int = 20) -> list[str]:
    """Split text into ≤ n-char pieces (at least one piece)."""
    return [text[i : i + n] for i in range(0, len(text), n)] or [""]


# ───────────────────────── main view ───────────────────────────
class ProfileBuilderAgentView(APIView):
    """
    POST /api/agent/profile-builder/
    Body   : { "message": "hi" }
    Stream : ND-JSON chunks (delta/done).
    """

    permission_classes = [permissions.IsAuthenticated]
    LOCK_TIMEOUT = 60
    CONTENT_TYPE = "application/x-ndjson"

    def post(self, request, *args, **kwargs):
        latest = request.data.get("message", "").strip()
        if not latest:
            return Response(
                {"detail": "Missing 'message' field"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        lock_key = f"profile-builder-lock-{user.id}"

        # one-at-a-time guard
        if not cache.add(lock_key, True, self.LOCK_TIMEOUT):
            return Response(
                {"detail": "Agent is already generating a reply, please wait."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # save user line
        AgentMessage.objects.create(user=user, role="user", content=latest)

        # prompt
        history = list(AgentMessage.objects.filter(user=user).order_by("created_at"))
        prompt = make_prompt(history, latest)

        agent = build_profile_builder_agent(AsyncOpenAI(), user_email=user.email)
        q: "queue.Queue[str | dict]" = queue.Queue()

        # ---------- background worker (runs coroutine) ----------
        def worker() -> None:
            try:

                async def _run() -> str:
                    res = await Runner.run(agent, input=prompt)
                    return res.final_output

                reply: str = asyncio.run(_run())  # await inside thread

                for part in chunk(reply, 20):
                    q.put(part)
                q.put({"__done__": True, "reply": reply})

            except Exception as exc:  # propagate to HTTP stream
                q.put({"__error__": str(exc)})
            finally:
                cache.delete(lock_key)  # always release

        threading.Thread(target=worker, daemon=True).start()

        # ---------- HTTP event-stream ----------
        def event_stream() -> Generator[bytes, None, None]:
            while True:
                item = q.get()
                if isinstance(item, str):  # delta token
                    yield json.dumps({"delta": item, "done": False}).encode() + b"\n"
                elif "__error__" in item:  # worker crashed
                    yield json.dumps({"error": item["__error__"]}).encode() + b"\n"
                    break
                else:  # done sentinel
                    reply: str = item["reply"]

                    # best-effort TTS
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

                    # persist assistant
                    AgentMessage.objects.create(
                        user=user, role="assistant", content=reply
                    )

                    payload: dict = {"delta": "", "done": True}
                    if audio_b64:
                        payload["audio_base64"] = audio_b64
                    if "profile_updated" in reply:
                        payload["profile_updated_at"] = (
                            user.profile.updated_at.isoformat()
                        )

                    yield json.dumps(payload).encode() + b"\n"
                    break

        return StreamingHttpResponse(event_stream(), content_type=self.CONTENT_TYPE)


# ───────────────────────── history endpoint ────────────────────
class AgentHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        qs = AgentMessage.objects.filter(user=request.user).order_by("created_at")
        return Response(AgentMessageSerializer(qs, many=True).data)

from __future__ import annotations

import asyncio
import base64
from typing import List, Optional

from agents import Runner
from django.core.cache import cache
from openai import AsyncOpenAI
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from pipeline_agents.profile_builder import build_profile_builder_agent
from voice.views import _get_client  # reuse voice TTS helper

from .models import AgentMessage
from .serializers import AgentMessageSerializer


# ────────────────────────────────────────────────────────────────
# helpers
# ────────────────────────────────────────────────────────────────
def build_prompt(history: List[AgentMessage], latest_msg: str) -> str:
    lines = [
        f"{'User' if m.role == AgentMessage.Role.USER else 'Assistant'}: {m.content}"
        for m in history
    ]
    lines.append(f"User: {latest_msg}")
    return "\n".join(lines)


# ────────────────────────────────────────────────────────────────
# main chat view
# ────────────────────────────────────────────────────────────────
class ProfileBuilderAgentView(APIView):
    """
    POST /api/agent/profile-builder/
    Body: { "message": "hello" }
    """

    permission_classes = [permissions.IsAuthenticated]

    LOCK_TIMEOUT = 60  # seconds a single generation may run
    REPLY_CACHE_SEC = 30  # seconds we reuse last reply for identical input

    def post(self, request, *args, **kwargs):
        latest = request.data.get("message", "").strip()
        if not latest:
            return Response(
                {"detail": "Missing 'message' field"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        lock_key = f"profile-builder-lock-{user.id}"
        reply_key = f"profile-builder-lastreply-{user.id}"

        # 1️⃣  Fast-path: if we *already* answered this exact input recently,
        #     return the cached response immediately — no lock, no DB write.
        cached = cache.get(reply_key)
        if cached and cached.get("in_msg") == latest:
            return Response(cached["body"])

        # 2️⃣  Acquire a lock so only ONE concurrent request runs the expensive
        #     generation + TTS for this user.
        got_lock = cache.add(lock_key, True, timeout=self.LOCK_TIMEOUT)
        if not got_lock:
            return Response(
                {"detail": "Agent is already generating a reply, please wait."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # 3️⃣  We are the primary request holder — make sure we release the lock.
        try:
            # Save USER message only once we’re sure we’re the single generator
            AgentMessage.objects.create(
                user=user, role=AgentMessage.Role.USER, content=latest
            )

            # Build prompt from full history
            history = list(
                AgentMessage.objects.filter(user=user).order_by("created_at")
            )
            prompt = build_prompt(history, latest_msg=latest)

            # Run agent (blocking for simplicity)
            agent = build_profile_builder_agent(AsyncOpenAI(), user_email=user.email)
            reply = asyncio.run(Runner.run(agent, input=prompt)).final_output

            # Text-to-speech (best-effort; OK to skip on failure)
            audio_base64: Optional[str] = None
            try:
                tts_client = _get_client()
                speech = tts_client.audio.speech.create(
                    model="tts-1",
                    voice="alloy",
                    input=reply,
                    response_format="mp3",
                )
                audio_base64 = base64.b64encode(speech.content).decode("ascii")
            except Exception:
                import logging

                logging.exception("TTS failed — continuing without audio")

            # Save ASSISTANT reply
            AgentMessage.objects.create(
                user=user, role=AgentMessage.Role.ASSISTANT, content=reply
            )

            body: dict = {"reply": reply}
            if audio_base64:
                body["audio_base64"] = audio_base64
            if "profile_updated" in reply:
                body["profile_updated_at"] = user.profile.updated_at.isoformat()

            # Cache the pair (input ➜ response) so any duplicates within the next
            # 30 s hit the fast-path at the top.
            cache.set(reply_key, {"in_msg": latest, "body": body}, self.REPLY_CACHE_SEC)

        finally:
            cache.delete(lock_key)

        return Response(body)


# ────────────────────────────────────────────────────────────────
# history endpoint
# ────────────────────────────────────────────────────────────────
class AgentHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        qs = AgentMessage.objects.filter(user=request.user).order_by("created_at")
        return Response(AgentMessageSerializer(qs, many=True).data)

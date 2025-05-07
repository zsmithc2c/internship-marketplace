from __future__ import annotations

import asyncio
from typing import Any, Dict

from agents import Runner
from openai import AsyncOpenAI
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from pipeline_agents.profile_builder import build_profile_builder_agent
from profiles.models import Profile


class ProfileBuilderAgentView(APIView):
    """
    POST /api/agent/profile-builder/
    Body:  { "message": "..." }
    Reply: { "reply": "...", "profile_updated_at": "2025-05-07T14:23:18.123Z" }
           (the extra key is present whenever the caller has a profile)
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        text = (request.data.get("message") or "").strip()
        if not text:
            return Response(
                {"detail": "Missing 'message' field"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        client = AsyncOpenAI()
        agent = build_profile_builder_agent(client, user_email=user.email)

        # ── run the agent ───────────────────────────────────────────────────
        result = asyncio.run(Runner.run(agent, input=text))
        reply_text = result.final_output

        # ── build response payload ─────────────────────────────────────────
        payload: Dict[str, Any] = {"reply": reply_text}

        # attach latest profile timestamp (if profile exists)
        profile = Profile.objects.filter(user=user).first()
        if profile:
            payload["profile_updated_at"] = profile.updated_at.isoformat()

        return Response(payload)

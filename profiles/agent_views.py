from __future__ import annotations

import asyncio

from agents import Runner
from openai import AsyncOpenAI
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from pipeline_agents.profile_builder import build_profile_builder_agent


class ProfileBuilderAgentView(APIView):
    """
    POST /api/agent/profile-builder/
    Body: { "message": "..." }
    Returns: { "reply": "..." }
    """

    # ⬇️  must be logged-in (JWT in Authorization header)
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        text = request.data.get("message", "").strip()
        if not text:
            return Response(
                {"detail": "Missing 'message' field"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # user is guaranteed because of IsAuthenticated
        user_email = request.user.email

        client = AsyncOpenAI()
        agent = build_profile_builder_agent(client, user_email=user_email)

        # ── run the agent in a fresh event-loop ────────────────────────────
        result = asyncio.run(Runner.run(agent, input=text))
        reply_text = result.final_output

        return Response({"reply": reply_text})

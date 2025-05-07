# profiles/agent_views.py
from __future__ import annotations

import asyncio

from agents import Runner
from openai import AsyncOpenAI
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from pipeline_agents.profile_builder import build_profile_builder_agent

from .models import AgentMessage


def build_prompt(user_email: str, latest_user_msg: str) -> str:
    """
    Pull prior transcript for the user and append the latest turn.

    Format:
        User: …
        Assistant: …
        User: <latest_user_msg>
    """
    lines: list[str] = []
    for m in AgentMessage.objects.filter(user__email=user_email).order_by("created_at"):
        speaker = "User" if m.role == AgentMessage.Role.USER else "Assistant"
        lines.append(f"{speaker}: {m.content}")
    lines.append(f"User: {latest_user_msg}")
    return "\n".join(lines)


class ProfileBuilderAgentView(APIView):
    """
    POST /api/agent/profile-builder/
    Body: { "message": "Hi there!" }

    Returns: { "reply": "…", "profile_updated_at": "2025-05-07T15:02:00Z" | null }
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        latest = request.data.get("message", "").strip()
        if not latest:
            return Response(
                {"detail": "Missing 'message' field"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        user_email = user.email

        # ---- persist the USER message immediately -------------------------
        AgentMessage.objects.create(
            user=user,
            role=AgentMessage.Role.USER,
            content=latest,
        )

        # ---- build prompt --------------------------------------------------
        prompt = build_prompt(user_email, latest_user_msg=latest)

        # ---- run agent -----------------------------------------------------
        client = AsyncOpenAI()
        agent = build_profile_builder_agent(client, user_email=user_email)
        result = asyncio.run(Runner.run(agent, input=prompt))
        reply = result.final_output

        # ---- persist ASSISTANT reply --------------------------------------
        AgentMessage.objects.create(
            user=user,
            role=AgentMessage.Role.ASSISTANT,
            content=reply,
        )

        # ---- response ------------------------------------------------------
        body: dict = {"reply": reply}
        if "profile_updated" in reply:
            body["profile_updated_at"] = user.profile.updated_at.isoformat()

        return Response(body)

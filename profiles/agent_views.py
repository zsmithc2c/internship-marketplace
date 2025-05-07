# profiles/agent_views.py
from __future__ import annotations

import asyncio
from typing import List

from agents import Runner
from openai import AsyncOpenAI
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from pipeline_agents.profile_builder import build_profile_builder_agent

from .models import AgentMessage
from .serializers import AgentMessageSerializer


# ────────────────────────────────────────────────────────────────
# helper: build a prompt string from DB history + latest message
# ────────────────────────────────────────────────────────────────
def build_prompt(history: List[AgentMessage], latest_msg: str) -> str:
    lines: list[str] = [
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
    Body: { "message": "Hi there!" }

    Returns: { "reply": "…", "profile_updated_at": "…" | null }
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

        # ------- save USER message ----------------------------------------
        AgentMessage.objects.create(
            user=user, role=AgentMessage.Role.USER, content=latest
        )

        # ------- build prompt ---------------------------------------------
        history = list(AgentMessage.objects.filter(user=user).order_by("created_at"))
        prompt = build_prompt(history, latest_msg=latest)

        # ------- run agent -------------------------------------------------
        client = AsyncOpenAI()
        agent = build_profile_builder_agent(client, user_email=user.email)
        result = asyncio.run(Runner.run(agent, input=prompt))
        reply = result.final_output

        # ------- save ASSISTANT reply -------------------------------------
        AgentMessage.objects.create(
            user=user, role=AgentMessage.Role.ASSISTANT, content=reply
        )

        # ------- response --------------------------------------------------
        body: dict = {"reply": reply}
        if "profile_updated" in reply:
            body["profile_updated_at"] = user.profile.updated_at.isoformat()

        return Response(body)


# ────────────────────────────────────────────────────────────────
# history endpoint (read-only)
# ────────────────────────────────────────────────────────────────
class AgentHistoryView(APIView):
    """
    GET /api/agent/profile-builder/history/

    Returns: [
      { "role": "assistant", "content": "…", "created_at": "…" },
      …
    ]
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        qs = AgentMessage.objects.filter(user=request.user).order_by("created_at")
        data = AgentMessageSerializer(qs, many=True).data
        return Response(data)

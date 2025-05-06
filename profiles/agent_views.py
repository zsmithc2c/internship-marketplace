from __future__ import annotations

from openai import OpenAI
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

    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        text = request.data.get("message", "").strip()
        if not text:
            return Response(
                {"detail": "Missing 'message' field"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        client = OpenAI()  # uses OPENAI_API_KEY
        agent = build_profile_builder_agent(
            client,
            user_email=request.user.email,
        )

        reply_chunk = agent.run({"role": "user", "content": text})
        reply_text = reply_chunk["content"]

        return Response({"reply": reply_text})

from __future__ import annotations

import base64
import io
from typing import Any

from django.conf import settings
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

try:
    # OpenAI Python SDK v1.x
    from openai import OpenAI
except ImportError:  # pragma: no cover
    OpenAI = None  # type: ignore


def _get_client() -> Any:  # returns OpenAI.Client
    """
    Lazy-init OpenAI client.
    Expects OPENAI_API_KEY in env or Django settings.
    """
    if OpenAI is None:
        raise RuntimeError("openai package not installed")
    return OpenAI(api_key=getattr(settings, "OPENAI_API_KEY", None))


class SpeechToTextView(APIView):
    """
    POST /api/voice/stt/
    Body:
      • multipart/form-data with field 'audio'  (preferred)
      • OR JSON { "audio_base64": "..." }
    Returns: { "text": "..." }
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        client = _get_client()

        # ---- get audio bytes ----
        if "audio" in request.FILES:
            audio_bytes = request.FILES["audio"].read()
        else:
            audio_b64 = request.data.get("audio_base64")
            if not audio_b64:
                return Response(
                    {"detail": "Provide 'audio' file or 'audio_base64'"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            audio_bytes = base64.b64decode(audio_b64)

        # ---- OpenAI transcription ----
        # Uses 'whisper-1' by default; adjust model as needed.
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=io.BytesIO(audio_bytes),
            # language could be auto or explicit
        )

        return Response({"text": transcript.text})


class TextToSpeechView(APIView):
    """
    POST /api/voice/tts/
    JSON body: { "text": "...", "voice": "alloy" }
    Returns: { "audio_base64": "..." }
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        client = _get_client()

        text = request.data.get("text")
        if not text:
            return Response(
                {"detail": "Missing 'text' field"}, status=status.HTTP_400_BAD_REQUEST
            )

        voice = request.data.get("voice", "alloy")

        speech = client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=text,
            format="mp3",
        )
        audio_b64 = base64.b64encode(speech.read()).decode("ascii")

        return Response({"audio_base64": audio_b64})

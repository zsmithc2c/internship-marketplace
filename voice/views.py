# voice/views.py
from __future__ import annotations

import base64
import io
from typing import TYPE_CHECKING, Any, Optional

from django.conf import settings
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

# ------------------------------------------------------------------
# Static-type–friendly alias for the OpenAI client
# ------------------------------------------------------------------
if TYPE_CHECKING:  # only active for mypy / pylance
    from openai import OpenAI as _OpenAIType
else:  # at runtime we don’t import OpenAI yet
    _OpenAIType = Any  # noqa: N816  (capitalised alias)

# ------------------------------------------------------------------
# Singleton OpenAI client (lazily initialised, re-uses HTTP pool)
# ------------------------------------------------------------------
_CLIENT: Optional["_OpenAIType"] = None


def _get_client() -> _OpenAIType:  # returns a fully-typed OpenAI client
    global _CLIENT

    if _CLIENT is None:
        from openai import OpenAI  # local import avoids cost if never used

        _CLIENT = OpenAI(api_key=getattr(settings, "OPENAI_API_KEY", None))

    return _CLIENT


# ------------------------------------------------------------------
# Speech-to-Text
# ------------------------------------------------------------------
class SpeechToTextView(APIView):
    """
    POST /api/voice/stt/
    Body   : multipart/form-data “audio”  OR  JSON { "audio_base64": "…" }
    Return : { "text": "…" }
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        client = _get_client()

        # ── load audio bytes ───────────────────────────────────────────
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

        # add filename so OpenAI recognises .webm
        bio = io.BytesIO(audio_bytes)
        bio.name = "speech.webm"

        # ── Whisper transcription ─────────────────────────────────────
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=bio,
        )
        return Response({"text": transcript.text})


# ------------------------------------------------------------------
# Text-to-Speech
# ------------------------------------------------------------------
class TextToSpeechView(APIView):
    """
    POST /api/voice/tts/
    JSON   : { "text": "...", "voice": "alloy" }
    Return : { "audio_base64": "..." }
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        client = _get_client()

        text = request.data.get("text")
        if not text:
            return Response(
                {"detail": "Missing 'text' field"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        voice = request.data.get("voice", "alloy")

        audio_bytes = client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=text,
            response_format="mp3",
        )
        audio_b64 = base64.b64encode(audio_bytes).decode("ascii")
        return Response({"audio_base64": audio_b64})

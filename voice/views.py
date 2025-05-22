# voice/views.py
from __future__ import annotations

import base64
import io
import logging
import mimetypes
import subprocess
import tempfile
from typing import TYPE_CHECKING, Any, Optional

from django.conf import settings
from rest_framework import parsers, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# Static-type-friendly alias for the OpenAI client
# ------------------------------------------------------------------
if TYPE_CHECKING:
    from openai import OpenAI as _OpenAIType
else:
    _OpenAIType = Any  # noqa: N816

# ------------------------------------------------------------------
# Singleton OpenAI client
# ------------------------------------------------------------------
_CLIENT: Optional["_OpenAIType"] = None


def _get_client() -> _OpenAIType:
    global _CLIENT
    if _CLIENT is None:
        from openai import OpenAI

        _CLIENT = OpenAI(api_key=getattr(settings, "OPENAI_API_KEY", None))
    return _CLIENT


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------
ALLOWED_MIME = {
    # mainstream browser containers
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    # generic / fallback values
    "application/octet-stream",
    "audio/x-caf",
    "audio/3gpp",
}

MAX_BYTES = 4_000_000  # 4 MB  (≈ 30 s WebM @ 48 kHz opus)


def _transcode_to_wav(src: bytes, suffix: str | None) -> Optional[bytes]:
    """Convert exotic media into WAV with ffmpeg. Return None if ffmpeg fails."""
    try:
        with tempfile.NamedTemporaryFile(
            suffix=suffix or ".bin"
        ) as inp, tempfile.NamedTemporaryFile(suffix=".wav") as out:
            inp.write(src)
            inp.flush()
            subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error", "-i", inp.name, out.name],
                check=True,
            )
            return out.read()
    except (subprocess.SubprocessError, FileNotFoundError):
        logger.warning("ffmpeg transcode failed for %s", suffix)
        return None


# ────────────────────────────────────────────────────────────────
# Speech-to-Text
# ────────────────────────────────────────────────────────────────
class SpeechToTextView(APIView):
    """
    POST /api/voice/stt/
    Body   : multipart/form-data {audio}
             —OR— raw base-64 in body / JSON {"audio_base64": "..."}
    Return : {"text": "..."}
    """

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [
        parsers.MultiPartParser,
        parsers.FormParser,
        parsers.JSONParser,
        parsers.FileUploadParser,
    ]

    # ------------------------------------------------------------------
    def post(self, request, *args, **kwargs):  # noqa: D401
        client = _get_client()

        # 1 ► Extract audio bytes & MIME type --------------------------
        audio_bytes: bytes | None = None
        content_type: str | None = None
        filename: str | None = None

        if "audio" in request.FILES:  # ← multipart/form‐data
            f = request.FILES["audio"]
            audio_bytes = f.read()
            content_type = f.content_type
            filename = getattr(f, "name", None)

        elif request.data.get("audio_base64"):  # ← JSON base-64
            try:
                audio_bytes = base64.b64decode(request.data["audio_base64"])
            except (TypeError, ValueError):
                return Response(
                    {"detail": "Invalid base-64 payload"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            content_type = request.content_type or "application/octet-stream"

        elif "file" in request.data:  # ← FileUploadParser raw binary
            f = request.data["file"]
            audio_bytes = f.read() if hasattr(f, "read") else bytes(f)
            content_type = getattr(f, "content_type", "application/octet-stream")
            filename = getattr(f, "name", None)

        else:
            return Response(
                {"detail": "Provide audio via form-data or base-64"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 2 ► Sanity checks -------------------------------------------
        if not audio_bytes:
            return Response(
                {"detail": "Empty audio"}, status=status.HTTP_400_BAD_REQUEST
            )
        if len(audio_bytes) > MAX_BYTES:
            return Response(
                {"detail": "Recording too large (> 4 MB)"},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        # 3 ► Ensure format Whisper can parse -------------------------
        if content_type not in ALLOWED_MIME:
            wav = _transcode_to_wav(
                audio_bytes, mimetypes.guess_extension(content_type)
            )
            if wav is None:
                return Response(
                    {"detail": f"Unsupported media type {content_type}"},
                    status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                )
            audio_bytes, content_type = wav, "audio/wav"

        # 4 ► Name buffer so Whisper infers codec ---------------------
        if not filename:
            ext = mimetypes.guess_extension(content_type) or ".webm"
            filename = f"speech{ext}"
        bio = io.BytesIO(audio_bytes)
        bio.name = filename

        # 5 ► Call Whisper -------------------------------------------
        try:
            tx = client.audio.transcriptions.create(model="whisper-1", file=bio)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Whisper transcription failed")
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"text": tx.text})


# ────────────────────────────────────────────────────────────────
# Text-to-Speech
# ────────────────────────────────────────────────────────────────
class TextToSpeechView(APIView):
    """
    POST /api/voice/tts/
    JSON   : {"text": "...", "voice": "alloy"}
    Return : {"audio_base64": "..."}
    """

    permission_classes = [permissions.IsAuthenticated]

    # ------------------------------------------------------------------
    def post(self, request, *args, **kwargs):  # noqa: D401
        client = _get_client()

        text: str | None = request.data.get("text")
        if not text:
            return Response(
                {"detail": "Missing 'text' field"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        voice = request.data.get("voice", "alloy")

        try:
            speech = client.audio.speech.create(
                model="gpt-4o-mini-tts",
                voice=voice,
                input=text,
                response_format="mp3",
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("TTS generation failed")
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        audio_b64 = base64.b64encode(speech.content).decode()
        return Response({"audio_base64": audio_b64})

# voice/urls.py
from django.urls import path

from .views import SpeechToTextView, TextToSpeechView

app_name = "voice"

urlpatterns = [
    # Speech-to-Text  →  POST /api/voice/stt/
    path("voice/stt/", SpeechToTextView.as_view(), name="voice-stt"),
    # Text-to-Speech  →  POST /api/voice/tts/
    path("voice/tts/", TextToSpeechView.as_view(), name="voice-tts"),
]

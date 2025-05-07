# backend/urls.py
"""
URL configuration for backend project.

Routes exposed:
• Admin
• Auth (accounts)
• Profiles & Agent
• Voice (STT / TTS)     ← NEW
• OpenAPI schema & docs
"""

from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    # ---------- Django admin ----------
    path("admin/", admin.site.urls),
    # ---------- Auth / accounts ----------
    path("api/", include("accounts.urls")),
    # ---------- Profiles & Agent ----------
    path("api/", include("profiles.urls")),
    # ---------- Voice (STT / TTS) ----------
    #     /api/voice/stt/
    #     /api/voice/tts/
    path("api/", include("voice.urls")),  # ← critical line
    # ---------- API schema & docs ----------
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]

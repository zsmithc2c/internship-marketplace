# backend/urls.py
"""
URL configuration for backend project.

Routes exposed:
• Admin
• Auth (accounts)
• Profiles & Agent
• Employers (company profile)
• Internships (listings)
• Voice (STT / TTS)
• OpenAPI schema & docs
"""

from django.conf import settings
from django.conf.urls.static import static
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
    # ---------- Employers ----------
    path("api/", include("employers.urls")),
    # ---------- Internships ----------
    path("api/", include("internships.urls")),
    # ---------- Voice (STT / TTS) ----------
    path("api/", include("voice.urls")),
    # ---------- API schema & docs ----------
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# backend/urls.py
"""
URL configuration for Internship-Marketplace backend.

Routes exposed:
• /                   – simple “health-check” landing
• /admin/             – Django admin
• /api/…              – accounts, profiles, employers, internships, voice
• /api/schema/        – OpenAPI JSON
• /api/docs/          – Swagger UI
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import HttpResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


# ───────────────────────────────────────────────────────────────
# Landing page so “/” doesn’t 404 in dev / tunnels
# ───────────────────────────────────────────────────────────────
def home(request):
    return HttpResponse(
        "✅ Internship-Marketplace API is running.<br>"
        'Browse docs at <a href="/api/docs/">/api/docs/</a> .'
    )


urlpatterns = [
    # ---------- Root ----------
    path("", home, name="home"),
    # ---------- Django admin ----------
    path("admin/", admin.site.urls),
    # ---------- App APIs ----------
    path("api/", include("accounts.urls")),
    path("api/", include("profiles.urls")),
    path("api/", include("employers.urls")),
    path("api/", include("internships.urls")),
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

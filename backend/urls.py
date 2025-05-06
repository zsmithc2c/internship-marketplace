"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
"""

from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    # ---------- Django admin ----------
    path("admin/", admin.site.urls),
    # ---------- Auth / accounts ----------
    path("api/", include("accounts.urls")),
    # ---------- Profiles (new) ----------
    #     /api/profile/me/
    #     /api/skills/
    path("api/", include("profiles.urls")),
    # ---------- API schema & docs ----------
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]

"""
AppConfig for the internships app.

⚠️  Do NOT import models at module import time; that triggers
    AppRegistryNotReady while Django is still loading apps.
"""

from django.apps import AppConfig


class InternshipsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "internships"

    # If you ever need to connect signals, do it here:
    # def ready(self):
    #     from . import signals  # noqa: F401

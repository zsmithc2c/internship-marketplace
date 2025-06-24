from django.conf import settings
from django.db import models


class Employer(models.Model):
    """Employer profile (one-to-one with accounts.User)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="employer",
    )

    # — required —
    company_name = models.CharField(max_length=150)

    # — optional fields —
    logo = models.ImageField(upload_to="logos/", blank=True, null=True)
    mission = models.TextField(blank=True, null=True)
    location = models.CharField(max_length=100, blank=True, null=True)
    website = models.URLField(blank=True, null=True)

    # —───────── NEW METRIC FIELD ──────────
    hires_made = models.PositiveIntegerField(default=0)
    # ───────────────────────────────────────

    def __str__(self) -> str:
        return self.company_name or f"Employer profile for {self.user.email}"

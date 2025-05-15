from django.conf import settings
from django.db import models


class Employer(models.Model):
    """Employer profile (one-to-one with accounts.User)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="employer"
    )
    company_name = models.CharField(max_length=150, blank=True)
    logo = models.ImageField(upload_to="logos/", blank=True)
    mission = models.TextField(blank=True)
    location = models.CharField(max_length=100, blank=True)
    website = models.URLField(blank=True)

    def __str__(self) -> str:
        # Show company name if set, otherwise use user email as identifier
        if self.company_name:
            return self.company_name
        return f"Employer profile for {self.user.email}"

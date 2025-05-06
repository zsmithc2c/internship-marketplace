# profiles/models.py
from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Skill(models.Model):
    """Canonical skill entry (e.g. 'Python', 'Figma')."""

    name = models.CharField(max_length=128, unique=True)

    class Meta:
        ordering = ("name",)

    def __str__(self) -> str:  # pragma: no cover
        return self.name


class Profile(models.Model):
    """Intern profile (one-to-one with accounts.User)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )

    # 1 – Basics
    headline = models.CharField(max_length=120)
    bio = models.TextField()

    # 2 – Location
    city = models.CharField(max_length=80)
    state = models.CharField(max_length=80, blank=True)
    country = models.CharField(max_length=80, default="USA")

    # 4 – Skills
    skills = models.ManyToManyField(Skill, related_name="profiles", blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("user__email",)

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.user.email} profile"


class Availability(models.Model):
    class Status(models.TextChoices):
        IMMEDIATELY = "IMMEDIATELY", _("Immediately")
        FROM_DATE = "FROM_DATE", _("From date")
        UNAVAILABLE = "UNAVAILABLE", _("Unavailable")

    profile = models.OneToOneField(
        Profile, on_delete=models.CASCADE, related_name="availability"
    )

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.IMMEDIATELY
    )
    earliest_start = models.DateField(null=True, blank=True)
    hours_per_week = models.PositiveSmallIntegerField(null=True, blank=True)
    remote_ok = models.BooleanField(default=True)
    onsite_ok = models.BooleanField(default=False)

    def __str__(self) -> str:  # pragma: no cover
        return f"Availability for {self.profile.user.email}"


class Education(models.Model):
    profile = models.ForeignKey(
        Profile, on_delete=models.CASCADE, related_name="educations"
    )
    institution = models.CharField(max_length=120)
    degree = models.CharField(max_length=120, blank=True)
    field_of_study = models.CharField(max_length=120, blank=True)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    gpa = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ("-start_date",)

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.institution} – {self.degree or 'Course'}"

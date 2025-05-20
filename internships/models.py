from django.conf import settings
from django.db import models


class Internship(models.Model):
    employer = models.ForeignKey(
        "employers.Employer",  # string reference avoids circular import
        on_delete=models.CASCADE,
        related_name="internships",
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    location = models.CharField(max_length=100, blank=True)
    is_remote = models.BooleanField(default=False)
    requirements = models.TextField(blank=True)
    posted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-posted_at",)

    def __str__(self) -> str:  # pragma: no cover
        return (
            f"{self.title} at {self.employer.company_name or self.employer.user.email}"
        )


class Application(models.Model):
    """Represents an intern’s application to an internship listing."""

    internship = models.ForeignKey(
        Internship,
        on_delete=models.CASCADE,
        related_name="applications",
    )
    intern = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="applications",
    )

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = (("internship", "intern"),)
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"Application of {self.intern.email} to {self.internship.title}"

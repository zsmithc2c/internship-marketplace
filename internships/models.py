"""
Internship model – represents a single internship listing posted by an employer.
"""

from django.db import models


class Internship(models.Model):
    employer = models.ForeignKey(
        "employers.Employer",  # string ref avoids early import
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

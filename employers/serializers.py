from rest_framework import serializers

from internships.models import Application

from .models import Employer


class EmployerSerializer(serializers.ModelSerializer):
    """Expose employer profile details plus hires_made metric."""

    hires_made = serializers.IntegerField(read_only=True)

    class Meta:
        model = Employer
        fields = (
            "id",
            "company_name",
            "logo",
            "mission",
            "location",
            "website",
            "hires_made",
        )
        read_only_fields = ("id", "hires_made")
        extra_kwargs = {
            # ── make everything but company_name optional ──
            "logo": {"required": False, "allow_null": True},
            "mission": {"required": False, "allow_null": True},
            "location": {"required": False, "allow_null": True},
            "website": {"required": False, "allow_null": True},
        }


class ApplicationSerializer(serializers.ModelSerializer):
    """Full application details visible to the employer."""

    intern_email = serializers.ReadOnlyField(source="intern.email")
    internship_id = serializers.ReadOnlyField(source="internship.id")  # NEW
    resume_url = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = (
            "id",
            "intern_email",
            "internship_id",  # ← include in response
            "status",
            "created_at",
            "cover_letter",
            "resume_url",
            "references",
        )
        read_only_fields = (
            "id",
            "intern_email",
            "internship_id",
            "created_at",
            "cover_letter",
            "resume_url",
            "references",
        )

    # ────────────────────────────────────────────────
    # Helpers
    # ────────────────────────────────────────────────

    def get_resume_url(self, obj):
        """Return absolute URL for the uploaded résumé (if any)."""
        if not obj.resume:
            return None
        request = self.context.get("request")
        url = obj.resume.url
        return request.build_absolute_uri(url) if request else url

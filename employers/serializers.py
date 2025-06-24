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
    """Application details for employer review."""

    intern_email = serializers.ReadOnlyField(source="intern.email")
    resume_url = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = (
            "id",
            "intern_email",
            "status",
            "created_at",
            "cover_letter",
            "references",
            "resume_url",
        )
        read_only_fields = (
            "id",
            "intern_email",
            "created_at",
            "cover_letter",
            "references",
            "resume_url",
        )

    # ────────────────────────────────────────────────
    # Helper
    # ────────────────────────────────────────────────

    def get_resume_url(self, obj):
        """Return absolute URL for the uploaded resume file (if any)."""
        if not obj.resume:
            return None
        request = self.context.get("request")
        url = obj.resume.url
        return request.build_absolute_uri(url) if request else url

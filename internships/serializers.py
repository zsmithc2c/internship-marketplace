from rest_framework import serializers

from .models import Application, Internship


class InternshipSerializer(serializers.ModelSerializer):
    # ──────────── Read-only helper fields ────────────
    employer_name = serializers.ReadOnlyField(source="employer.company_name")
    employer_logo_url = serializers.SerializerMethodField()
    applications_count = serializers.SerializerMethodField()
    has_applied = serializers.SerializerMethodField()  # only for interns

    class Meta:
        model = Internship
        fields = (
            # primary
            "id",
            "title",
            "description",
            "location",
            "is_remote",
            "requirements",
            # application-settings
            "requires_cover_letter",
            "requires_resume",
            "requires_references",
            "external_application_url",
            "is_open",
            # metadata / helpers
            "posted_at",
            "updated_at",
            "employer_name",
            "employer_logo_url",
            "applications_count",
            "has_applied",
        )
        read_only_fields = (
            "id",
            "posted_at",
            "updated_at",
            "employer_name",
            "employer_logo_url",
            "applications_count",
            "has_applied",
        )

    # ────────────────────────────────────────────────
    # Helper methods
    # ────────────────────────────────────────────────

    def get_employer_logo_url(self, obj):
        """Return absolute URL for employer logo (if any)."""
        request = self.context.get("request")
        if obj.employer.logo:
            url = obj.employer.logo.url
            return request.build_absolute_uri(url) if request else url
        return None

    def get_applications_count(self, obj):
        """Count of submitted applications for this internship."""
        return obj.applications.count()

    def get_has_applied(self, obj):
        """Return True if the requesting intern has already applied."""
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            return False
        # Only applies to intern users
        if getattr(request.user, "role", None) != "INTERN":
            return False
        return Application.objects.filter(internship=obj, intern=request.user).exists()

    # ────────────────────────────────────────────────
    # Validation
    # ────────────────────────────────────────────────

    def validate(self, attrs):
        """Cross-field validation for location, remote, and application settings."""
        is_remote = attrs.get("is_remote", getattr(self.instance, "is_remote", False))
        location = attrs.get("location", getattr(self.instance, "location", ""))

        # Ensure location is provided when listing is not marked remote
        if not is_remote and not location:
            raise serializers.ValidationError(
                {"location": "Location is required for non-remote internships."}
            )

        # If an external URL is provided, internal application requirements must be off.
        external_url = attrs.get(
            "external_application_url",
            getattr(self.instance, "external_application_url", None),
        )
        if external_url:
            # Flip all requirement flags to False to avoid mixed modes.
            attrs["requires_cover_letter"] = False
            attrs["requires_resume"] = False
            attrs["requires_references"] = False

        return attrs

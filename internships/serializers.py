from rest_framework import serializers

from .models import Internship


class InternshipSerializer(serializers.ModelSerializer):
    employer_name = serializers.ReadOnlyField(source="employer.company_name")
    employer_logo = serializers.SerializerMethodField()
    applications_count = serializers.SerializerMethodField()  # New field

    class Meta:
        model = Internship
        fields = (
            "id",
            "title",
            "description",
            "location",
            "is_remote",
            "requirements",
            "posted_at",
            "updated_at",
            "employer_name",
            "employer_logo",
            "applications_count",
        )
        read_only_fields = (
            "id",
            "posted_at",
            "updated_at",
            "employer_name",
            "employer_logo",
            "applications_count",
        )

    def get_employer_logo(self, obj):
        # Return full URL for logo if present
        request = self.context.get("request")
        if obj.employer.logo:
            url = obj.employer.logo.url
            return request.build_absolute_uri(url) if request is not None else url
        return None

    def get_applications_count(self, obj):
        # Count related applications for this internship
        return obj.applications.count()

    def validate(self, attrs):
        """Require a location for non-remote listings, including partial updates."""
        is_remote = attrs.get("is_remote")
        location = attrs.get("location")

        if self.instance is not None:
            # For PATCH requests fall back to existing values when fields are omitted
            if is_remote is None:
                is_remote = self.instance.is_remote
            if location is None:
                location = self.instance.location

        if not is_remote and not location:
            raise serializers.ValidationError(
                {"location": "Location is required for non-remote internships."}
            )

        return attrs

from rest_framework import serializers

from .models import Internship


class InternshipSerializer(serializers.ModelSerializer):
    employer_name = serializers.ReadOnlyField(source="employer.company_name")
    employer_logo = serializers.SerializerMethodField()

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
        )
        read_only_fields = (
            "id",
            "posted_at",
            "updated_at",
            "employer_name",
            "employer_logo",
        )

    def get_employer_logo(self, obj):
        # Return full URL for logo if present, else None
        request = self.context.get("request")
        if obj.employer.logo:
            url = obj.employer.logo.url
            if request is not None:
                return request.build_absolute_uri(url)
            return url
        return None

    def validate(self, attrs):
        # Require location if not remote
        if not attrs.get("is_remote") and not attrs.get("location"):
            raise serializers.ValidationError(
                {"location": "Location is required for non-remote internships."}
            )
        return attrs

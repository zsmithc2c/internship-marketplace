from rest_framework import serializers

from internships.models import Application

from .models import Employer


class EmployerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employer
        fields = ("id", "company_name", "logo", "mission", "location", "website")
        read_only_fields = ("id",)


class ApplicationSerializer(serializers.ModelSerializer):
    intern_email = serializers.ReadOnlyField(source="intern.email")

    class Meta:
        model = Application
        fields = ("id", "intern_email", "status", "created_at")
        read_only_fields = ("id", "intern_email", "created_at")

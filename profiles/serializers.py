# profiles/serializers.py
from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import AgentMessage, Availability, Education, Profile, Skill

User = get_user_model()


# ────────────────────────────────────────────────────────────────
# Leaf serializers
# ────────────────────────────────────────────────────────────────
class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ("id", "name")
        read_only_fields = ("id",)


class AvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Availability
        fields = (
            "status",
            "earliest_start",
            "hours_per_week",
            "remote_ok",
            "onsite_ok",
        )


class EducationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Education
        fields = (
            "id",
            "institution",
            "degree",
            "field_of_study",
            "start_date",
            "end_date",
            "gpa",
            "description",
        )
        read_only_fields = ("id",)


# NEW ─ chat message serializer
class AgentMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentMessage
        fields = ("role", "content", "created_at")


# ────────────────────────────────────────────────────────────────
# Main profile serializer
# ────────────────────────────────────────────────────────────────
class ProfileSerializer(serializers.ModelSerializer):
    availability = AvailabilitySerializer()
    skills = SkillSerializer(many=True)
    educations = EducationSerializer(many=True)

    class Meta:
        model = Profile
        fields = (
            "id",
            "user",
            # basics
            "headline",
            "bio",
            # location
            "city",
            "state",
            "country",
            # nested
            "availability",
            "skills",
            "educations",
            "updated_at",
        )
        read_only_fields = ("id", "user", "updated_at")

    # -------- create / update helpers --------
    def _upsert_availability(self, profile: Profile, data: dict):
        Availability.objects.update_or_create(profile=profile, defaults=data)

    def _set_skills(self, profile: Profile, skills_data: list[dict]):
        names = [s["name"].strip() for s in skills_data]
        skill_objs = [
            Skill.objects.get_or_create(name=name)[0] for name in names if name
        ]
        profile.skills.set(skill_objs)

    def _sync_educations(self, profile: Profile, edu_data: list[dict]):
        # wipe & recreate (simplest for now)
        profile.educations.all().delete()
        for edu in edu_data:
            Education.objects.create(profile=profile, **edu)

    # -------- create --------
    def create(self, validated: dict):
        availability_data = validated.pop("availability")
        skills_data = validated.pop("skills", [])
        educations_data = validated.pop("educations", [])

        profile = Profile.objects.create(**validated)
        self._upsert_availability(profile, availability_data)
        self._set_skills(profile, skills_data)
        self._sync_educations(profile, educations_data)
        return profile

    # -------- update --------
    def update(self, instance: Profile, validated: dict):
        availability_data = validated.pop("availability", None)
        skills_data = validated.pop("skills", None)
        educations_data = validated.pop("educations", None)

        # scalar fields
        for attr, value in validated.items():
            setattr(instance, attr, value)
        instance.save()

        if availability_data:
            self._upsert_availability(instance, availability_data)
        if skills_data is not None:
            self._set_skills(instance, skills_data)
        if educations_data is not None:
            self._sync_educations(instance, educations_data)

        return instance

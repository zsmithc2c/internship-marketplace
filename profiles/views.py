# profiles/views.py
from __future__ import annotations

from rest_framework import generics, permissions

from .models import Profile, Skill
from .serializers import ProfileSerializer, SkillSerializer


class ProfileMeView(generics.RetrieveUpdateAPIView):
    """
    GET    /api/profile/me/   -> retrieve your profile
    PUT    /api/profile/me/   -> replace profile (nested payload)
    PATCH  /api/profile/me/   -> partial update
    """

    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        # Auto-create an empty profile on first access
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        return profile


class SkillListView(generics.ListAPIView):
    """
    Public list of all canonical skills (for front-end autocomplete).
    """

    queryset = Skill.objects.order_by("name")
    serializer_class = SkillSerializer
    permission_classes = [permissions.AllowAny]

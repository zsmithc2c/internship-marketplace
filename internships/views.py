from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied

from accounts.models import User
from employers.models import Employer

from .models import Internship
from .serializers import InternshipSerializer


class InternshipListCreate(generics.ListCreateAPIView):
    """
    GET  /api/internships/         -> public list of all internships
    GET  /api/internships/?mine=true  -> list internships posted by current employer
    POST /api/internships/         -> create a new internship (employer only)
    """

    serializer_class = InternshipSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = Internship.objects.select_related("employer").all()
        mine_param = self.request.query_params.get("mine")
        if mine_param and mine_param.lower() in ("true", "1", "yes"):
            if not self.request.user.is_authenticated:
                raise PermissionDenied(
                    "Authentication is required to filter your internships."
                )
            # Current user must be an employer with a profile
            try:
                employer = self.request.user.employer
            except Employer.DoesNotExist:
                raise PermissionDenied("No employer profile found for this user.")
            qs = qs.filter(employer=employer)
        return qs

    def perform_create(self, serializer):
        # Only authenticated employers can create internships
        if (
            not self.request.user.is_authenticated
            or self.request.user.role != User.Role.EMPLOYER
        ):
            raise PermissionDenied("Only employer accounts can create internships.")
        employer, _ = Employer.objects.get_or_create(user=self.request.user)
        serializer.save(employer=employer)


class InternshipDetail(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/internships/<id>/   -> retrieve internship details (public)
    PUT    /api/internships/<id>/   -> update an internship (owner only)
    PATCH  /api/internships/<id>/   -> partial update (owner only)
    DELETE /api/internships/<id>/   -> delete an internship (owner only)
    """

    serializer_class = InternshipSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        if self.request.method in permissions.SAFE_METHODS:
            # Anyone can retrieve/view
            return Internship.objects.select_related("employer").all()
        # Editing/deleting allowed only for the owning employer
        return Internship.objects.select_related("employer").filter(
            employer__user=self.request.user
        )

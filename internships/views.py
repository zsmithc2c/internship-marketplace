from django.db import IntegrityError
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser

from accounts.models import User
from employers.models import Employer
from employers.serializers import ApplicationSerializer

from .models import Application, Internship
from .serializers import InternshipSerializer

# ────────────────────────────────────────────────────────────
# Internship Listings
# ────────────────────────────────────────────────────────────


class InternshipListCreate(generics.ListCreateAPIView):
    """
    GET  /api/internships/                -> public list of open internships
    GET  /api/internships/?mine=true      -> list internships posted by current employer
    GET  /api/internships/?status=closed  -> list closed internships (employer dashboard)
    POST /api/internships/                -> create a new internship (employer only)
    """

    serializer_class = InternshipSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = Internship.objects.select_related("employer").all()

        mine_param = self.request.query_params.get("mine")
        status_param = self.request.query_params.get("status")

        # ── Employer “mine” filter ───────────────────────
        if mine_param and mine_param.lower() in ("true", "1", "yes"):
            if not self.request.user.is_authenticated:
                raise PermissionDenied("Authentication required.")
            try:
                employer = self.request.user.employer
            except Employer.DoesNotExist:
                raise PermissionDenied("No employer profile found.")
            qs = qs.filter(employer=employer)
        else:
            # Public browsing defaults to open listings only
            if status_param is None:
                qs = qs.filter(is_open=True)

        # ── Explicit status filter (open/closed) ─────────
        if status_param:
            status_param = status_param.lower()
            if status_param == "open":
                qs = qs.filter(is_open=True)
            elif status_param == "closed":
                qs = qs.filter(is_open=False)

        return qs

    def perform_create(self, serializer):
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
    PUT    /api/internships/<id>/   -> update (owner only)
    PATCH  /api/internships/<id>/   -> partial update (owner only)
    DELETE /api/internships/<id>/   -> delete (owner only)
    """

    serializer_class = InternshipSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        if self.request.method in permissions.SAFE_METHODS:
            return Internship.objects.select_related("employer").all()
        return Internship.objects.select_related("employer").filter(
            employer__user=self.request.user
        )


# ────────────────────────────────────────────────────────────
# Applications
# ────────────────────────────────────────────────────────────


class ApplicationList(generics.ListCreateAPIView):
    """
    GET  /api/internships/<pk>/applications/  -> employer views applicants
    POST /api/internships/<pk>/applications/  -> intern submits application
    """

    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    # ── Shared helpers ───────────────────────────────────

    def _get_internship_for_request(self):
        internship_id = self.kwargs["pk"]
        try:
            return Internship.objects.select_related("employer").get(id=internship_id)
        except Internship.DoesNotExist:
            raise ValidationError({"detail": "Internship not found."})

    # ── GET (employer) ───────────────────────────────────

    def get_queryset(self):
        internship = self._get_internship_for_request()

        # Only the owning employer may list applications
        if self.request.method in permissions.SAFE_METHODS:
            if (
                self.request.user.role != User.Role.EMPLOYER
                or getattr(self.request.user, "employer", None) != internship.employer
            ):
                raise PermissionDenied(
                    "Only the internship’s employer may view applications."
                )
        return Application.objects.filter(internship=internship).select_related(
            "intern"
        )

    # ── POST (intern applies) ────────────────────────────

    def perform_create(self, serializer):
        internship = self._get_internship_for_request()

        # Validation: only interns may apply
        if self.request.user.role != User.Role.INTERN:
            raise PermissionDenied("Only intern accounts can apply to internships.")

        if not internship.is_open:
            raise ValidationError(
                "This internship is no longer accepting applications."
            )

        if internship.external_application_url:
            raise ValidationError(
                "This internship requires applying through an external link."
            )

        # Validate required materials
        requires = {
            "cover_letter": internship.requires_cover_letter,
            "resume": internship.requires_resume,
            "references": internship.requires_references,
        }
        for field, required in requires.items():
            if required and not self.request.data.get(field):
                raise ValidationError({field: "This field is required."})

        # Attempt to save; handle duplicate error gracefully
        try:
            serializer.save(
                internship=internship,
                intern=self.request.user,
            )
        except IntegrityError:
            raise ValidationError("You have already applied to this internship.")


class ApplicationDetail(generics.UpdateAPIView):
    """
    PATCH /api/applications/<id>/   -> employer accepts/rejects application
    """

    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only applications belonging to internships owned by current employer
        return Application.objects.filter(
            internship__employer__user=self.request.user
        ).select_related("intern", "internship")

    def perform_update(self, serializer):
        previous_status = serializer.instance.status
        instance = serializer.save()

        # On acceptance: close listing + increment hires
        if (
            previous_status != Application.Status.ACCEPTED
            and instance.status == Application.Status.ACCEPTED
        ):
            internship = instance.internship
            if internship.is_open:
                internship.is_open = False
                internship.save(update_fields=["is_open"])
            employer = internship.employer
            employer.hires_made = (employer.hires_made or 0) + 1
            employer.save(update_fields=["hires_made"])

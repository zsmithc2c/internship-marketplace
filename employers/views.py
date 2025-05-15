from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied

from accounts.models import User

from .models import Employer
from .serializers import EmployerSerializer


class EmployerMeView(generics.RetrieveUpdateAPIView):
    """
    GET    /api/employer/me/   -> retrieve your employer profile
    PUT    /api/employer/me/   -> update/replace employer profile
    PATCH  /api/employer/me/   -> partial update employer profile
    """

    serializer_class = EmployerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        # Only allow if current user is an employer
        if self.request.user.role != User.Role.EMPLOYER:
            raise PermissionDenied("Only employer accounts have an employer profile.")
        # Auto-create an empty Employer profile on first access
        employer, _ = Employer.objects.get_or_create(user=self.request.user)
        return employer

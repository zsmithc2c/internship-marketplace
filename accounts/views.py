from rest_framework import generics, permissions
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers import CustomTokenObtainPairSerializer, RegisterSerializer


class RegisterView(generics.CreateAPIView):
    """
    Creates a user and returns their public data.
    Front-end will call /api/auth/register/, then immediately
    hit /api/auth/token/ to log in.
    """

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class LoginView(TokenObtainPairView):
    """
    Returns access + refresh JWTs.
    Payload enhanced with 'role' via CustomTokenObtainPairSerializer.
    """

    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]


class RefreshView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]

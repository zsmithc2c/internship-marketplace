from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    """Used by the /register/ endpoint."""

    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("id", "email", "password", "role")
        read_only_fields = ("id",)

    def create(self, validated_data):
        password = validated_data.pop("password")
        # `create_user` handles password hashing
        user = User.objects.create_user(password=password, **validated_data)
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends the default Simple-JWT serializer so the access token
    contains the user's role, e.g.  {"role": "EMPLOYER"}.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        return token

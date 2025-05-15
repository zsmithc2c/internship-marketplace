# accounts/serializers.py
from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for the /api/auth/register endpoint.
    ─────────────────────────────────────────────────────────────
    •  Hashes the password via `User.objects.create_user`.
    •  Enforces a UNIQUE e-mail ahead of hitting the database so we
       return a clean **400 Bad Request** instead of a 500.
    """

    email = serializers.EmailField(
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message="A user with this e-mail already exists.",
            )
        ]
    )
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("id", "email", "password", "role")
        read_only_fields = ("id",)

    # Extra defensive check (handles race-condition edge cases)
    def validate_email(self, value: str) -> str:
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this e-mail already exists.")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        # `create_user` hashes the password & sets is_active, etc.
        return User.objects.create_user(password=password, **validated_data)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Issue JWTs that carry the user's role claim, e.g.  {"role": "EMPLOYER"}.
    The frontend can read this from the access token instead of hitting /me.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        return token

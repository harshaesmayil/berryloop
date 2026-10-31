from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Public profile data for the logged-in user. Role and email cannot be changed here."""

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role"]
        read_only_fields = ["id", "email", "role"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    class Meta:
        model = User
        fields = ["email", "password", "first_name", "last_name"]
        extra_kwargs = {
            "first_name": {"required": False, "allow_blank": True},
            "last_name": {"required": False, "allow_blank": True},
        }

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, attrs):
        # Checks the password strength rules in settings.AUTH_PASSWORD_VALIDATORS.
        candidate = User(
            email=attrs.get("email", ""),
            first_name=attrs.get("first_name", ""),
            last_name=attrs.get("last_name", ""),
        )
        try:
            validate_password(attrs["password"], user=candidate)
        except DjangoValidationError as exc:
            # Report password problems under the "password" field so the
            # frontend can show them next to the password box.
            raise serializers.ValidationError({"password": list(exc.messages)})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        # New sign-ups are always customers. Staff and admins are created by an admin.
        user = User(
            username=validated_data["email"],
            role=User.Role.CUSTOMER,
            **validated_data,
        )
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})


class StaffCreateSerializer(RegisterSerializer):
    """Used by an admin to add a staff member. Same password and email rules as sign-up."""

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(username=validated_data["email"], role=User.Role.STAFF, **validated_data)
        user.set_password(password)
        user.save()
        return user


class PasswordSetSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate(self, attrs):
        try:
            validate_password(attrs["password"], user=self.context.get("user"))
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)})
        return attrs

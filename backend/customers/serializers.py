from rest_framework import serializers

from accounts.models import User

from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=User.Role.CUSTOMER),
        allow_null=True,
        required=False,
        help_text="Optional login account (must have the customer role).",
    )
    user_email = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            "id",
            "name",
            "email",
            "phone",
            "company",
            "billing_address",
            "status",
            "user",
            "user_email",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_user_email(self, obj):
        return obj.user.email if obj.user_id else None

    def validate_email(self, value):
        value = value.strip().lower()
        existing = Customer.objects.filter(email__iexact=value)
        if self.instance is not None:
            existing = existing.exclude(pk=self.instance.pk)
        if existing.exists():
            raise serializers.ValidationError("A customer with this email already exists.")
        return value

    def validate_user(self, value):
        if value is None:
            return value
        existing = Customer.objects.filter(user=value)
        if self.instance is not None:
            existing = existing.exclude(pk=self.instance.pk)
        if existing.exists():
            raise serializers.ValidationError("This login account is already linked to another customer.")
        return value


class LinkableUserSerializer(serializers.ModelSerializer):
    """Customer-role login accounts that can be linked to a customer record."""

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name"]

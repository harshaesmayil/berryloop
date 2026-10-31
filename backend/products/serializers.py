from rest_framework import serializers

from .models import Plan, Product


class ProductSerializer(serializers.ModelSerializer):
    plan_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "status",
            "plan_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_plan_count(self, obj):
        # The list and detail views annotate this value, so no extra query is needed.
        return getattr(obj, "plan_count", 0)

    def validate_name(self, value):
        value = value.strip()
        existing = Product.objects.filter(name__iexact=value)
        if self.instance is not None:
            existing = existing.exclude(pk=self.instance.pk)
        if existing.exists():
            raise serializers.ValidationError("A product with this name already exists.")
        return value


class ProductOptionSerializer(serializers.ModelSerializer):
    """Short product details for dropdowns."""

    class Meta:
        model = Product
        fields = ["id", "name", "status"]


class PlanSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = Plan
        fields = [
            "id",
            "product",
            "product_name",
            "name",
            "description",
            "price",
            "currency",
            "billing_interval",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_currency(self, value):
        return value.strip().upper()

    def validate(self, attrs):
        product = attrs.get("product", getattr(self.instance, "product", None))
        name = attrs.get("name", getattr(self.instance, "name", "")).strip()
        attrs["name"] = name

        if product is not None and name:
            existing = Plan.objects.filter(product=product, name__iexact=name)
            if self.instance is not None:
                existing = existing.exclude(pk=self.instance.pk)
            if existing.exists():
                raise serializers.ValidationError(
                    {"name": ["This product already has a plan with this name."]}
                )
        return attrs

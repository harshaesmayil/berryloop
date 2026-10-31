from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Plan, Product
from .permissions import CatalogAccess
from .serializers import PlanSerializer, ProductOptionSerializer, ProductSerializer


def save_with_conflict_check(serializer):
    """Save inside a transaction, turning rare database conflicts into a clear API error."""
    try:
        with transaction.atomic():
            return serializer.save()
    except IntegrityError:
        raise ValidationError({"detail": ["This record conflicts with an existing record."]})


def parse_choice(params, name, allowed):
    value = params.get(name, "").strip()
    if value and value not in allowed:
        raise ValidationError({name: [f"Unknown value: {value}."]})
    return value


class ProductListCreateView(generics.ListCreateAPIView):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated, CatalogAccess]

    def get_queryset(self):
        queryset = Product.objects.annotate(plan_count=Count("plans"))
        params = self.request.query_params

        search = params.get("search", "").strip()
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(description__icontains=search))

        status_value = parse_choice(params, "status", Product.Status.values)
        if status_value:
            queryset = queryset.filter(status=status_value)

        return queryset

    def perform_create(self, serializer):
        save_with_conflict_check(serializer)


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated, CatalogAccess]

    def get_queryset(self):
        return Product.objects.annotate(plan_count=Count("plans"))

    def perform_update(self, serializer):
        save_with_conflict_check(serializer)

    def perform_destroy(self, instance):
        if instance.plans.exists():
            raise ValidationError(
                {"detail": ["This product has plans. Delete or move its plans first."]}
            )
        instance.delete()


class ProductOptionsView(generics.ListAPIView):
    """All products, unpaginated, for dropdowns on the plan form."""

    serializer_class = ProductOptionSerializer
    permission_classes = [IsAuthenticated, CatalogAccess]
    pagination_class = None

    def get_queryset(self):
        return Product.objects.order_by("name")


class PlanListCreateView(generics.ListCreateAPIView):
    serializer_class = PlanSerializer
    permission_classes = [IsAuthenticated, CatalogAccess]

    def get_queryset(self):
        queryset = Plan.objects.select_related("product")
        params = self.request.query_params

        search = params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(description__icontains=search)
                | Q(product__name__icontains=search)
            )

        status_value = parse_choice(params, "status", Plan.Status.values)
        if status_value:
            queryset = queryset.filter(status=status_value)

        interval_value = parse_choice(params, "billing_interval", Plan.Interval.values)
        if interval_value:
            queryset = queryset.filter(billing_interval=interval_value)

        product_value = params.get("product", "").strip()
        if product_value:
            if not product_value.isdigit():
                raise ValidationError({"product": ["Product must be a number."]})
            queryset = queryset.filter(product_id=int(product_value))

        return queryset

    def perform_create(self, serializer):
        save_with_conflict_check(serializer)


class PlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PlanSerializer
    permission_classes = [IsAuthenticated, CatalogAccess]

    def get_queryset(self):
        return Plan.objects.select_related("product")

    def perform_update(self, serializer):
        save_with_conflict_check(serializer)

    def perform_destroy(self, instance):
        if instance.is_in_use():
            raise ValidationError(
                {"detail": ["This plan is used by subscriptions and cannot be deleted. Deactivate it instead."]}
            )
        instance.delete()

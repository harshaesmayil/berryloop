from django.db import IntegrityError, transaction
from django.db.models import Q
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from accounts.models import User

from .models import Customer
from .permissions import CustomerAccess
from .serializers import CustomerSerializer, LinkableUserSerializer


def save_customer(serializer):
    """Save inside a transaction, turning rare database conflicts into a clear API error."""
    try:
        with transaction.atomic():
            return serializer.save()
    except IntegrityError:
        raise ValidationError({"detail": ["This customer conflicts with an existing record."]})


class CustomerQuerysetMixin:
    def get_queryset(self):
        user = self.request.user
        queryset = Customer.objects.select_related("user")
        if user.role == User.Role.CUSTOMER:
            # A customer only ever sees the record linked to their own login.
            return queryset.filter(user=user)
        return queryset


class CustomerListCreateView(CustomerQuerysetMixin, generics.ListCreateAPIView):
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated, CustomerAccess]

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        search = params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(email__icontains=search)
                | Q(company__icontains=search)
            )

        status_value = params.get("status", "").strip()
        if status_value:
            if status_value not in Customer.Status.values:
                raise ValidationError({"status": ["Unknown status."]})
            queryset = queryset.filter(status=status_value)

        return queryset

    def perform_create(self, serializer):
        save_customer(serializer)


class CustomerDetailView(CustomerQuerysetMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated, CustomerAccess]
    # Lets a linked customer read their own record. Editing and deleting stay staff/admin only.
    allow_customer_self_read = True

    def perform_update(self, serializer):
        save_customer(serializer)

    # Deletion: once subscriptions and invoices exist, they will reference Customer with
    # on_delete=PROTECT, so deleting a customer with records will be blocked by the database.


class LinkableUserListView(generics.ListAPIView):
    """Customer-role login accounts that are not yet linked to any customer record."""

    serializer_class = LinkableUserSerializer
    permission_classes = [IsAuthenticated, CustomerAccess]
    pagination_class = None

    def get_queryset(self):
        return User.objects.filter(
            role=User.Role.CUSTOMER,
            customer_profile__isnull=True,
        ).order_by("email")

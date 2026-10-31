from decimal import Decimal

from django.shortcuts import get_object_or_404
from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from customers.models import Customer
from products.models import Plan, Product

from .models import Invoice, Subscription
from .permissions import BillingAccess
from .serializers import InvoiceSerializer, SubscriptionSerializer

# Converts a plan price to a monthly amount for MRR. Approximate: a year is 12 months, a quarter is 3.
MONTHLY_FACTOR = {
    "daily": Decimal("30"),
    "weekly": Decimal("52") / Decimal("12"),
    "monthly": Decimal("1"),
    "quarterly": Decimal("1") / Decimal("3"),
    "yearly": Decimal("1") / Decimal("12"),
}


def parse_choice(params, name, allowed):
    value = params.get(name, "").strip()
    if value and value not in allowed:
        raise ValidationError({name: [f"Unknown value: {value}."]})
    return value


class SubscriptionListCreateView(generics.ListCreateAPIView):
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticated, BillingAccess]

    def get_queryset(self):
        queryset = Subscription.objects.select_related("customer", "plan__product")
        params = self.request.query_params
        status_value = parse_choice(params, "status", Subscription.Status.values)
        if status_value:
            queryset = queryset.filter(status=status_value)
        customer_value = params.get("customer", "").strip()
        if customer_value:
            if not customer_value.isdigit():
                raise ValidationError({"customer": ["Customer must be a number."]})
            queryset = queryset.filter(customer_id=int(customer_value))
        search = params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(customer__name__icontains=search) | Q(plan__name__icontains=search)
                | Q(plan__product__name__icontains=search)
            )
        return queryset


class SubscriptionDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticated, BillingAccess]
    http_method_names = ["get", "patch", "head", "options"]  # Subscriptions are cancelled, not deleted.

    def get_queryset(self):
        return Subscription.objects.select_related("customer", "plan__product")


class InvoiceListCreateView(generics.ListCreateAPIView):
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, BillingAccess]

    def get_queryset(self):
        queryset = Invoice.objects.select_related("subscription__customer", "subscription__plan__product")
        params = self.request.query_params
        today = timezone.localdate()
        status_value = parse_choice(params, "status", ["pending", "paid", "overdue"])
        if status_value == "paid":
            queryset = queryset.filter(status=Invoice.Status.PAID)
        elif status_value == "pending":
            queryset = queryset.filter(status=Invoice.Status.PENDING, due_date__gte=today)
        elif status_value == "overdue":
            queryset = queryset.filter(status=Invoice.Status.PENDING, due_date__lt=today)
        subscription_value = params.get("subscription", "").strip()
        if subscription_value.isdigit():
            queryset = queryset.filter(subscription_id=int(subscription_value))
        return queryset


class InvoiceDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, BillingAccess]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return Invoice.objects.select_related("subscription__customer", "subscription__plan__product")

    def perform_update(self, serializer):
        # Only amount and dates can be edited. Payment status goes through mark-paid.
        if serializer.instance.status == Invoice.Status.PAID:
            raise ValidationError({"detail": ["A paid invoice cannot be edited."]})
        serializer.save()


class InvoiceMarkPaidView(APIView):
    permission_classes = [IsAuthenticated, BillingAccess]

    def post(self, request, pk):
        invoice = get_object_or_404(Invoice.objects.select_related("subscription__customer", "subscription__plan__product"), pk=pk)
        if invoice.status == Invoice.Status.PAID:
            raise ValidationError({"detail": ["This invoice is already paid."]})
        invoice.status = Invoice.Status.PAID
        invoice.paid_at = timezone.now()
        invoice.save(update_fields=["status", "paid_at", "updated_at"])
        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_200_OK)


class DashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated, BillingAccess]

    def get(self, request):
        today = timezone.localdate()

        active_subs = Subscription.objects.filter(status=Subscription.Status.ACTIVE).select_related("plan")
        mrr_by_currency = {}
        for sub in active_subs:
            amount = sub.plan.price * MONTHLY_FACTOR[sub.plan.billing_interval]
            mrr_by_currency[sub.plan.currency] = mrr_by_currency.get(sub.plan.currency, Decimal("0")) + amount
        mrr_by_currency = {code: str(value.quantize(Decimal("0.01"))) for code, value in mrr_by_currency.items()}

        pending = Invoice.objects.filter(status=Invoice.Status.PENDING)
        overdue = pending.filter(due_date__lt=today)
        pending_totals = pending.values("currency").annotate(total=Sum("amount"))

        recent_subs = Subscription.objects.select_related("customer", "plan__product")[:5]
        recent_invoices = Invoice.objects.select_related("subscription__customer")[:5]

        return Response({
            "total_customers": Customer.objects.count(),
            "active_subscriptions": active_subs.count(),
            "total_products": Product.objects.count(),
            "active_plans": Plan.objects.filter(status="active").count(),
            "mrr_by_currency": mrr_by_currency,
            "pending_invoices": pending.count(),
            "pending_amount_by_currency": {row["currency"]: str(row["total"]) for row in pending_totals},
            "overdue_invoices": overdue.count(),
            "paid_invoices": Invoice.objects.filter(status=Invoice.Status.PAID).count(),
            "recent_subscriptions": [
                {
                    "id": s.id,
                    "customer_name": s.customer.name,
                    "plan_name": s.plan.name,
                    "status": s.status,
                }
                for s in recent_subs
            ],
            "recent_invoices": [
                {
                    "id": i.id,
                    "invoice_number": i.invoice_number,
                    "customer_name": i.subscription.customer.name,
                    "amount": str(i.amount),
                    "currency": i.currency,
                    "effective_status": i.effective_status(today),
                }
                for i in recent_invoices
            ],
        })

from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from customers.models import Customer
from products.models import Plan

from .models import Invoice, Subscription, add_billing_interval


class SubscriptionSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    plan_name = serializers.CharField(source="plan.name", read_only=True)
    product_name = serializers.CharField(source="plan.product.name", read_only=True)
    price = serializers.DecimalField(source="plan.price", max_digits=12, decimal_places=2, read_only=True)
    currency = serializers.CharField(source="plan.currency", read_only=True)
    billing_interval = serializers.CharField(source="plan.billing_interval", read_only=True)
    start_date = serializers.DateField(required=False)

    class Meta:
        model = Subscription
        fields = [
            "id", "customer", "customer_name", "plan", "plan_name", "product_name",
            "price", "currency", "billing_interval", "status", "start_date",
            "next_billing_date", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "next_billing_date", "created_at", "updated_at"]
        extra_kwargs = {"customer": {"queryset": Customer.objects.all()}, "plan": {"queryset": Plan.objects.all()}}

    def validate_plan(self, plan):
        if self.instance is None and plan.status != "active":
            raise serializers.ValidationError("This plan is inactive and cannot be subscribed to.")
        return plan

    def validate_customer(self, customer):
        if self.instance is None and customer.status != "active":
            raise serializers.ValidationError("This customer is inactive and cannot subscribe.")
        return customer

    def validate(self, attrs):
        # Customer, plan and start date are fixed once created. Only status can change afterwards.
        if self.instance is not None:
            for field in ("customer", "plan", "start_date"):
                if field in attrs and attrs[field] != getattr(self.instance, field):
                    raise serializers.ValidationError(
                        {field: ["Create a new subscription to change this."]}
                    )
        return attrs

    def create(self, validated_data):
        start = validated_data.get("start_date") or timezone.localdate()
        validated_data["start_date"] = start
        validated_data["next_billing_date"] = add_billing_interval(
            start, validated_data["plan"].billing_interval
        )
        return super().create(validated_data)


class InvoiceSerializer(serializers.ModelSerializer):
    subscription_label = serializers.SerializerMethodField()
    customer_name = serializers.CharField(source="subscription.customer.name", read_only=True)
    effective_status = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            "id", "invoice_number", "subscription", "subscription_label", "customer_name",
            "amount", "currency", "issue_date", "due_date", "status", "effective_status",
            "paid_at", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "invoice_number", "status", "paid_at", "created_at", "updated_at"]
        extra_kwargs = {
            "subscription": {"queryset": Subscription.objects.select_related("customer", "plan")},
            # Optional in the API: validate() fills in amount, currency, issue and due dates from the plan.
            "amount": {"required": False},
            "due_date": {"required": False},
        }

    def get_subscription_label(self, obj):
        return str(obj.subscription)

    def get_effective_status(self, obj):
        return obj.effective_status()

    def validate(self, attrs):
        if self.instance is None:
            subscription = attrs.get("subscription")
            if subscription and subscription.status != "active":
                raise serializers.ValidationError({"subscription": ["Only active subscriptions can be invoiced."]})
            attrs.setdefault("amount", subscription.plan.price)
            attrs.setdefault("currency", subscription.plan.currency)
            issue = attrs.setdefault("issue_date", timezone.localdate())
            attrs.setdefault("due_date", issue + timedelta(days=7))
            if attrs["due_date"] < attrs["issue_date"]:
                raise serializers.ValidationError({"due_date": ["Due date cannot be before the issue date."]})
        return attrs

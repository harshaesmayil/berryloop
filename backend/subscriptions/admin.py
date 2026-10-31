from django.contrib import admin

from .models import DiscountRule, Invoice, Payment, Subscription, TaxRule


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("customer", "plan", "status", "next_billing_date")
    list_filter = ("status",)


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("invoice_number", "subscription", "amount", "currency", "due_date", "status")
    list_filter = ("status",)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("invoice", "amount", "method", "paid_on")
    list_filter = ("method",)


@admin.register(TaxRule)
class TaxRuleAdmin(admin.ModelAdmin):
    list_display = ("name", "rate", "active")


@admin.register(DiscountRule)
class DiscountRuleAdmin(admin.ModelAdmin):
    list_display = ("name", "kind", "value", "scope", "start_date", "end_date", "times_used", "active")

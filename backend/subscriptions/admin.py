from django.contrib import admin

from .models import Invoice, Subscription


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("customer", "plan", "status", "next_billing_date")
    list_filter = ("status",)


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("invoice_number", "subscription", "amount", "currency", "due_date", "status")
    list_filter = ("status",)

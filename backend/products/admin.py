from django.contrib import admin

from .models import Plan, Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "status", "updated_at")
    list_filter = ("status",)
    search_fields = ("name", "description")


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ("name", "product", "price", "currency", "billing_interval", "status")
    list_filter = ("status", "billing_interval", "currency")
    search_fields = ("name", "description", "product__name")

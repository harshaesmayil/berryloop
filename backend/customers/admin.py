from django.contrib import admin

from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "company", "status", "user")
    list_filter = ("status",)
    search_fields = ("name", "email", "company")

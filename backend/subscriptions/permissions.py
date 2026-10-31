"""Subscriptions and invoices: admin and staff only. Customers cannot use these endpoints."""
from rest_framework.permissions import SAFE_METHODS, BasePermission

from accounts.models import User


class BillingAccess(BasePermission):
    """Admin and staff manage billing. Customers may only read views marked customer_read."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.role in (User.Role.ADMIN, User.Role.STAFF):
            return True
        return request.method in SAFE_METHODS and getattr(view, "customer_read", False)


class AdminWriteStaffRead(BasePermission):
    """Staff and admin can view tax and discount rules. Only admin can change them."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return user.role in (User.Role.ADMIN, User.Role.STAFF)
        return user.role == User.Role.ADMIN

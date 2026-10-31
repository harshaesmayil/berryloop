"""Who may use the customer endpoints. Enforced on the server.

Admin:    list, create, read, edit and delete any customer.
Staff:    list, create, read and edit customers. Cannot delete.
Customer: read their own customer record only (detail endpoint only).
          Cannot list, create, edit or delete anything.
"""
from rest_framework.permissions import SAFE_METHODS, BasePermission

from accounts.models import User


class CustomerAccess(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.role in (User.Role.ADMIN, User.Role.STAFF):
            return True
        # Customers may only read, and only through views that allow it.
        return request.method in SAFE_METHODS and getattr(view, "allow_customer_self_read", False)

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == User.Role.ADMIN:
            return True
        if user.role == User.Role.STAFF:
            return request.method != "DELETE"
        return request.method in SAFE_METHODS and obj.user_id == user.id

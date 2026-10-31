"""Who may use the product and plan endpoints. Enforced on the server.

Admin:    full access, including delete.
Staff:    list, view, create and edit. Cannot delete.
Customer: no access to product or plan administration.
"""
from rest_framework.permissions import BasePermission

from accounts.models import User


class CatalogAccess(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role in (User.Role.ADMIN, User.Role.STAFF))

    def has_object_permission(self, request, view, obj):
        if request.user.role == User.Role.ADMIN:
            return True
        return request.method != "DELETE"

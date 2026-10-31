"""Role-based permission classes. These run on the server, so the frontend
hiding a button is never the only protection."""
from rest_framework.permissions import BasePermission

from .models import User


class HasRole(BasePermission):
    """Allows access only to logged-in users whose role is in allowed_roles."""

    allowed_roles = ()

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role in self.allowed_roles)


class IsAdminRole(HasRole):
    allowed_roles = (User.Role.ADMIN,)


class IsAdminOrStaff(HasRole):
    allowed_roles = (User.Role.ADMIN, User.Role.STAFF)

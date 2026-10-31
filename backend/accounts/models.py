from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Berryloop user. Email is unique and is used to log in.

    Roles control what each person may do:
      - admin:    full access to the system
      - staff:    operational access to customers, subscriptions, invoices
      - customer: access only to their own account and records
    """

    class Role(models.TextChoices):
        ADMIN = "admin", "Administrator"
        STAFF = "staff", "Staff"
        CUSTOMER = "customer", "Customer"

    email = models.EmailField("email address", unique=True)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CUSTOMER,
        db_index=True,
    )

    REQUIRED_FIELDS = ["email"]

    def save(self, *args, **kwargs):
        # Superusers always have the admin role, so they can never be locked out
        # of admin functions by a wrong role value.
        if self.is_superuser:
            self.role = self.Role.ADMIN
        super().save(*args, **kwargs)

    def __str__(self):
        return self.email or self.username

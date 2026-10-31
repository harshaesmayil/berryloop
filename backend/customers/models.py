from django.conf import settings
from django.db import models
from django.db.models.functions import Lower


class Customer(models.Model):
    """A business customer who can be sold subscriptions.

    A customer may optionally be linked to a login account (role "customer").
    A linked customer can see only their own record.
    """

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    name = models.CharField(max_length=150)
    email = models.EmailField(max_length=254)
    phone = models.CharField(max_length=30, blank=True)
    company = models.CharField(max_length=150, blank=True)
    billing_address = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="customer_profile",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "id"]
        constraints = [
            # Emails are unique regardless of capitalisation, enforced by the database.
            models.UniqueConstraint(Lower("email"), name="customer_email_unique_ci"),
        ]
        indexes = [
            models.Index(fields=["name"], name="customer_name_idx"),
        ]

    def __str__(self):
        return self.name

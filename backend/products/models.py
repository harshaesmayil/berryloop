from decimal import Decimal

from django.core.validators import MinValueValidator, RegexValidator
from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower

CURRENCY_VALIDATOR = RegexValidator(
    r"^[A-Z]{3}$",
    "Use a 3-letter currency code such as INR or USD.",
)


class Product(models.Model):
    """A software product that the business sells on subscription."""

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "id"]
        constraints = [
            # Product names are unique regardless of capitalisation, enforced by the database.
            models.UniqueConstraint(Lower("name"), name="product_name_unique_ci"),
        ]

    def __str__(self):
        return self.name


class Plan(models.Model):
    """A priced billing option for one product, for example "Pro, monthly"."""

    class Interval(models.TextChoices):
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"
        QUARTERLY = "quarterly", "Quarterly"
        YEARLY = "yearly", "Yearly"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    # PROTECT: a product that still has plans cannot be deleted.
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="plans",
    )
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    currency = models.CharField(max_length=3, default="INR", validators=[CURRENCY_VALIDATOR])
    billing_interval = models.CharField(
        max_length=20,
        choices=Interval.choices,
        default=Interval.MONTHLY,
        db_index=True,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "id"]
        constraints = [
            # A price must be above zero, enforced by the database as well as the API.
            models.CheckConstraint(condition=Q(price__gt=0), name="plan_price_positive"),
            models.UniqueConstraint(fields=["product", "name"], name="plan_name_unique_per_product"),
        ]

    def __str__(self):
        return f"{self.product.name} - {self.name}"

    def is_in_use(self):
        """True when subscriptions use this plan, so it must not be deleted.

        Subscription.plan is PROTECT, so the database would refuse the delete anyway.
        This check gives the user a clear message before that happens.
        """
        return self.subscriptions.exists()

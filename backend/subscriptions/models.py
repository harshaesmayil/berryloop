from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models, transaction
from django.db.models import Q
from django.utils import timezone

from customers.models import Customer
from products.models import Plan


def add_billing_interval(start, interval):
    """Return the date one billing period after `start`."""
    if interval == "daily":
        return start + timedelta(days=1)
    if interval == "weekly":
        return start + timedelta(weeks=1)
    months = {"monthly": 1, "quarterly": 3, "yearly": 12}[interval]
    total = start.month - 1 + months
    year = start.year + total // 12
    month = total % 12 + 1
    # Clamp the day for short months, e.g. 31 Jan + 1 month -> 28/29 Feb.
    for day in (start.day, 30, 29, 28):
        try:
            return date(year, month, day)
        except ValueError:
            continue
    return date(year, month, 28)


class Subscription(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        CANCELLED = "cancelled", "Cancelled"
        EXPIRED = "expired", "Expired"

    # PROTECT: a customer or plan with subscriptions cannot be deleted.
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="subscriptions")
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name="subscriptions")
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True
    )
    start_date = models.DateField()
    next_billing_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.customer.name} - {self.plan}"


class Invoice(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"

    subscription = models.ForeignKey(
        Subscription, on_delete=models.PROTECT, related_name="invoices"
    )
    invoice_number = models.CharField(max_length=30, unique=True, blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    # amount is the total payable: subtotal - discount + tax.
    amount = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )
    currency = models.CharField(max_length=3, default="INR")
    issue_date = models.DateField(default=timezone.localdate)
    due_date = models.DateField()
    # Stored status is only pending or paid. "Overdue" is derived from the due date.
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.CheckConstraint(condition=Q(amount__gt=0), name="invoice_amount_positive"),
        ]

    def __str__(self):
        return self.invoice_number or f"Invoice {self.pk}"

    def save(self, *args, **kwargs):
        """Give every new invoice a unique number, however it is created (API, admin or code).

        The number uses the database id, which only exists after the first insert. So the row is
        first saved with a unique placeholder, then renamed to INV-<year>-<id> in the same transaction.
        """
        if self.invoice_number or self.pk is not None:
            return super().save(*args, **kwargs)
        with transaction.atomic():
            self.invoice_number = f"PENDING-{uuid4().hex[:20]}"  # 28 chars, fits max_length=30
            super().save(*args, **kwargs)
            self.invoice_number = f"INV-{self.issue_date.year}-{self.pk:05d}"
            Invoice.objects.filter(pk=self.pk).update(invoice_number=self.invoice_number)

    @property
    def customer(self):
        return self.subscription.customer

    def amount_paid(self):
        return sum((p.amount for p in self.payments.all()), Decimal("0.00"))

    def balance_due(self):
        return self.amount - self.amount_paid()

    def effective_status(self, today=None):
        if self.status == self.Status.PAID:
            return "paid"
        today = today or timezone.localdate()
        return "overdue" if self.due_date < today else "pending"


class Payment(models.Model):
    class Method(models.TextChoices):
        BANK_TRANSFER = "bank_transfer", "Bank transfer"
        CARD = "card", "Card"
        CASH = "cash", "Cash"
        CHEQUE = "cheque", "Cheque"
        OTHER = "other", "Other"

    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="payments")
    amount = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )
    method = models.CharField(max_length=20, choices=Method.choices, default=Method.OTHER)
    paid_on = models.DateField(default=timezone.localdate)
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-paid_on", "-id"]

    def __str__(self):
        return f"{self.invoice} - {self.amount}"


class TaxRule(models.Model):
    """A tax percentage added to every invoice while the rule is active. Admin sets these."""

    name = models.CharField(max_length=100)
    rate = models.DecimalField(
        max_digits=5, decimal_places=2,
        validators=[MinValueValidator(Decimal("0")), MaxValueValidator(Decimal("100"))],
    )
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name", "id"]

    def __str__(self):
        return f"{self.name} ({self.rate}%)"


class DiscountRule(models.Model):
    """A fixed or percentage discount. Admin creates these; they apply automatically to invoices."""

    class Kind(models.TextChoices):
        PERCENT = "percent", "Percentage"
        FIXED = "fixed", "Fixed amount"

    class Scope(models.TextChoices):
        ALL = "all", "Whole subscription"
        PRODUCT = "product", "Specific product"

    name = models.CharField(max_length=100)
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.PERCENT)
    value = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    scope = models.CharField(max_length=10, choices=Scope.choices, default=Scope.ALL)
    product = models.ForeignKey(
        "products.Product", null=True, blank=True, on_delete=models.PROTECT, related_name="discount_rules"
    )
    min_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    start_date = models.DateField(default=timezone.localdate)
    end_date = models.DateField()
    usage_limit = models.PositiveIntegerField(null=True, blank=True)
    times_used = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name", "id"]

    def __str__(self):
        return self.name

    def applies_to(self, plan, subtotal, today):
        if not self.active or not (self.start_date <= today <= self.end_date):
            return False
        if self.usage_limit is not None and self.times_used >= self.usage_limit:
            return False
        if subtotal < self.min_amount:
            return False
        if self.scope == self.Scope.PRODUCT and self.product_id != plan.product_id:
            return False
        return True

    def amount_for(self, subtotal):
        if self.kind == self.Kind.PERCENT:
            return (subtotal * self.value / Decimal("100")).quantize(Decimal("0.01"))
        return min(self.value, subtotal)


def compute_invoice_totals(subscription, today=None):
    """Work out subtotal, discounts, tax and total from the plan and the admin's rules."""
    today = today or timezone.localdate()
    plan = subscription.plan
    subtotal = plan.price
    rules = [r for r in DiscountRule.objects.all() if r.applies_to(plan, subtotal, today)]
    discount = min(sum((r.amount_for(subtotal) for r in rules), Decimal("0.00")), subtotal)
    net = subtotal - discount
    tax_rate = sum((t.rate for t in TaxRule.objects.filter(active=True)), Decimal("0"))
    tax = (net * tax_rate / Decimal("100")).quantize(Decimal("0.01"))
    return {
        "subtotal": subtotal,
        "discount_amount": discount,
        "tax_amount": tax,
        "amount": net + tax,
        "applied_rules": rules,
    }

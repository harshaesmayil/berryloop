from datetime import date, timedelta
from unittest import mock

from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from accounts.models import User
from customers.models import Customer
from products.models import Plan, Product

from .models import Invoice, Subscription, add_billing_interval

PASSWORD = "Str0ng-Berry-Pass!"


class BillingTestBase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="a@x.com", email="a@x.com", password=PASSWORD, role="admin")
        self.staff = User.objects.create_user(username="s@x.com", email="s@x.com", password=PASSWORD, role="staff")
        self.customer_login = User.objects.create_user(
            username="c@x.com", email="c@x.com", password=PASSWORD, role="customer"
        )
        self.acme = Customer.objects.create(name="Acme Ltd", email="acme@x.com")
        self.product = Product.objects.create(name="Brevora CRM")
        self.pro = Plan.objects.create(product=self.product, name="Pro", price="500.00", currency="INR")
        self.annual = Plan.objects.create(
            product=self.product, name="Annual", price="5000.00", currency="INR", billing_interval="yearly"
        )
        self.login(self.admin)

    def login(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    def make_subscription(self, plan=None, start=None):
        start = start or timezone.localdate()
        return Subscription.objects.create(
            customer=self.acme,
            plan=plan or self.pro,
            start_date=start,
            next_billing_date=add_billing_interval(start, (plan or self.pro).billing_interval),
        )


class SubscriptionTests(BillingTestBase):
    def test_create_subscription_sets_next_billing_date(self):
        start = date(2026, 1, 31)
        response = self.client.post(
            "/api/subscriptions/",
            {"customer": self.acme.pk, "plan": self.pro.pk, "start_date": str(start)},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["next_billing_date"], "2026-02-28")
        self.assertEqual(response.data["price"], "500.00")
        self.assertEqual(response.data["customer_name"], "Acme Ltd")
        self.assertEqual(response.data["status"], "active")

    def test_inactive_plan_cannot_be_subscribed(self):
        self.pro.status = "inactive"
        self.pro.save()
        response = self.client.post(
            "/api/subscriptions/", {"customer": self.acme.pk, "plan": self.pro.pk}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("plan", response.data)

    def test_inactive_customer_cannot_subscribe(self):
        self.acme.status = "inactive"
        self.acme.save()
        response = self.client.post(
            "/api/subscriptions/", {"customer": self.acme.pk, "plan": self.pro.pk}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("customer", response.data)

    def test_status_can_be_changed_but_plan_cannot(self):
        subscription = self.make_subscription()
        ok = self.client.patch(f"/api/subscriptions/{subscription.pk}/", {"status": "cancelled"}, format="json")
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(ok.data["status"], "cancelled")
        blocked = self.client.patch(
            f"/api/subscriptions/{subscription.pk}/", {"plan": self.annual.pk}, format="json"
        )
        self.assertEqual(blocked.status_code, 400)

    def test_subscriptions_cannot_be_deleted(self):
        subscription = self.make_subscription()
        response = self.client.delete(f"/api/subscriptions/{subscription.pk}/")
        self.assertEqual(response.status_code, 405)

    def test_filter_by_status(self):
        self.make_subscription()
        cancelled = self.make_subscription(plan=self.annual)
        cancelled.status = "cancelled"
        cancelled.save()
        self.assertEqual(self.client.get("/api/subscriptions/", {"status": "active"}).data["count"], 1)
        self.assertEqual(self.client.get("/api/subscriptions/", {"status": "bogus"}).status_code, 400)

    def test_plan_in_use_cannot_be_deleted(self):
        self.make_subscription()
        response = self.client.delete(f"/api/products/{self.product.pk}/")
        self.assertEqual(response.status_code, 400)
        response = self.client.delete(f"/api/plans/{self.pro.pk}/")
        self.assertEqual(response.status_code, 400)
        self.assertTrue(Plan.objects.filter(pk=self.pro.pk).exists())

    def test_customer_with_subscription_cannot_be_deleted(self):
        self.make_subscription()
        response = self.client.delete(f"/api/customers/{self.acme.pk}/")
        self.assertEqual(response.status_code, 400)
        self.assertTrue(Customer.objects.filter(pk=self.acme.pk).exists())

    def test_customer_role_has_no_billing_access(self):
        self.login(self.customer_login)
        self.assertEqual(self.client.get("/api/subscriptions/").status_code, 403)
        self.assertEqual(self.client.get("/api/invoices/").status_code, 403)
        self.assertEqual(self.client.get("/api/dashboard/summary/").status_code, 403)

    def test_staff_can_create_subscription(self):
        self.login(self.staff)
        response = self.client.post(
            "/api/subscriptions/", {"customer": self.acme.pk, "plan": self.pro.pk}, format="json"
        )
        self.assertEqual(response.status_code, 201)


class InvoiceTests(BillingTestBase):
    def test_invoice_defaults_from_plan_and_gets_number(self):
        subscription = self.make_subscription()
        response = self.client.post("/api/invoices/", {"subscription": subscription.pk}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["amount"], "500.00")
        self.assertEqual(response.data["currency"], "INR")
        self.assertEqual(response.data["status"], "pending")
        self.assertTrue(response.data["invoice_number"].startswith("INV-"))
        self.assertEqual(response.data["customer_name"], "Acme Ltd")

    def test_invoice_for_inactive_subscription_rejected(self):
        subscription = self.make_subscription()
        subscription.status = "cancelled"
        subscription.save()
        response = self.client.post("/api/invoices/", {"subscription": subscription.pk}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_due_date_before_issue_date_rejected(self):
        subscription = self.make_subscription()
        response = self.client.post(
            "/api/invoices/",
            {"subscription": subscription.pk, "issue_date": "2026-05-10", "due_date": "2026-05-01"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_mark_paid_then_cannot_repay_or_edit(self):
        invoice = Invoice.objects.create(
            subscription=self.make_subscription(), amount="500.00", due_date=timezone.localdate()
        )
        paid = self.client.post(f"/api/invoices/{invoice.pk}/mark-paid/")
        self.assertEqual(paid.status_code, 200)
        self.assertEqual(paid.data["status"], "paid")
        self.assertIsNotNone(paid.data["paid_at"])
        self.assertEqual(self.client.post(f"/api/invoices/{invoice.pk}/mark-paid/").status_code, 400)
        edit = self.client.patch(f"/api/invoices/{invoice.pk}/", {"amount": "1.00"}, format="json")
        self.assertEqual(edit.status_code, 400)

    def test_overdue_is_derived_from_due_date(self):
        subscription = self.make_subscription()
        yesterday = timezone.localdate() - timedelta(days=1)
        overdue = Invoice.objects.create(
            subscription=subscription, amount="500.00", issue_date=yesterday - timedelta(days=7), due_date=yesterday
        )
        Invoice.objects.create(subscription=subscription, amount="500.00", due_date=timezone.localdate() + timedelta(days=3))
        self.assertEqual(overdue.effective_status(), "overdue")
        self.assertEqual(self.client.get("/api/invoices/", {"status": "overdue"}).data["count"], 1)
        self.assertEqual(self.client.get("/api/invoices/", {"status": "pending"}).data["count"], 1)

    def test_direct_model_creation_gives_unique_numbers(self):
        subscription = self.make_subscription()
        first = Invoice.objects.create(subscription=subscription, amount="500.00", due_date=timezone.localdate())
        second = Invoice.objects.create(subscription=subscription, amount="500.00", due_date=timezone.localdate())
        self.assertNotEqual(first.invoice_number, second.invoice_number)
        self.assertTrue(first.invoice_number.startswith("INV-"))
        self.assertTrue(second.invoice_number.endswith(f"{second.pk:05d}"))
        self.assertFalse(Invoice.objects.filter(invoice_number="").exists())

    def test_api_created_invoices_get_unique_numbers(self):
        subscription = self.make_subscription()
        numbers = set()
        for _ in range(3):
            response = self.client.post("/api/invoices/", {"subscription": subscription.pk}, format="json")
            self.assertEqual(response.status_code, 201)
            numbers.add(response.data["invoice_number"])
        self.assertEqual(len(numbers), 3)

    def test_paid_invoice_is_not_overdue(self):
        invoice = Invoice.objects.create(
            subscription=self.make_subscription(), amount="500.00",
            due_date=timezone.localdate() - timedelta(days=5), status="paid",
        )
        self.assertEqual(invoice.effective_status(), "paid")


class DashboardTests(BillingTestBase):
    def test_summary_uses_real_records(self):
        self.make_subscription(plan=self.pro)  # 500 per month
        self.make_subscription(plan=self.annual)  # 5000 per year, about 416.67 per month
        Invoice.objects.create(subscription=self.make_subscription(), amount="500.00", due_date=timezone.localdate())
        response = self.client.get("/api/dashboard/summary/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_customers"], 1)
        self.assertEqual(response.data["active_subscriptions"], 3)
        self.assertEqual(response.data["mrr_by_currency"]["INR"], "1416.67")
        self.assertEqual(response.data["pending_invoices"], 1)
        self.assertEqual(response.data["pending_amount_by_currency"]["INR"], "500.00")
        self.assertEqual(len(response.data["recent_subscriptions"]), 3)

    def test_empty_database_returns_zeros(self):
        Subscription.objects.all().delete()
        response = self.client.get("/api/dashboard/summary/")
        self.assertEqual(response.data["active_subscriptions"], 0)
        self.assertEqual(response.data["mrr_by_currency"], {})


class AddIntervalTests(BillingTestBase):
    def test_interval_arithmetic(self):
        self.assertEqual(add_billing_interval(date(2026, 3, 15), "daily"), date(2026, 3, 16))
        self.assertEqual(add_billing_interval(date(2026, 3, 15), "weekly"), date(2026, 3, 22))
        self.assertEqual(add_billing_interval(date(2026, 3, 15), "quarterly"), date(2026, 6, 15))
        self.assertEqual(add_billing_interval(date(2026, 12, 10), "monthly"), date(2027, 1, 10))
        self.assertEqual(add_billing_interval(date(2026, 2, 28), "yearly"), date(2027, 2, 28))

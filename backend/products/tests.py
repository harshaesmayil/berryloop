from unittest import mock

from django.db import IntegrityError, transaction
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from accounts.models import User

from .models import Plan, Product

PASSWORD = "Str0ng-Berry-Pass!"
PRODUCTS = "/api/products/"
PLANS = "/api/plans/"
OPTIONS = "/api/products/options/"


def product_url(pk):
    return f"/api/products/{pk}/"


def plan_url(pk):
    return f"/api/plans/{pk}/"


class CatalogTestBase(APITestCase):
    def setUp(self):
        self.admin = self._user("admin@x.com", User.Role.ADMIN)
        self.staff = self._user("staff@x.com", User.Role.STAFF)
        self.customer_user = self._user("buyer@x.com", User.Role.CUSTOMER)

        self.crm = Product.objects.create(name="Brevora CRM", description="Customer relationship management")
        self.hr = Product.objects.create(name="Staff Hub", description="Workforce management", status="inactive")
        self.pro_monthly = Plan.objects.create(
            product=self.crm, name="Pro", price="499.00", currency="INR", billing_interval="monthly"
        )
        self.pro_yearly = Plan.objects.create(
            product=self.crm, name="Pro Annual", price="4990.00", currency="INR", billing_interval="yearly"
        )

    def _user(self, email, role):
        return User.objects.create_user(username=email, email=email, password=PASSWORD, role=role)

    def login_as(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")


class ProductTests(CatalogTestBase):
    def test_admin_creates_product_with_default_active_status(self):
        self.login_as(self.admin)
        response = self.client.post(
            PRODUCTS, {"name": "Brevora Flow", "description": "Workflow automation"}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "active")
        self.assertEqual(response.data["plan_count"], 0)
        self.assertTrue(Product.objects.filter(name="Brevora Flow").exists())

    def test_staff_can_create_product(self):
        self.login_as(self.staff)
        response = self.client.post(PRODUCTS, {"name": "Brevora Flow"}, format="json")
        self.assertEqual(response.status_code, 201)

    def test_duplicate_product_name_rejected_regardless_of_case(self):
        self.login_as(self.admin)
        response = self.client.post(PRODUCTS, {"name": "brevora crm"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("name", response.data)

    def test_blank_product_name_rejected(self):
        self.login_as(self.admin)
        response = self.client.post(PRODUCTS, {"name": "   "}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("name", response.data)

    def test_unknown_product_status_rejected(self):
        self.login_as(self.admin)
        response = self.client.post(PRODUCTS, {"name": "Odd", "status": "retired"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("status", response.data)

    def test_admin_edits_product_keeping_its_own_name(self):
        self.login_as(self.admin)
        response = self.client.patch(
            product_url(self.hr.pk), {"name": "Staff Hub", "status": "active"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.hr.refresh_from_db()
        self.assertEqual(self.hr.status, "active")

    def test_edit_to_another_products_name_rejected(self):
        self.login_as(self.admin)
        response = self.client.patch(product_url(self.hr.pk), {"name": "BREVORA CRM"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_product_list_shows_plan_counts(self):
        self.login_as(self.admin)
        response = self.client.get(PRODUCTS)
        self.assertEqual(response.status_code, 200)
        by_name = {row["name"]: row for row in response.data["results"]}
        self.assertEqual(by_name["Brevora CRM"]["plan_count"], 2)
        self.assertEqual(by_name["Staff Hub"]["plan_count"], 0)

    def test_product_search_matches_name_and_description(self):
        self.login_as(self.admin)
        by_name = self.client.get(PRODUCTS, {"search": "crm"}).data
        self.assertEqual(by_name["count"], 1)
        by_description = self.client.get(PRODUCTS, {"search": "workforce"}).data
        self.assertEqual(by_description["count"], 1)
        self.assertEqual(by_description["results"][0]["name"], "Staff Hub")

    def test_product_status_filter(self):
        self.login_as(self.admin)
        response = self.client.get(PRODUCTS, {"status": "inactive"})
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "Staff Hub")

    def test_unknown_product_status_filter_rejected(self):
        self.login_as(self.admin)
        response = self.client.get(PRODUCTS, {"status": "bogus"})
        self.assertEqual(response.status_code, 400)

    def test_product_list_is_paginated(self):
        self.login_as(self.admin)
        response = self.client.get(PRODUCTS)
        self.assertIn("count", response.data)
        self.assertIn("next", response.data)
        self.assertIn("results", response.data)

    def test_product_options_returns_all_products_unpaginated(self):
        self.login_as(self.admin)
        response = self.client.get(OPTIONS)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(set(response.data[0].keys()), {"id", "name", "status"})

    def test_admin_can_delete_product_without_plans(self):
        self.login_as(self.admin)
        response = self.client.delete(product_url(self.hr.pk))
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Product.objects.filter(pk=self.hr.pk).exists())

    def test_product_with_plans_cannot_be_deleted(self):
        self.login_as(self.admin)
        response = self.client.delete(product_url(self.crm.pk))
        self.assertEqual(response.status_code, 400)
        self.assertTrue(Product.objects.filter(pk=self.crm.pk).exists())

    def test_staff_cannot_delete_product(self):
        self.login_as(self.staff)
        response = self.client.delete(product_url(self.hr.pk))
        self.assertEqual(response.status_code, 403)
        self.assertTrue(Product.objects.filter(pk=self.hr.pk).exists())


class PlanTests(CatalogTestBase):
    def test_admin_creates_plan_with_defaults(self):
        self.login_as(self.admin)
        response = self.client.post(
            PLANS,
            {"product": self.hr.pk, "name": "Standard", "price": "199.50"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["currency"], "INR")
        self.assertEqual(response.data["billing_interval"], "monthly")
        self.assertEqual(response.data["status"], "active")
        self.assertEqual(response.data["product_name"], "Staff Hub")

    def test_currency_is_stored_in_uppercase(self):
        self.login_as(self.admin)
        response = self.client.post(
            PLANS,
            {"product": self.hr.pk, "name": "USD plan", "price": "9.00", "currency": "usd"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["currency"], "USD")

    def test_invalid_currency_rejected(self):
        self.login_as(self.admin)
        response = self.client.post(
            PLANS,
            {"product": self.hr.pk, "name": "Bad", "price": "9.00", "currency": "RUPEES"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("currency", response.data)

    def test_zero_and_negative_prices_rejected(self):
        self.login_as(self.admin)
        for price in ("0", "-5.00"):
            response = self.client.post(
                PLANS,
                {"product": self.hr.pk, "name": f"Price {price}", "price": price},
                format="json",
            )
            self.assertEqual(response.status_code, 400, price)
            self.assertIn("price", response.data)

    def test_unknown_billing_interval_rejected(self):
        self.login_as(self.admin)
        response = self.client.post(
            PLANS,
            {"product": self.hr.pk, "name": "Odd", "price": "9.00", "billing_interval": "fortnightly"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("billing_interval", response.data)

    def test_plan_name_must_be_unique_within_its_product(self):
        self.login_as(self.admin)
        response = self.client.post(
            PLANS,
            {"product": self.crm.pk, "name": "pro", "price": "10.00"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("name", response.data)

    def test_same_plan_name_allowed_under_a_different_product(self):
        self.login_as(self.admin)
        response = self.client.post(
            PLANS,
            {"product": self.hr.pk, "name": "Pro", "price": "10.00"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)

    def test_plan_requires_a_product(self):
        self.login_as(self.admin)
        response = self.client.post(PLANS, {"name": "Orphan", "price": "10.00"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("product", response.data)

    def test_admin_edits_plan_price_and_status(self):
        self.login_as(self.admin)
        response = self.client.patch(
            plan_url(self.pro_monthly.pk), {"price": "549.00", "status": "inactive"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.pro_monthly.refresh_from_db()
        self.assertEqual(str(self.pro_monthly.price), "549.00")
        self.assertEqual(self.pro_monthly.status, "inactive")

    def test_plan_detail_includes_product_name(self):
        self.login_as(self.admin)
        response = self.client.get(plan_url(self.pro_yearly.pk))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["product_name"], "Brevora CRM")
        self.assertEqual(response.data["billing_interval"], "yearly")

    def test_plan_search_matches_plan_or_product_name(self):
        self.login_as(self.admin)
        by_plan = self.client.get(PLANS, {"search": "annual"}).data
        self.assertEqual(by_plan["count"], 1)
        by_product = self.client.get(PLANS, {"search": "brevora"}).data
        self.assertEqual(by_product["count"], 2)

    def test_plan_filters_by_status_interval_and_product(self):
        self.login_as(self.admin)
        self.assertEqual(self.client.get(PLANS, {"billing_interval": "yearly"}).data["count"], 1)
        self.assertEqual(self.client.get(PLANS, {"product": self.crm.pk}).data["count"], 2)
        self.assertEqual(self.client.get(PLANS, {"product": self.hr.pk}).data["count"], 0)
        self.pro_monthly.status = "inactive"
        self.pro_monthly.save()
        self.assertEqual(self.client.get(PLANS, {"status": "inactive"}).data["count"], 1)

    def test_invalid_plan_filters_rejected(self):
        self.login_as(self.admin)
        self.assertEqual(self.client.get(PLANS, {"product": "abc"}).status_code, 400)
        self.assertEqual(self.client.get(PLANS, {"billing_interval": "bogus"}).status_code, 400)
        self.assertEqual(self.client.get(PLANS, {"status": "bogus"}).status_code, 400)

    def test_plan_list_is_paginated(self):
        self.login_as(self.admin)
        response = self.client.get(PLANS)
        self.assertEqual(response.data["count"], 2)
        self.assertIn("next", response.data)

    def test_admin_deletes_plan_not_in_use(self):
        self.login_as(self.admin)
        response = self.client.delete(plan_url(self.pro_yearly.pk))
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Plan.objects.filter(pk=self.pro_yearly.pk).exists())

    def test_plan_in_use_cannot_be_deleted(self):
        self.login_as(self.admin)
        with mock.patch("products.models.Plan.is_in_use", return_value=True):
            response = self.client.delete(plan_url(self.pro_yearly.pk))
        self.assertEqual(response.status_code, 400)
        self.assertTrue(Plan.objects.filter(pk=self.pro_yearly.pk).exists())

    def test_staff_can_create_and_edit_plans_but_not_delete(self):
        self.login_as(self.staff)
        created = self.client.post(
            PLANS, {"product": self.hr.pk, "name": "Staff plan", "price": "5.00"}, format="json"
        )
        self.assertEqual(created.status_code, 201)
        edited = self.client.patch(plan_url(created.data["id"]), {"price": "6.00"}, format="json")
        self.assertEqual(edited.status_code, 200)
        deleted = self.client.delete(plan_url(created.data["id"]))
        self.assertEqual(deleted.status_code, 403)


class CatalogAccessTests(CatalogTestBase):
    def test_unauthenticated_requests_rejected(self):
        self.assertEqual(self.client.get(PRODUCTS).status_code, 401)
        self.assertEqual(self.client.get(PLANS).status_code, 401)
        self.assertEqual(self.client.get(OPTIONS).status_code, 401)

    def test_customer_role_cannot_access_products_or_plans(self):
        self.login_as(self.customer_user)
        self.assertEqual(self.client.get(PRODUCTS).status_code, 403)
        self.assertEqual(self.client.post(PRODUCTS, {"name": "Sneaky"}, format="json").status_code, 403)
        self.assertEqual(self.client.get(product_url(self.crm.pk)).status_code, 403)
        self.assertEqual(self.client.get(PLANS).status_code, 403)
        self.assertEqual(self.client.get(plan_url(self.pro_monthly.pk)).status_code, 403)
        self.assertEqual(self.client.get(OPTIONS).status_code, 403)
        self.assertFalse(Product.objects.filter(name="Sneaky").exists())

    def test_customer_cannot_edit_plan(self):
        self.login_as(self.customer_user)
        response = self.client.patch(plan_url(self.pro_monthly.pk), {"price": "1.00"}, format="json")
        self.assertEqual(response.status_code, 403)
        self.pro_monthly.refresh_from_db()
        self.assertEqual(str(self.pro_monthly.price), "499.00")


class CatalogDatabaseTests(CatalogTestBase):
    def test_database_blocks_zero_price(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Plan.objects.create(product=self.crm, name="Free", price="0.00")

    def test_database_blocks_case_variant_duplicate_product_name(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Product.objects.create(name="BREVORA crm")

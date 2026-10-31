from django.db import IntegrityError, transaction
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from accounts.models import User

from .models import Customer

PASSWORD = "Str0ng-Berry-Pass!"
LIST_URL = "/api/customers/"
LINKABLE_URL = "/api/customers/linkable-users/"


def detail_url(pk):
    return f"/api/customers/{pk}/"


class CustomerApiTestBase(APITestCase):
    def setUp(self):
        self.admin = self._user("admin@x.com", User.Role.ADMIN)
        self.staff = self._user("staff@x.com", User.Role.STAFF)
        self.customer_user = self._user("ana-login@x.com", User.Role.CUSTOMER)
        self.other_user = self._user("bo-login@x.com", User.Role.CUSTOMER)
        self.free_user = self._user("free-login@x.com", User.Role.CUSTOMER)

        self.own_record = Customer.objects.create(
            name="Ana Patel", email="ana@x.com", company="Patel Foods", user=self.customer_user
        )
        self.other_record = Customer.objects.create(
            name="Bo Chen", email="bo@x.com", company="Chen Ltd", user=self.other_user
        )
        self.unlinked = Customer.objects.create(
            name="Cy Dean", email="cy@x.com", status=Customer.Status.INACTIVE
        )

    def _user(self, email, role):
        return User.objects.create_user(
            username=email, email=email, password=PASSWORD, role=role
        )

    def login_as(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")


class CustomerCreateValidationTests(CustomerApiTestBase):
    def test_admin_can_create_customer_and_email_is_lowercased(self):
        self.login_as(self.admin)
        response = self.client.post(
            LIST_URL,
            {"name": "Dee Rao", "email": "Dee@Example.com", "company": "Rao Ltd"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["email"], "dee@example.com")
        self.assertEqual(response.data["status"], "active")
        self.assertTrue(Customer.objects.filter(email="dee@example.com").exists())

    def test_staff_can_create_customer(self):
        self.login_as(self.staff)
        response = self.client.post(
            LIST_URL, {"name": "Eve Stone", "email": "eve@example.com"}, format="json"
        )
        self.assertEqual(response.status_code, 201)

    def test_duplicate_email_is_rejected_regardless_of_case(self):
        self.login_as(self.admin)
        response = self.client.post(
            LIST_URL, {"name": "Copy", "email": "ANA@x.com"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)

    def test_invalid_email_is_rejected(self):
        self.login_as(self.admin)
        response = self.client.post(
            LIST_URL, {"name": "Bad", "email": "not-an-email"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)

    def test_name_is_required(self):
        self.login_as(self.admin)
        response = self.client.post(LIST_URL, {"email": "noname@example.com"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("name", response.data)

    def test_unknown_status_is_rejected(self):
        self.login_as(self.admin)
        response = self.client.post(
            LIST_URL,
            {"name": "Odd", "email": "odd@example.com", "status": "retired"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("status", response.data)

    def test_admin_can_edit_customer_keeping_own_email(self):
        self.login_as(self.admin)
        response = self.client.patch(
            detail_url(self.unlinked.pk), {"name": "Cyrus Dean", "email": "cy@x.com"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.unlinked.refresh_from_db()
        self.assertEqual(self.unlinked.name, "Cyrus Dean")

    def test_editing_to_another_customers_email_is_rejected(self):
        self.login_as(self.admin)
        response = self.client.patch(
            detail_url(self.unlinked.pk), {"email": "ANA@x.com"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)


class CustomerAccessTests(CustomerApiTestBase):
    def test_unauthenticated_request_is_rejected(self):
        response = self.client.get(LIST_URL)
        self.assertEqual(response.status_code, 401)

    def test_customer_role_cannot_list_customers(self):
        self.login_as(self.customer_user)
        response = self.client.get(LIST_URL)
        self.assertEqual(response.status_code, 403)

    def test_customer_role_cannot_create_customers(self):
        self.login_as(self.customer_user)
        response = self.client.post(
            LIST_URL, {"name": "Sneaky", "email": "sneaky@example.com"}, format="json"
        )
        self.assertEqual(response.status_code, 403)
        self.assertFalse(Customer.objects.filter(email="sneaky@example.com").exists())

    def test_customer_can_view_own_record(self):
        self.login_as(self.customer_user)
        response = self.client.get(detail_url(self.own_record.pk))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["email"], "ana@x.com")

    def test_customer_cannot_view_another_customers_record(self):
        self.login_as(self.customer_user)
        response = self.client.get(detail_url(self.other_record.pk))
        self.assertEqual(response.status_code, 404)

    def test_customer_cannot_view_unlinked_record(self):
        self.login_as(self.customer_user)
        response = self.client.get(detail_url(self.unlinked.pk))
        self.assertEqual(response.status_code, 404)

    def test_customer_cannot_edit_own_record(self):
        self.login_as(self.customer_user)
        response = self.client.patch(
            detail_url(self.own_record.pk), {"name": "Changed"}, format="json"
        )
        self.assertEqual(response.status_code, 403)
        self.own_record.refresh_from_db()
        self.assertEqual(self.own_record.name, "Ana Patel")

    def test_customer_cannot_delete_own_record(self):
        self.login_as(self.customer_user)
        response = self.client.delete(detail_url(self.own_record.pk))
        self.assertEqual(response.status_code, 403)
        self.assertTrue(Customer.objects.filter(pk=self.own_record.pk).exists())

    def test_staff_can_view_and_edit_any_customer(self):
        self.login_as(self.staff)
        self.assertEqual(self.client.get(detail_url(self.other_record.pk)).status_code, 200)
        response = self.client.patch(
            detail_url(self.other_record.pk), {"phone": "+91 99999 00000"}, format="json"
        )
        self.assertEqual(response.status_code, 200)

    def test_staff_cannot_delete_customers(self):
        self.login_as(self.staff)
        response = self.client.delete(detail_url(self.unlinked.pk))
        self.assertEqual(response.status_code, 403)
        self.assertTrue(Customer.objects.filter(pk=self.unlinked.pk).exists())

    def test_admin_can_delete_customers(self):
        self.login_as(self.admin)
        response = self.client.delete(detail_url(self.unlinked.pk))
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Customer.objects.filter(pk=self.unlinked.pk).exists())


class CustomerListTests(CustomerApiTestBase):
    def test_admin_list_is_paginated_and_shows_all_customers(self):
        self.login_as(self.admin)
        response = self.client.get(LIST_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 3)
        self.assertEqual(len(response.data["results"]), 3)
        self.assertIn("next", response.data)
        self.assertIn("previous", response.data)

    def test_search_matches_name(self):
        self.login_as(self.admin)
        response = self.client.get(LIST_URL, {"search": "ana"})
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "Ana Patel")

    def test_search_matches_company(self):
        self.login_as(self.admin)
        response = self.client.get(LIST_URL, {"search": "chen ltd"})
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["email"], "bo@x.com")

    def test_status_filter(self):
        self.login_as(self.admin)
        response = self.client.get(LIST_URL, {"status": "inactive"})
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "Cy Dean")

    def test_unknown_status_filter_is_rejected(self):
        self.login_as(self.admin)
        response = self.client.get(LIST_URL, {"status": "bogus"})
        self.assertEqual(response.status_code, 400)

    def test_detail_shows_linked_login_email(self):
        self.login_as(self.admin)
        response = self.client.get(detail_url(self.own_record.pk))
        self.assertEqual(response.data["user"], self.customer_user.pk)
        self.assertEqual(response.data["user_email"], "ana-login@x.com")


class CustomerLinkingTests(CustomerApiTestBase):
    def test_can_link_a_customer_role_login(self):
        self.login_as(self.admin)
        response = self.client.patch(
            detail_url(self.unlinked.pk), {"user": self.free_user.pk}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.unlinked.refresh_from_db()
        self.assertEqual(self.unlinked.user_id, self.free_user.pk)

    def test_cannot_link_an_admin_or_staff_account(self):
        self.login_as(self.admin)
        response = self.client.patch(
            detail_url(self.unlinked.pk), {"user": self.staff.pk}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("user", response.data)

    def test_login_cannot_be_linked_to_two_customers(self):
        self.login_as(self.admin)
        response = self.client.patch(
            detail_url(self.unlinked.pk), {"user": self.customer_user.pk}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("user", response.data)

    def test_linkable_users_lists_only_unlinked_customer_logins(self):
        self.login_as(self.admin)
        response = self.client.get(LINKABLE_URL)
        self.assertEqual(response.status_code, 200)
        emails = [row["email"] for row in response.data]
        self.assertIn("free-login@x.com", emails)
        self.assertNotIn("ana-login@x.com", emails)
        self.assertNotIn("admin@x.com", emails)

    def test_linkable_users_forbidden_for_customer_role(self):
        self.login_as(self.customer_user)
        response = self.client.get(LINKABLE_URL)
        self.assertEqual(response.status_code, 403)


class CustomerModelConstraintTests(CustomerApiTestBase):
    def test_database_blocks_case_variant_duplicate_email(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Customer.objects.create(name="Dup", email="ANA@X.COM")

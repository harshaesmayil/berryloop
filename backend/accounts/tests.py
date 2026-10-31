from django.test import RequestFactory, TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .models import User
from .permissions import IsAdminRole

STRONG_PASSWORD = "Str0ng-Berry-Pass!"


class AuthApiTests(APITestCase):
    def test_register_creates_customer_and_returns_token(self):
        response = self.client.post(
            "/api/auth/register/",
            {"email": "Test@Example.com", "password": STRONG_PASSWORD, "first_name": "Ana"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email="test@example.com")
        self.assertEqual(user.role, User.Role.CUSTOMER)
        self.assertIn("token", response.data)

    def test_duplicate_email_is_rejected(self):
        User.objects.create_user(username="a@x.com", email="a@x.com", password=STRONG_PASSWORD)
        response = self.client.post(
            "/api/auth/register/",
            {"email": "A@x.com", "password": STRONG_PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)

    def test_weak_password_is_rejected(self):
        response = self.client.post(
            "/api/auth/register/",
            {"email": "weak@example.com", "password": "123"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.data)

    def test_login_success_returns_token(self):
        User.objects.create_user(username="b@x.com", email="b@x.com", password=STRONG_PASSWORD)
        response = self.client.post(
            "/api/auth/login/", {"email": "b@x.com", "password": STRONG_PASSWORD}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("token", response.data)

    def test_login_wrong_password_is_rejected_with_generic_message(self):
        User.objects.create_user(username="c@x.com", email="c@x.com", password=STRONG_PASSWORD)
        response = self.client.post(
            "/api/auth/login/", {"email": "c@x.com", "password": "wrong-password-1"}, format="json"
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["detail"], "Invalid email or password.")

    def test_profile_requires_token(self):
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, 401)

    def test_profile_returns_own_user(self):
        user = User.objects.create_user(username="d@x.com", email="d@x.com", password=STRONG_PASSWORD)
        token = Token.objects.create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["email"], "d@x.com")

    def test_customer_cannot_change_own_role(self):
        user = User.objects.create_user(username="e@x.com", email="e@x.com", password=STRONG_PASSWORD)
        token = Token.objects.create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        self.client.patch("/api/auth/me/", {"role": "admin"}, format="json")
        user.refresh_from_db()
        self.assertEqual(user.role, User.Role.CUSTOMER)

    def test_logout_invalidates_token(self):
        user = User.objects.create_user(username="f@x.com", email="f@x.com", password=STRONG_PASSWORD)
        token = Token.objects.create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        self.assertEqual(self.client.post("/api/auth/logout/").status_code, 204)
        self.assertFalse(Token.objects.filter(key=token.key).exists())


class PermissionTests(TestCase):
    def test_customer_fails_admin_permission(self):
        customer = User.objects.create_user(
            username="g@x.com", email="g@x.com", password=STRONG_PASSWORD, role=User.Role.CUSTOMER
        )
        request = RequestFactory().get("/")
        request.user = customer
        self.assertFalse(IsAdminRole().has_permission(request, None))

    def test_admin_passes_admin_permission(self):
        admin_user = User.objects.create_user(
            username="h@x.com", email="h@x.com", password=STRONG_PASSWORD, role=User.Role.ADMIN
        )
        request = RequestFactory().get("/")
        request.user = admin_user
        self.assertTrue(IsAdminRole().has_permission(request, None))

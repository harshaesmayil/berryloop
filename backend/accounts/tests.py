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


class PasswordPolicyAndStaffTests(TestCase):
    def test_password_needs_upper_lower_and_special_character(self):
        from rest_framework.test import APIClient
        client = APIClient()
        for weak in ["alllowercase1!", "ALLUPPERCASE1!", "NoSpecialChar1", "Short1!"]:
            response = client.post(
                "/api/auth/register/", {"email": f"p{len(weak)}@x.com", "password": weak}, format="json"
            )
            self.assertEqual(response.status_code, 400, weak)
            self.assertIn("password", response.data)

    def test_only_admin_can_create_staff(self):
        from rest_framework.authtoken.models import Token
        from rest_framework.test import APIClient
        staff = User.objects.create_user(username="st@x.com", email="st@x.com", password=STRONG_PASSWORD, role="staff")
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {Token.objects.get_or_create(user=staff)[0].key}")
        body = {"email": "new@x.com", "password": STRONG_PASSWORD, "first_name": "New"}
        self.assertEqual(client.post("/api/auth/staff/", body, format="json").status_code, 403)
        admin = User.objects.create_user(username="ad@x.com", email="ad@x.com", password=STRONG_PASSWORD, role="admin")
        client.credentials(HTTP_AUTHORIZATION=f"Token {Token.objects.get_or_create(user=admin)[0].key}")
        response = client.post("/api/auth/staff/", body, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["role"], "staff")

    def test_password_reset_request_gives_same_answer_for_unknown_email(self):
        from rest_framework.test import APIClient
        response = APIClient().post("/api/auth/password-reset/", {"email": "nobody@x.com"}, format="json")
        self.assertEqual(response.status_code, 200)

    def test_password_reset_confirm_sets_new_password(self):
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode
        from rest_framework.test import APIClient
        user = User.objects.create_user(username="r@x.com", email="r@x.com", password=STRONG_PASSWORD)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        client = APIClient()
        bad = client.post("/api/auth/password-reset/confirm/", {"uid": uid, "token": "bad", "password": "New-Pass-1!x"}, format="json")
        self.assertEqual(bad.status_code, 400)
        ok = client.post("/api/auth/password-reset/confirm/", {"uid": uid, "token": token, "password": "New-Pass-1!x"}, format="json")
        self.assertEqual(ok.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.check_password("New-Pass-1!x"))

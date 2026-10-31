from django.contrib import admin
from django.urls import include, path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    """Simple check used by the frontend to confirm the API is reachable."""
    return Response({"status": "ok", "service": "berryloop-api"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health, name="health"),
    path("api/auth/", include("accounts.urls")),
    path("api/customers/", include("customers.urls")),
    path("api/", include("products.urls")),
    path("api/", include("subscriptions.urls")),
]

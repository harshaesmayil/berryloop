from django.urls import path

from . import views

urlpatterns = [
    path("products/", views.ProductListCreateView.as_view(), name="product-list"),
    path("products/options/", views.ProductOptionsView.as_view(), name="product-options"),
    path("products/<int:pk>/", views.ProductDetailView.as_view(), name="product-detail"),
    path("plans/", views.PlanListCreateView.as_view(), name="plan-list"),
    path("plans/<int:pk>/", views.PlanDetailView.as_view(), name="plan-detail"),
]

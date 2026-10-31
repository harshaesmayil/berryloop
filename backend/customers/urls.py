from django.urls import path

from . import views

urlpatterns = [
    path("", views.CustomerListCreateView.as_view(), name="customer-list"),
    path("linkable-users/", views.LinkableUserListView.as_view(), name="customer-linkable-users"),
    path("<int:pk>/", views.CustomerDetailView.as_view(), name="customer-detail"),
]

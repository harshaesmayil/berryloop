from django.urls import path

from . import views

urlpatterns = [
    path("subscriptions/", views.SubscriptionListCreateView.as_view(), name="subscription-list"),
    path("subscriptions/<int:pk>/", views.SubscriptionDetailView.as_view(), name="subscription-detail"),
    path("invoices/", views.InvoiceListCreateView.as_view(), name="invoice-list"),
    path("invoices/<int:pk>/", views.InvoiceDetailView.as_view(), name="invoice-detail"),
    path("invoices/<int:pk>/mark-paid/", views.InvoiceMarkPaidView.as_view(), name="invoice-mark-paid"),
    path("payments/", views.PaymentListCreateView.as_view(), name="payment-list"),
    path("dashboard/summary/", views.DashboardSummaryView.as_view(), name="dashboard-summary"),
]

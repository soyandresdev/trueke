from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path("auth/otp/request/", views.OtpRequestView.as_view(), name="otp-request"),
    path("auth/otp/verify/", views.OtpVerifyView.as_view(), name="otp-verify"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("me/", views.MeView.as_view(), name="me"),
    path("me/documents/", views.MyDocumentsView.as_view(), name="me-documents"),
    path("me/documents/<slug:kind>/", views.MyDocumentFileView.as_view(), name="me-document-file"),
    path("users/<int:pk>/", views.SellerDetailView.as_view(), name="user-detail"),
    path(
        "users/<int:pk>/documents/<slug:kind>/",
        views.SellerDocumentFileView.as_view(),
        name="user-document-file",
    ),
]

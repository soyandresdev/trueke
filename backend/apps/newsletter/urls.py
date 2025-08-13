from django.urls import path

from . import views

urlpatterns = [
    path("newsletter/subscribe/", views.SubscribeView.as_view(), name="newsletter-subscribe"),
    path("newsletter/unsubscribe/", views.UnsubscribeView.as_view(), name="newsletter-unsubscribe"),
]

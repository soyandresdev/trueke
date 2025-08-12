from django.urls import path

from . import views

urlpatterns = [
    path("listings/<int:listing_id>/messages/", views.MessageListView.as_view(), name="message-list"),
    path("listings/<int:listing_id>/messages/read/", views.MarkReadView.as_view(), name="message-read"),
    path(
        "listings/<int:listing_id>/messages/<int:pk>/attachment/",
        views.MessageAttachmentView.as_view(),
        name="message-attachment",
    ),
]

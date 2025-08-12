from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema, inline_serializer
from rest_framework import generics, parsers, serializers, status
from rest_framework.pagination import CursorPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.views import serve_private_file
from apps.listings.queries import visible_listings
from apps.realtime.broadcast import broadcast

from .models import Message
from .serializers import MessageSerializer


def from_platform(user, listing) -> bool:
    """Quien no es el vendedor escribe como plataforma (solo los operadores ven publicaciones ajenas)."""
    return user.pk != listing.seller_id


class ListingChatMixin:
    def get_listing(self):
        if not hasattr(self, "_listing"):
            self._listing = get_object_or_404(
                visible_listings(self.request.user), pk=self.kwargs["listing_id"]
            )
        return self._listing


class MessagePagination(CursorPagination):
    ordering = ("-created_at", "-id")
    page_size = 30


class MessageListView(ListingChatMixin, generics.ListCreateAPIView):
    """Mensajes de la publicación, del más nuevo al más viejo. Enviar: JSON o multipart con adjunto."""

    serializer_class = MessageSerializer
    pagination_class = MessagePagination
    parser_classes = [parsers.JSONParser, parsers.MultiPartParser]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Message.objects.none()
        return self.get_listing().messages.select_related("sender")

    def perform_create(self, serializer):
        listing = self.get_listing()
        message = serializer.save(
            listing=listing, sender=self.request.user, from_platform=from_platform(self.request.user, listing)
        )
        broadcast(f"listing.{listing.pk}", "message.created", MessageSerializer(message).data)


class MarkReadView(ListingChatMixin, APIView):
    """Marca como leídos los mensajes del otro lado."""

    @extend_schema(
        request=None, responses={200: inline_serializer("MarkRead", {"updated": serializers.IntegerField()})}
    )
    def post(self, request, listing_id):
        listing = self.get_listing()
        now = timezone.now()
        platform = from_platform(request.user, listing)
        updated = listing.messages.filter(from_platform=not platform, read_at__isnull=True).update(
            read_at=now
        )
        if updated:
            broadcast(
                f"listing.{listing.pk}",
                "message.read",
                {"listing": listing.pk, "from_platform": not platform, "read_at": now.isoformat()},
            )
        return Response({"updated": updated}, status=status.HTTP_200_OK)


class MessageAttachmentView(ListingChatMixin, APIView):
    @extend_schema(responses={(200, "application/octet-stream"): OpenApiResponse(description="Archivo")})
    def get(self, request, listing_id, pk):
        message = get_object_or_404(self.get_listing().messages, pk=pk)
        return serve_private_file(message.attachment)

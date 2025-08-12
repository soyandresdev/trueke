from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.realtime.broadcast import broadcast

from .models import Notification
from .serializers import NotificationSerializer

CountSerializer = inline_serializer("NotificationCount", {"count": serializers.IntegerField()})
UpdatedSerializer = inline_serializer("NotificationsSeen", {"updated": serializers.IntegerField()})


@extend_schema(
    parameters=[OpenApiParameter("unseen", bool, description="Solo las no vistas")], methods=["GET"]
)
class NotificationViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Notification.objects.none()
        qs = Notification.objects.filter(user=self.request.user).select_related("listing", "actor")
        if self.action == "list" and self.request.query_params.get("unseen") in ("1", "true"):
            qs = qs.filter(seen_at__isnull=True)
        return qs

    @extend_schema(responses={200: CountSerializer})
    @action(detail=False, methods=["get"], url_path="unseen-count")
    def unseen_count(self, request):
        return Response({"count": self.get_queryset().filter(seen_at__isnull=True).count()})

    @extend_schema(request=None, responses={200: UpdatedSerializer})
    @action(detail=False, methods=["post"], url_path="seen-all")
    def seen_all(self, request):
        """Marca todas como vistas (la campana)."""
        return self._mark(self.get_queryset())

    @extend_schema(request=None, responses={200: UpdatedSerializer})
    @action(detail=True, methods=["post"])
    def seen(self, request, pk=None):
        return self._mark(self.get_queryset().filter(pk=pk))

    def _mark(self, qs):
        now = timezone.now()
        ids = list(qs.filter(seen_at__isnull=True).values_list("pk", flat=True))
        Notification.objects.filter(pk__in=ids).update(seen_at=now)
        if ids:
            # Sincroniza las otras pestañas o dispositivos del usuario.
            broadcast(
                f"user.{self.request.user.pk}", "notification.seen", {"ids": ids, "seen_at": now.isoformat()}
            )
        return Response({"updated": len(ids)})

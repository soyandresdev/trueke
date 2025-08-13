from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import Subscriber


class SubscribeSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)


class UnsubscribeSerializer(serializers.Serializer):
    token = serializers.UUIDField()


class PublicView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "newsletter"


class SubscribeView(PublicView):
    """Suscribe un email. Responde igual exista o no, para no revelar quién está suscrito."""

    @extend_schema(request=SubscribeSerializer, responses={202: OpenApiResponse(description="Recibido")})
    def post(self, request):
        serializer = SubscribeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()
        subscriber, created = Subscriber.objects.get_or_create(
            email=email, defaults={"language": request.LANGUAGE_CODE[:2]}
        )
        if not created and subscriber.unsubscribed_at:
            subscriber.unsubscribed_at = None
            subscriber.save(update_fields=["unsubscribed_at"])
        return Response(status=status.HTTP_202_ACCEPTED)


class UnsubscribeView(PublicView):
    @extend_schema(request=UnsubscribeSerializer, responses={204: None})
    def post(self, request):
        serializer = UnsubscribeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        Subscriber.objects.filter(
            token=serializer.validated_data["token"], unsubscribed_at__isnull=True
        ).update(unsubscribed_at=timezone.now())
        return Response(status=status.HTTP_204_NO_CONTENT)

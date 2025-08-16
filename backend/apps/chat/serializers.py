from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.listings.serializers import SellerSerializer

from .models import Message


class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.SerializerMethodField()
    attachment_url = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "listing",
            "sender",
            "from_platform",
            "text",
            "attachment",
            "attachment_kind",
            "attachment_url",
            "created_at",
            "read_at",
        ]
        read_only_fields = ["listing", "from_platform", "attachment_kind", "created_at", "read_at"]
        # Sin declarar el campo a mano: así se conservan los validadores del modelo (tipo y tamaño).
        extra_kwargs = {"attachment": {"write_only": True}}

    @extend_schema_field(SellerSerializer(allow_null=True))
    def get_sender(self, message):
        if message.sender is None:
            return None
        return {"id": message.sender_id, "name": message.sender.get_full_name()}

    def get_attachment_url(self, message) -> str | None:
        if not message.attachment:
            return None
        # Ruta de la API (con permisos), nunca la URL del almacenamiento.
        return reverse("message-attachment", args=[message.listing_id, message.pk])

    def validate(self, attrs):
        attrs["text"] = attrs.get("text", "").strip()
        if not attrs["text"] and not attrs.get("attachment"):
            raise serializers.ValidationError({"text": _("Escribe un mensaje o adjunta un archivo.")})
        return attrs

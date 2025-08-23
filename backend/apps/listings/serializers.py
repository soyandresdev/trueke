from django.conf import settings
from django.db.models import Count
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.accounts.files import validate_private_file

from . import transitions
from .models import Category, Listing, ListingEvent, ListingImage
from .queries import unread_filter
from .schema import attribute_errors


class CategorySerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="display_name")

    class Meta:
        model = Category
        fields = ["id", "code", "name", "fields_schema"]


class ListingImageSerializer(serializers.ModelSerializer):
    thumbnail = serializers.SerializerMethodField()

    class Meta:
        model = ListingImage
        fields = ["id", "image", "thumbnail", "position"]
        extra_kwargs = {"position": {"required": False}}

    @extend_schema_field(serializers.URLField())
    def get_thumbnail(self, image) -> str:
        # Las fotos anteriores a la optimización no tienen miniatura: se usa la grande.
        field = image.thumbnail or image.image
        request = self.context.get("request")
        return request.build_absolute_uri(field.url) if request else field.url


class SellerSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField(source="get_full_name")


class ListingSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.filter(is_active=True))
    seller = SellerSerializer(read_only=True)
    images = ListingImageSerializer(many=True, read_only=True)
    terms_accepted = serializers.BooleanField(write_only=True, required=False)
    available_actions = serializers.SerializerMethodField()
    unread_messages = serializers.SerializerMethodField()
    has_payment_receipt = serializers.SerializerMethodField()
    counters_left = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = [
            "id",
            "seller",
            "category",
            "title",
            "description",
            "condition",
            "attributes",
            "city",
            "pickup_address",
            "is_original",
            "terms_accepted",
            "terms_accepted_at",
            "images",
            "status",
            "status_changed_at",
            "offer_amount",
            "offer_currency",
            "counter_amount",
            "counters_left",
            "pickup_by",
            "pickup_date",
            "pickup_notes",
            "cancel_reason",
            "paid_amount",
            "paid_at",
            "payment_reference",
            "has_payment_receipt",
            "available_actions",
            "unread_messages",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "terms_accepted_at",
            "status",
            "status_changed_at",
            "offer_amount",
            "offer_currency",
            "counter_amount",
            "pickup_by",
            "pickup_date",
            "pickup_notes",
            "cancel_reason",
            "paid_amount",
            "paid_at",
            "payment_reference",
            "created_at",
            "updated_at",
        ]

    @extend_schema_field(serializers.ListField(child=serializers.ChoiceField(transitions.USER_ACTIONS)))
    def get_available_actions(self, listing):
        return transitions.available(listing, self.context["request"].user)

    def get_counters_left(self, listing) -> int:
        return transitions.counters_left(listing)

    def get_has_payment_receipt(self, listing) -> bool:
        return bool(listing.payment_receipt)

    def get_unread_messages(self, listing) -> int:
        if hasattr(listing, "unread_messages"):
            return listing.unread_messages
        user = self.context["request"].user
        return Listing.objects.filter(pk=listing.pk).aggregate(
            n=Count("messages", filter=unread_filter(user))
        )["n"]

    def validate(self, attrs):
        if self.instance is None and not attrs.pop("terms_accepted", False):
            raise serializers.ValidationError({"terms_accepted": _("Debes aceptar los términos.")})
        attrs.pop("terms_accepted", None)

        category = attrs.get("category") or self.instance.category
        attributes = attrs.get("attributes", self.instance.attributes if self.instance else {})
        # Si cambia la categoría, los campos extra se vuelven a validar contra el nuevo esquema.
        if "category" in attrs or "attributes" in attrs:
            errors = attribute_errors(category.fields_schema, attributes)
            if errors:
                raise serializers.ValidationError({"attributes": errors})
        return attrs

    def create(self, validated_data):
        validated_data["terms_accepted_at"] = timezone.now()
        return super().create(validated_data)


OFFER_ROW_FIELDS = [
    "id",
    "title",
    "seller",
    "category",
    "city",
    "status",
    "offer_amount",
    "counter_amount",
    "paid_amount",
    "offer_currency",
    "payment_reference",
    "created_at",
    "offered_at",
    "accepted_at",
    "paid_at",
]


class OfferRowSerializer(serializers.ModelSerializer):
    """Una fila de la tabla de ofertas del operador."""

    seller = SellerSerializer(read_only=True)
    category = serializers.CharField(source="category.display_name", read_only=True)
    offered_at = serializers.DateTimeField(read_only=True)
    accepted_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Listing
        fields = OFFER_ROW_FIELDS
        read_only_fields = OFFER_ROW_FIELDS


class QueueSerializer(serializers.Serializer):
    """Cuántas publicaciones esperan una acción del operador."""

    unoffered = serializers.IntegerField()
    countered = serializers.IntegerField()
    pickups_today = serializers.IntegerField()
    unpaid = serializers.IntegerField()
    oldest_waiting_days = serializers.IntegerField(allow_null=True)


class FunnelSerializer(serializers.Serializer):
    """De las publicaciones creadas en la ventana, cuántas llegaron a cada paso."""

    created = serializers.IntegerField()
    offered = serializers.IntegerField()
    accepted = serializers.IntegerField()
    picked_up = serializers.IntegerField()
    completed = serializers.IntegerField()
    paid = serializers.IntegerField()


class PeriodSerializer(serializers.Serializer):
    created = serializers.IntegerField()
    offered = serializers.IntegerField()
    accepted = serializers.IntegerField()
    acceptance_rate = serializers.FloatField(allow_null=True)
    paid_count = serializers.IntegerField()
    paid_total = serializers.DecimalField(max_digits=14, decimal_places=2)
    average_paid = serializers.DecimalField(max_digits=14, decimal_places=2, allow_null=True)
    offered_total = serializers.DecimalField(max_digits=14, decimal_places=2)
    hours_to_offer = serializers.FloatField(allow_null=True)


class DashboardSerializer(serializers.Serializer):
    days = serializers.IntegerField()
    queue = QueueSerializer()
    funnel = FunnelSerializer()
    period = PeriodSerializer()


class ListingEventSerializer(serializers.ModelSerializer):
    actor = SellerSerializer(read_only=True)

    class Meta:
        model = ListingEvent
        fields = ["id", "action", "from_status", "to_status", "actor", "data", "created_at"]


# Datos de cada transición.


class OfferSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=1)
    currency = serializers.CharField(max_length=3, default=settings.LISTING_CURRENCY)


class PickupSerializer(serializers.Serializer):
    pickup_by = serializers.ChoiceField(Listing.PickupBy)
    pickup_date = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True)


class CounterSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=1)


class PaySerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=1)
    paid_at = serializers.DateField(required=False, allow_null=True)
    reference = serializers.CharField(max_length=80, required=False, allow_blank=True)
    receipt = serializers.FileField(required=False, validators=[validate_private_file])


class ReasonSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)


class EmptySerializer(serializers.Serializer):
    pass

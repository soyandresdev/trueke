from django.conf import settings
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from . import transitions
from .models import Category, Listing, ListingEvent, ListingImage
from .schema import attribute_errors


class CategorySerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="display_name")

    class Meta:
        model = Category
        fields = ["id", "code", "name", "fields_schema"]


class ListingImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingImage
        fields = ["id", "image", "position"]
        extra_kwargs = {"position": {"required": False}}


class SellerSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField(source="get_full_name")


class ListingSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.filter(is_active=True))
    seller = SellerSerializer(read_only=True)
    images = ListingImageSerializer(many=True, read_only=True)
    terms_accepted = serializers.BooleanField(write_only=True, required=False)
    available_actions = serializers.SerializerMethodField()

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
            "pickup_by",
            "pickup_date",
            "pickup_notes",
            "cancel_reason",
            "available_actions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "terms_accepted_at",
            "status",
            "status_changed_at",
            "offer_amount",
            "offer_currency",
            "pickup_by",
            "pickup_date",
            "pickup_notes",
            "cancel_reason",
            "created_at",
            "updated_at",
        ]

    @extend_schema_field(serializers.ListField(child=serializers.ChoiceField(list(transitions.TRANSITIONS))))
    def get_available_actions(self, listing):
        return transitions.available(listing, self.context["request"].user)

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


class ReasonSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)


class EmptySerializer(serializers.Serializer):
    pass

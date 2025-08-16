from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.listings.models import Listing
from apps.listings.serializers import SellerSerializer

from .models import Notification


class NotificationListingSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    status = serializers.ChoiceField(Listing.Status)


class NotificationSerializer(serializers.ModelSerializer):
    listing = serializers.SerializerMethodField()
    actor = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ["id", "kind", "listing", "actor", "data", "created_at", "seen_at"]

    @extend_schema_field(NotificationListingSerializer(allow_null=True))
    def get_listing(self, n):
        if n.listing is None:
            return None
        return {"id": n.listing_id, "title": n.listing.title, "status": n.listing.status}

    @extend_schema_field(SellerSerializer(allow_null=True))
    def get_actor(self, n):
        if n.actor is None:
            return None
        return {"id": n.actor_id, "name": n.actor.get_full_name()}

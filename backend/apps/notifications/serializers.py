from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    listing = serializers.SerializerMethodField()
    actor = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ["id", "kind", "listing", "actor", "data", "created_at", "seen_at"]

    def get_listing(self, n) -> dict | None:
        if n.listing is None:
            return None
        return {"id": n.listing_id, "title": n.listing.title, "status": n.listing.status}

    def get_actor(self, n) -> dict | None:
        if n.actor is None:
            return None
        return {"id": n.actor_id, "name": n.actor.get_full_name()}

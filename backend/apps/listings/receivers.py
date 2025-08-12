from django.dispatch import receiver

from apps.realtime.broadcast import broadcast

from .transitions import listing_transitioned


@receiver(listing_transitioned)
def push_status_change(sender, listing, event, **kwargs):
    broadcast(
        f"listing.{listing.pk}",
        "listing.status",
        {"listing": listing.pk, "action": event.action, "status": listing.status, "event": event.pk},
    )

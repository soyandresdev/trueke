from celery import shared_task

from apps.chat.models import Message
from apps.listings.models import ListingEvent

from . import services


@shared_task
def notify_listing_event(event_id: int):
    event = ListingEvent.objects.select_related("listing__seller", "actor").filter(pk=event_id).first()
    if event is not None:
        services.notify_listing_event(event)


@shared_task
def notify_message(message_id: int):
    message = Message.objects.select_related("listing__seller", "sender").filter(pk=message_id).first()
    if message is not None:
        services.notify_message(message)

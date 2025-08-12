from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.chat.models import Message
from apps.listings.transitions import listing_transitioned

from . import tasks


@receiver(listing_transitioned)
def on_listing_event(sender, listing, event, **kwargs):
    # La señal ya llega después del commit.
    tasks.notify_listing_event.delay(event.pk)


@receiver(post_save, sender=Message)
def on_message(sender, instance, created, **kwargs):
    if created:
        transaction.on_commit(lambda: tasks.notify_message.delay(instance.pk))

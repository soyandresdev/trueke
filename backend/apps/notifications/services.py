"""Quién recibe cada aviso y cómo se entrega.

Regla general: avisa al otro lado de quien actuó. Si actuó el vendedor, a todos los operadores
activos; si actuó la plataforma, al vendedor.
"""

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.realtime.broadcast import broadcast

from .models import Notification
from .serializers import NotificationSerializer


def other_side(listing, actor) -> list:
    if actor is not None and actor.pk == listing.seller_id:
        return list(
            User.objects.filter(role=User.Role.OPERATOR, is_active=True).exclude(pk=listing.seller_id)
        )
    return [listing.seller]


def push(notification: Notification) -> None:
    broadcast(
        f"user.{notification.user_id}", "notification.created", NotificationSerializer(notification).data
    )


def notify_listing_event(event) -> list[Notification]:
    listing = event.listing
    now = timezone.now()
    data = {"status": event.to_status, **event.data}
    with transaction.atomic():
        created = Notification.objects.bulk_create(
            Notification(
                user=user,
                kind=f"listing.{event.action}",
                listing=listing,
                actor=event.actor,
                data=data,
                created_at=now,
            )
            for user in other_side(listing, event.actor)
        )
        for notification in created:
            push(notification)
    return created


def notify_message(message) -> list[Notification]:
    """Un aviso sin ver por publicación: los mensajes seguidos suben `count` en vez de apilar avisos."""
    listing = message.listing
    now = timezone.now()
    result = []
    with transaction.atomic():
        for user in other_side(listing, message.sender):
            notification = (
                Notification.objects.select_for_update()
                .filter(user=user, listing=listing, kind=Notification.Kind.MESSAGE_NEW, seen_at__isnull=True)
                .first()
            )
            if notification is None:
                notification = Notification(user=user, listing=listing, kind=Notification.Kind.MESSAGE_NEW)
            notification.actor = message.sender
            notification.created_at = now
            notification.data = {"count": notification.data.get("count", 0) + 1, "message": message.pk}
            notification.save()
            push(notification)
            result.append(notification)
    return result

"""Lo que la plataforma hace sola: recordar lo que lleva mucho tiempo parado y vencer las ofertas.

Corre una vez por hora (`CELERY_BEAT_SCHEDULE`). Cada publicación avisa una sola vez por espera:
`reminded_at` se guarda al avisar y cada transición lo borra.
"""

from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.db.models import Q
from django.utils import timezone

from apps.notifications.models import Notification
from apps.notifications.services import notify_reminder, operators

from . import transitions
from .models import Listing

WAITING_OFFER = Q(status=Listing.Status.OFFERED) | Q(status=Listing.Status.COUNTERED)


def _pending(condition, since):
    return Listing.objects.filter(condition, status_changed_at__lte=since, reminded_at__isnull=True)


def _mark(listing):
    Listing.objects.filter(pk=listing.pk).update(reminded_at=timezone.now())


def remind_listings_in_review() -> int:
    """Al equipo: hay publicaciones esperando una oferta desde hace demasiado."""
    hours = settings.LISTING_REVIEW_REMINDER_HOURS
    if not hours:
        return 0
    since = timezone.now() - timedelta(hours=hours)
    count = 0
    for listing in _pending(Q(status=Listing.Status.IN_REVIEW), since).select_related("seller"):
        notify_reminder(
            listing,
            Notification.Kind.LISTING_REVIEW_REMINDER,
            operators(listing),
            {"hours": hours},
        )
        _mark(listing)
        count += 1
    return count


def remind_pending_offers() -> int:
    """Al vendedor: tiene una oferta sin responder."""
    days = settings.LISTING_OFFER_REMINDER_DAYS
    if not days:
        return 0
    since = timezone.now() - timedelta(days=days)
    expiry = settings.LISTING_OFFER_EXPIRY_DAYS
    count = 0
    for listing in _pending(WAITING_OFFER, since).select_related("seller"):
        left = expiry - (timezone.now() - listing.status_changed_at).days if expiry else None
        notify_reminder(
            listing,
            Notification.Kind.LISTING_OFFER_REMINDER,
            [listing.seller],
            # Sin vencimiento configurado el aviso no promete una fecha.
            {"days_left": max(left, 0)} if left is not None else {},
        )
        _mark(listing)
        count += 1
    return count


def expire_offers() -> int:
    """La oferta que nadie respondió deja de estar en pie y la publicación vuelve a revisión."""
    days = settings.LISTING_OFFER_EXPIRY_DAYS
    if not days:
        return 0
    since = timezone.now() - timedelta(days=days)
    listings = Listing.objects.filter(WAITING_OFFER, status_changed_at__lte=since)
    count = 0
    for listing in listings.select_related("seller"):
        transitions.apply(listing, None, "expire")
        count += 1
    return count


@shared_task
def check_pending() -> dict:
    return {
        "review_reminders": remind_listings_in_review(),
        "offer_reminders": remind_pending_offers(),
        "expired": expire_offers(),
    }

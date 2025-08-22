"""Números del panel del operador.

Todo sale de `ListingEvent`: hay una fila por transición, así que no hace falta
guardar contadores aparte ni mantenerlos al día.
"""

from datetime import timedelta

from django.db.models import Avg, Count, Q, Subquery, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from .models import Listing, ListingEvent
from .queries import QUEUES

WINDOW_DAYS = 30
ACCEPTED = ["accept", "accept_counter"]
# El promedio de espera se calcula en Python sobre las ofertas más recientes:
# restar fechas y promediar no es portable entre Postgres y SQLite.
DELAY_SAMPLE = 500


def queue_counts():
    return Listing.objects.aggregate(
        **{name: Count("id", filter=condition()) for name, condition in QUEUES.items()}
    )


def oldest_waiting_days():
    """Días que lleva esperando la publicación en revisión más vieja."""
    oldest = (
        Listing.objects.filter(status=Listing.Status.IN_REVIEW)
        .order_by("created_at")
        .values_list("created_at", flat=True)
        .first()
    )
    return (timezone.now() - oldest).days if oldest else None


def funnel(since):
    """De las publicaciones creadas en la ventana, cuántas llegaron a cada paso."""
    counts = Listing.objects.filter(created_at__gte=since).aggregate(
        created=Count("id", distinct=True),
        offered=Count("id", distinct=True, filter=Q(events__action="offer")),
        accepted=Count("id", distinct=True, filter=Q(events__action__in=ACCEPTED)),
        picked_up=Count("id", distinct=True, filter=Q(events__action="pickup")),
        completed=Count("id", distinct=True, filter=Q(events__action="complete")),
        paid=Count("id", distinct=True, filter=Q(events__action="pay")),
    )
    return counts


def hours_to_offer(since):
    """Horas entre publicar y recibir la primera oferta."""
    rows = (
        ListingEvent.objects.filter(action="offer", created_at__gte=since)
        .order_by("-created_at")
        .values_list("created_at", "listing__created_at")[:DELAY_SAMPLE]
    )
    delays = [(offered - created).total_seconds() / 3600 for offered, created in rows]
    return round(sum(delays) / len(delays), 1) if delays else None


def period(since):
    events = ListingEvent.objects.filter(created_at__gte=since)
    created = events.filter(action="create").count()
    offered = events.filter(action="offer")
    accepted = events.filter(action__in=ACCEPTED).count()
    paid = Listing.objects.filter(id__in=Subquery(events.filter(action="pay").values("listing_id")))
    money = paid.aggregate(total=Sum("paid_amount"), average=Avg("paid_amount"))
    offered_total = Listing.objects.filter(id__in=Subquery(offered.values("listing_id"))).aggregate(
        total=Coalesce(Sum("offer_amount"), 0, output_field=Listing._meta.get_field("offer_amount"))
    )
    offers = offered.count()
    return {
        "created": created,
        "offered": offers,
        "accepted": accepted,
        # Cuántas de las ofertas terminaron aceptadas. Sin ofertas no hay tasa que mostrar.
        "acceptance_rate": round(accepted / offers, 2) if offers else None,
        "paid_count": paid.count(),
        "paid_total": money["total"] or 0,
        "average_paid": round(money["average"], 2) if money["average"] is not None else None,
        "offered_total": offered_total["total"],
        "hours_to_offer": hours_to_offer(since),
    }


def summary():
    since = timezone.now() - timedelta(days=WINDOW_DAYS)
    return {
        "days": WINDOW_DAYS,
        "queue": {**queue_counts(), "oldest_waiting_days": oldest_waiting_days()},
        "funnel": funnel(since),
        "period": period(since),
    }

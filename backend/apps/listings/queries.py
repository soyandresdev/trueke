from django.db.models import Q
from django.utils import timezone

from .models import Listing


def visible_listings(user):
    """El vendedor ve solo lo suyo; el operador ve todo."""
    qs = Listing.objects.select_related("seller", "category").prefetch_related("images")
    return qs if user.is_operator else qs.filter(seller=user)


def unread_filter(user):
    """Mensajes del otro lado sin leer: en lo propio, los de la plataforma; en lo ajeno, los del vendedor."""
    return Q(messages__read_at__isnull=True) & (
        Q(seller=user, messages__from_platform=True) | (~Q(seller=user) & Q(messages__from_platform=False))
    )


# Colas de trabajo del operador: lo que espera una acción suya. Cada una es un filtro del listado.
QUEUES = {
    "unoffered": lambda: Q(status=Listing.Status.IN_REVIEW),
    "countered": lambda: Q(status=Listing.Status.COUNTERED),
    # Incluye las atrasadas: si la fecha ya pasó, sigue pendiente.
    "pickups_today": lambda: Q(status=Listing.Status.PICKUP_SENT, pickup_date__lte=timezone.localdate()),
    "unpaid": lambda: Q(status=Listing.Status.COMPLETED),
}


def apply_filters(qs, params):
    """Filtros del listado y de la tabla de ofertas."""
    if queue := params.get("queue"):
        if queue not in QUEUES:
            return qs.none()
        qs = qs.filter(QUEUES[queue]())
    if statuses := params.get("status"):
        qs = qs.filter(status__in=statuses.split(","))
    if category := params.get("category"):
        qs = qs.filter(category__code=category)
    if city := params.get("city"):
        qs = qs.filter(city__iexact=city)
    if q := params.get("q"):
        qs = qs.filter(
            Q(title__icontains=q)
            | Q(description__icontains=q)
            | Q(seller__first_name__icontains=q)
            | Q(seller__last_name__icontains=q)
            | Q(seller__phone__icontains=q)
        )
    return qs

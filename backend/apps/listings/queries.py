from django.db.models import Q

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

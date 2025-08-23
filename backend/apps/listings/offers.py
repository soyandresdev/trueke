"""Tabla de ofertas del operador: una fila por publicación, centrada en el dinero.

Las fechas de la oferta y de la aceptación salen de `ListingEvent` con subconsultas,
para no hacer una consulta por fila.
"""

import csv

from django.db.models import DateTimeField, F, OuterRef, Subquery
from django.http import StreamingHttpResponse
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .models import ListingEvent

ORDERING = {
    "created_at": "created_at",
    "offered_at": "offered_at",
    "offer_amount": "offer_amount",
    "paid_amount": "paid_amount",
    "status": "status",
    "city": "city",
    "title": "title",
}
DEFAULT_ORDERING = "-created_at"


def _event_date(*actions):
    """Fecha del último evento con una de esas acciones."""
    return Subquery(
        ListingEvent.objects.filter(listing=OuterRef("pk"), action__in=actions)
        .order_by("-created_at")
        .values("created_at")[:1],
        output_field=DateTimeField(),
    )


def with_dates(qs):
    return qs.annotate(
        offered_at=_event_date("offer"),
        accepted_at=_event_date("accept", "accept_counter"),
    )


def ordered(qs, param):
    """`?ordering=-offer_amount`. Solo se admiten las columnas de la tabla."""
    field = ORDERING.get((param or "").lstrip("-"))
    if not field:
        return qs.order_by(DEFAULT_ORDERING, "-id")
    # Las filas sin valor (sin oferta, sin pago) van al final en los dos sentidos.
    column = F(field)
    order = column.desc(nulls_last=True) if param.startswith("-") else column.asc(nulls_last=True)
    return qs.order_by(order, "-id")


# Perezosas: el encabezado se traduce en cada petición, no al importar el módulo.
CSV_COLUMNS = [
    ("id", _("id")),
    ("title", _("artículo")),
    ("category", _("categoría")),
    ("city", _("ciudad")),
    ("seller", _("vendedor")),
    ("phone", _("teléfono")),
    ("status", _("estado")),
    ("offer_amount", _("oferta")),
    ("counter_amount", _("contraoferta")),
    ("paid_amount", _("pagado")),
    ("currency", _("moneda")),
    ("created_at", _("publicada")),
    ("offered_at", _("ofertada")),
    ("accepted_at", _("aceptada")),
    ("paid_at", _("pagada")),
    ("payment_reference", _("referencia")),
]


def _date(value):
    return value.date().isoformat() if value else ""


def _row(listing):
    return {
        "id": listing.id,
        "title": listing.title,
        "category": listing.category.display_name,
        "city": listing.city,
        "seller": listing.seller.get_full_name(),
        "phone": listing.seller.phone,
        "status": listing.get_status_display(),
        "offer_amount": listing.offer_amount or "",
        "counter_amount": listing.counter_amount or "",
        "paid_amount": listing.paid_amount or "",
        "currency": listing.offer_currency,
        "created_at": _date(listing.created_at),
        "offered_at": _date(listing.offered_at),
        "accepted_at": _date(listing.accepted_at),
        "paid_at": listing.paid_at.isoformat() if listing.paid_at else "",
        "payment_reference": listing.payment_reference,
    }


class _Echo:
    """Le da a csv.writer algo que escribir sin guardar nada en memoria."""

    def write(self, value):
        return value


def csv_response(qs):
    writer = csv.writer(_Echo())
    keys = [key for key, _label in CSV_COLUMNS]

    # El CSV no usa las fotos: sin el prefetch se puede recorrer de a poco.
    qs = qs.prefetch_related(None)

    def rows():
        yield writer.writerow([str(label) for _key, label in CSV_COLUMNS])
        for listing in qs.iterator(chunk_size=500):
            row = _row(listing)
            yield writer.writerow([row[key] for key in keys])

    name = f"trueke-{timezone.localdate().isoformat()}.csv"
    response = StreamingHttpResponse(rows(), content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="{name}"'
    return response

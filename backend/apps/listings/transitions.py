"""Máquina de estados de las publicaciones: el único sitio donde cambia `Listing.status`.

    in_review ──offer──▶ offered ──accept──▶ accepted ──pickup──▶ pickup_sent ──complete──▶ completed
        │                  │ reject                                                          │ pay
        └──────cancel──────┴────────────────▶ cancelled                                   paid

Cada transición dice desde qué estados se puede hacer y quién la hace. Al aplicarla se guarda
un `ListingEvent` y, cuando la transacción se confirma, se emite `listing_transitioned`.
"""

from dataclasses import dataclass

from django.conf import settings
from django.db import transaction
from django.dispatch import Signal
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .models import Listing, ListingEvent

S = Listing.Status

SELLER = "seller"
OPERATOR = "operator"

# Argumentos: listing, event. También se emite al crear la publicación (event.action == "create").
listing_transitioned = Signal()


@dataclass(frozen=True)
class Transition:
    name: str
    sources: frozenset[str]
    target: str
    actor: str  # SELLER (dueño de la publicación) u OPERATOR
    label: str


TRANSITIONS = {
    t.name: t
    for t in [
        Transition("offer", frozenset({S.IN_REVIEW, S.COUNTERED}), S.OFFERED, OPERATOR, _("Hacer oferta")),
        Transition("accept", frozenset({S.OFFERED}), S.ACCEPTED, SELLER, _("Aceptar oferta")),
        Transition("counter", frozenset({S.OFFERED}), S.COUNTERED, SELLER, _("Contraofertar")),
        Transition(
            "accept_counter", frozenset({S.COUNTERED}), S.ACCEPTED, OPERATOR, _("Aceptar contraoferta")
        ),
        Transition("reject", frozenset({S.OFFERED}), S.CANCELLED, SELLER, _("Rechazar oferta")),
        Transition("pickup", frozenset({S.ACCEPTED}), S.PICKUP_SENT, OPERATOR, _("Coordinar recogida")),
        Transition("complete", frozenset({S.PICKUP_SENT}), S.COMPLETED, OPERATOR, _("Completar venta")),
        Transition("pay", frozenset({S.COMPLETED}), S.PAID, OPERATOR, _("Registrar pago")),
        Transition(
            "cancel", frozenset({S.IN_REVIEW, S.OFFERED, S.COUNTERED}), S.CANCELLED, SELLER, _("Cancelar")
        ),
    ]
}
# Cancelar lo pueden hacer los dos lados.
SHARED = {"cancel"}


class TransitionError(Exception):
    """`code` es estable para el frontend: not_allowed | invalid_state | profile_incomplete |
    counter_limit."""

    def __init__(self, code: str, detail: str):
        super().__init__(detail)
        self.code = code
        self.detail = detail


def _role(listing: Listing, user) -> str | None:
    if user.pk == listing.seller_id:
        return SELLER
    # Un operador nunca actúa como plataforma sobre sus propias publicaciones.
    if getattr(user, "is_operator", False):
        return OPERATOR
    return None


def can_act(listing: Listing, user, name: str) -> bool:
    t = TRANSITIONS[name]
    role = _role(listing, user)
    return role is not None and (role == t.actor or name in SHARED)


def counters_left(listing: Listing) -> int:
    used = ListingEvent.objects.filter(listing=listing, action="counter").count()
    return max(settings.LISTING_MAX_COUNTEROFFERS - used, 0)


def available(listing: Listing, user) -> list[str]:
    """Transiciones que `user` puede hacer ahora mismo (el frontend pinta los botones con esto)."""
    names = [
        name
        for name, t in TRANSITIONS.items()
        if listing.status in t.sources and can_act(listing, user, name)
    ]
    if "counter" in names and not counters_left(listing):
        names.remove("counter")
    return names


def _check(listing: Listing, user, t: Transition):
    if not can_act(listing, user, t.name):
        raise TransitionError("not_allowed", _("No puedes hacer esta acción en esta publicación."))
    if listing.status not in t.sources:
        raise TransitionError(
            "invalid_state",
            _("No se puede «%(action)s» una publicación %(status)s.")
            % {"action": t.label, "status": listing.get_status_display().lower()},
        )
    # Aceptar o contraofertar es comprometerse a vender: hace falta poder pagarle.
    if t.name in ("accept", "counter") and not user.profile_complete:
        raise TransitionError(
            "profile_incomplete",
            _("Completa tu perfil (datos, documento y certificado bancario) para aceptar la oferta."),
        )
    if t.name == "counter" and not counters_left(listing):
        raise TransitionError("counter_limit", _("Ya no puedes hacer más contraofertas en esta publicación."))


def apply(listing: Listing, user, name: str, **data) -> ListingEvent:
    """Aplica la transición `name`. `data` son los campos propios de cada una (ya validados)."""
    t = TRANSITIONS[name]
    with transaction.atomic():
        # Bloquea la fila: dos peticiones simultáneas no pueden partir del mismo estado.
        locked = Listing.objects.select_for_update().get(pk=listing.pk)
        _check(locked, user, t)

        if name == "offer":
            locked.offer_amount = data["amount"]
            locked.offer_currency = data["currency"]
            locked.counter_amount = None  # una oferta nueva deja atrás la contraoferta
        elif name == "counter":
            locked.counter_amount = data["amount"]
        elif name == "accept_counter":
            # Se acepta lo que pidió el vendedor: pasa a ser la oferta.
            locked.offer_amount = locked.counter_amount
            data["amount"] = locked.counter_amount
        elif name == "pickup":
            locked.pickup_by = data["pickup_by"]
            locked.pickup_date = data.get("pickup_date")
            locked.pickup_notes = data.get("notes", "")
        elif name in ("cancel", "reject"):
            locked.cancel_reason = data.get("reason", "")
        elif name == "pay":
            locked.paid_amount = data["amount"]
            locked.paid_at = data.get("paid_at") or timezone.localdate()
            locked.payment_reference = data.get("reference", "")
            if receipt := data.pop("receipt", None):
                locked.payment_receipt = receipt
            # En el historial solo consta si hubo comprobante: el nombre puede tener datos personales.
            data["receipt"] = bool(receipt)

        from_status = locked.status
        locked.status = t.target
        locked.status_changed_at = timezone.now()
        locked.save()
        event = ListingEvent.objects.create(
            listing=locked,
            actor=user,
            action=name,
            from_status=from_status,
            to_status=t.target,
            data=_jsonable(data),
        )
        transaction.on_commit(lambda: listing_transitioned.send(Listing, listing=locked, event=event))

    listing.refresh_from_db()
    return event


def record_creation(listing: Listing, user) -> ListingEvent:
    """Primer evento del historial. Emite `listing_transitioned` con `action="create"`."""
    event = ListingEvent.objects.create(
        listing=listing, actor=user, action="create", to_status=listing.status
    )
    transaction.on_commit(lambda: listing_transitioned.send(Listing, listing=listing, event=event))
    return event


def _jsonable(data: dict) -> dict:
    return {
        k: str(v) if v is not None and not isinstance(v, (str, int, bool)) else v for k, v in data.items()
    }

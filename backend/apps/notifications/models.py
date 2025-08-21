from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Notification(models.Model):
    """Aviso para un usuario (la campana). El texto lo arma el frontend a partir de `kind` y `data`."""

    class Kind(models.TextChoices):
        LISTING_CREATE = "listing.create", _("Nueva publicación")
        LISTING_OFFER = "listing.offer", _("Nueva oferta")
        LISTING_ACCEPT = "listing.accept", _("Oferta aceptada")
        LISTING_REJECT = "listing.reject", _("Oferta rechazada")
        LISTING_COUNTER = "listing.counter", _("Contraoferta")
        LISTING_ACCEPT_COUNTER = "listing.accept_counter", _("Contraoferta aceptada")
        LISTING_PICKUP = "listing.pickup", _("Recogida coordinada")
        LISTING_COMPLETE = "listing.complete", _("Venta completada")
        LISTING_PAY = "listing.pay", _("Pago registrado")
        LISTING_CANCEL = "listing.cancel", _("Publicación cancelada")
        MESSAGE_NEW = "message.new", _("Mensajes nuevos")

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    kind = models.CharField(_("tipo"), max_length=30, choices=Kind)
    listing = models.ForeignKey(
        "listings.Listing", on_delete=models.CASCADE, null=True, blank=True, related_name="notifications"
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(db_index=True)
    seen_at = models.DateTimeField(_("vista"), null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["user", "seen_at"])]
        verbose_name = _("notificación")
        verbose_name_plural = _("notificaciones")

    def __str__(self):
        return f"{self.get_kind_display()} → {self.user}"

import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _


class Subscriber(models.Model):
    email = models.EmailField(_("email"), unique=True)
    language = models.CharField(_("idioma"), max_length=2, default="es")
    # Va en el enlace de baja de cada correo; no se puede adivinar a partir del email.
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    unsubscribed_at = models.DateTimeField(_("dado de baja"), null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = _("suscriptor")
        verbose_name_plural = _("suscriptores")

    def __str__(self):
        return self.email

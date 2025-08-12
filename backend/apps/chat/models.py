"""Un chat por publicación, entre el vendedor y la plataforma (cualquier operador).

No hay modelo `Chat`: los mensajes cuelgan directamente de la publicación. `from_platform` dice de qué
lado viene cada mensaje; un mensaje se marca leído cuando lo abre el otro lado.
"""

import uuid
from pathlib import PurePath

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.accounts.files import private_storage
from apps.listings.models import Listing

ATTACHMENT_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}


def attachment_path(instance, filename):
    return f"chat/{instance.listing_id}/{uuid.uuid4().hex}{PurePath(filename).suffix.lower()}"


def validate_attachment(file):
    if PurePath(file.name).suffix.lower() not in ATTACHMENT_EXTENSIONS:
        raise ValidationError(_("Formato no permitido. Usa PDF, JPG, PNG o WebP."))
    if file.size > settings.CHAT_FILE_MAX_MB * 1024 * 1024:
        raise ValidationError(_("El archivo supera los %(mb)s MB.") % {"mb": settings.CHAT_FILE_MAX_MB})


class Message(models.Model):
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="messages"
    )
    from_platform = models.BooleanField(_("enviado por la plataforma"))
    text = models.TextField(_("texto"), max_length=4000, blank=True)
    # Privado: puede ser un comprobante o un documento. Se descarga por la API con permisos.
    attachment = models.FileField(
        _("adjunto"),
        upload_to=attachment_path,
        storage=private_storage,
        validators=[validate_attachment],
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    read_at = models.DateTimeField(_("leído"), null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["listing", "from_platform", "read_at"])]
        verbose_name = _("mensaje")
        verbose_name_plural = _("mensajes")

    def __str__(self):
        return self.text[:40] or self.attachment.name

    @property
    def attachment_kind(self) -> str:
        """`pdf` o `image`; el nombre original no se guarda (puede tener datos personales)."""
        if not self.attachment:
            return ""
        return "pdf" if self.attachment.name.endswith(".pdf") else "image"

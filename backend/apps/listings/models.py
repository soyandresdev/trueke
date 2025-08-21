import uuid
from pathlib import PurePath

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import get_language
from django.utils.translation import gettext_lazy as _

from apps.accounts.files import private_storage, validate_private_file

from .schema import empty_schema, validate_fields_schema

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


class Category(models.Model):
    code = models.SlugField(_("código"), max_length=40, unique=True)
    name = models.CharField(_("nombre"), max_length=80)
    name_en = models.CharField(_("nombre en inglés"), max_length=80, blank=True)
    fields_schema = models.JSONField(
        _("campos extra"),
        default=empty_schema,
        validators=[validate_fields_schema],
        help_text=_("JSON Schema (tipo object) con los campos propios de la categoría."),
    )
    position = models.PositiveSmallIntegerField(_("orden"), default=0)
    is_active = models.BooleanField(_("activa"), default=True)

    class Meta:
        ordering = ["position", "name"]
        verbose_name = _("categoría")
        verbose_name_plural = _("categorías")

    def __str__(self):
        return self.name

    @property
    def display_name(self) -> str:
        return self.name_en if get_language() == "en" and self.name_en else self.name


def listing_receipt_path(instance, filename):
    return f"listings/{instance.pk}/receipts/{uuid.uuid4().hex}{PurePath(filename).suffix.lower()}"


class Listing(models.Model):
    class Status(models.TextChoices):
        IN_REVIEW = "in_review", _("En revisión")
        OFFERED = "offered", _("Con oferta")
        ACCEPTED = "accepted", _("Aceptada")
        PICKUP_SENT = "pickup_sent", _("Recogida enviada")
        COMPLETED = "completed", _("Completada")
        PAID = "paid", _("Pagada")
        CANCELLED = "cancelled", _("Cancelada")

    class Condition(models.TextChoices):
        NEW = "new", _("Nuevo")
        LIKE_NEW = "like_new", _("Como nuevo")
        GOOD = "good", _("Buen estado")
        FAIR = "fair", _("Con detalles")
        FOR_PARTS = "for_parts", _("Para repuestos")

    class PickupBy(models.TextChoices):
        SELLER = "seller", _("El vendedor lo envía")
        PLATFORM = "platform", _("Trueke lo recoge")

    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="listings",
        verbose_name=_("vendedor"),
    )
    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, related_name="listings", verbose_name=_("categoría")
    )
    title = models.CharField(_("nombre"), max_length=120)
    description = models.TextField(_("descripción"), max_length=4000)
    condition = models.CharField(_("estado del artículo"), max_length=10, choices=Condition)
    attributes = models.JSONField(_("campos de la categoría"), default=dict, blank=True)
    city = models.CharField(_("ciudad"), max_length=80)
    pickup_address = models.CharField(_("dirección de recogida"), max_length=200)
    is_original = models.BooleanField(_("¿es original?"), default=True)
    terms_accepted_at = models.DateTimeField(_("términos aceptados"))

    # Solo cambia a través de `transitions.apply`.
    status = models.CharField(
        _("estado"), max_length=12, choices=Status, default=Status.IN_REVIEW, db_index=True
    )
    status_changed_at = models.DateTimeField(_("último cambio de estado"), auto_now_add=True)
    offer_amount = models.DecimalField(_("oferta"), max_digits=12, decimal_places=2, null=True, blank=True)
    offer_currency = models.CharField(_("moneda"), max_length=3, blank=True)
    pickup_by = models.CharField(_("responsable de la recogida"), max_length=10, choices=PickupBy, blank=True)
    pickup_date = models.DateField(_("fecha de recogida"), null=True, blank=True)
    pickup_notes = models.CharField(_("indicaciones de recogida"), max_length=500, blank=True)
    cancel_reason = models.CharField(_("motivo de cancelación"), max_length=500, blank=True)

    # Pago al vendedor (transición `pay`). El comprobante es privado: se descarga por la API.
    paid_amount = models.DecimalField(
        _("monto pagado"), max_digits=12, decimal_places=2, null=True, blank=True
    )
    paid_at = models.DateField(_("fecha de pago"), null=True, blank=True)
    payment_reference = models.CharField(_("referencia del pago"), max_length=80, blank=True)
    payment_receipt = models.FileField(
        _("comprobante de pago"),
        upload_to=listing_receipt_path,
        storage=private_storage,
        validators=[validate_private_file],
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = _("publicación")
        verbose_name_plural = _("publicaciones")

    def __str__(self):
        return self.title

    @property
    def is_editable(self) -> bool:
        """El vendedor solo puede editar mientras la publicación está en revisión."""
        return self.status == self.Status.IN_REVIEW


def listing_image_path(instance, filename):
    return f"listings/{instance.listing_id}/{uuid.uuid4().hex}{PurePath(filename).suffix.lower()}"


def validate_listing_image(file):
    if PurePath(file.name).suffix.lower() not in IMAGE_EXTENSIONS:
        raise ValidationError(_("Formato no permitido. Usa JPG, PNG o WebP."))
    if file.size > settings.LISTING_IMAGE_MAX_MB * 1024 * 1024:
        raise ValidationError(_("La imagen supera los %(mb)s MB.") % {"mb": settings.LISTING_IMAGE_MAX_MB})


class ListingImage(models.Model):
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(_("imagen"), upload_to=listing_image_path, validators=[validate_listing_image])
    position = models.PositiveSmallIntegerField(_("orden"), default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["position", "id"]
        verbose_name = _("imagen")
        verbose_name_plural = _("imágenes")

    def __str__(self):
        return self.image.name


class ListingEvent(models.Model):
    """Historial de la publicación: una fila por transición. Las notificaciones salen de aquí."""

    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="events")
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="listing_events"
    )
    action = models.CharField(_("acción"), max_length=20)
    from_status = models.CharField(max_length=12, choices=Listing.Status, blank=True)
    to_status = models.CharField(max_length=12, choices=Listing.Status)
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
        verbose_name = _("evento")
        verbose_name_plural = _("eventos")

    def __str__(self):
        return f"{self.listing_id}: {self.action} → {self.to_status}"

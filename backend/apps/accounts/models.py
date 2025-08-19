from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .files import private_storage, user_document_path, user_photo_path, validate_private_file
from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        SELLER = "seller", _("Vendedor")
        OPERATOR = "operator", _("Operador")

    class DocumentType(models.TextChoices):
        NATIONAL_ID = "national_id", _("Documento nacional")
        FOREIGN_ID = "foreign_id", _("Documento de extranjería")
        PASSPORT = "passport", _("Pasaporte")

    class Language(models.TextChoices):
        ES = "es", "Español"
        EN = "en", "English"

    phone = models.CharField(_("teléfono"), max_length=20, unique=True)
    first_name = models.CharField(_("nombre"), max_length=80, blank=True)
    last_name = models.CharField(_("apellido"), max_length=80, blank=True)
    email = models.EmailField(_("email"), blank=True)
    photo = models.ImageField(_("foto"), upload_to=user_photo_path, blank=True)
    language = models.CharField(_("idioma"), max_length=2, choices=Language, default=Language.EN)
    role = models.CharField(_("rol"), max_length=10, choices=Role, default=Role.SELLER)

    document_type = models.CharField(_("tipo de documento"), max_length=20, choices=DocumentType, blank=True)
    document_number = models.CharField(_("número de documento"), max_length=30, blank=True)
    document_file = models.FileField(
        _("documento"),
        upload_to=user_document_path,
        storage=private_storage,
        validators=[validate_private_file],
        blank=True,
    )
    bank_certificate = models.FileField(
        _("certificado bancario"),
        upload_to=user_document_path,
        storage=private_storage,
        validators=[validate_private_file],
        blank=True,
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "phone"
    REQUIRED_FIELDS: list[str] = []

    class Meta:
        verbose_name = _("usuario")
        verbose_name_plural = _("usuarios")

    def __str__(self):
        return self.get_full_name() or self.phone

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self):
        return self.first_name or self.phone

    @property
    def is_operator(self) -> bool:
        return self.role == self.Role.OPERATOR

    @property
    def profile_complete(self) -> bool:
        """Datos mínimos para que la plataforma pueda pagarle al vendedor."""
        return all(
            [
                self.first_name,
                self.last_name,
                self.document_type,
                self.document_number,
                self.document_file,
                self.bank_certificate,
            ]
        )


class OtpCode(models.Model):
    phone = models.CharField(max_length=20, db_index=True)
    code_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"OTP {self.phone} ({self.created_at:%Y-%m-%d %H:%M})"

import uuid
from pathlib import PurePath

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.storage import FileSystemStorage, storages
from django.utils.translation import gettext_lazy as _

PRIVATE_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}


def private_storage():
    return storages["private"]


def _random_name(folder: str, filename: str) -> str:
    # El nombre original no se guarda: puede contener datos personales.
    return f"{folder}/{uuid.uuid4().hex}{PurePath(filename).suffix.lower()}"


def user_photo_path(instance, filename):
    return _random_name("users/photos", filename)


def user_document_path(instance, filename):
    return _random_name(f"users/{instance.pk}/documents", filename)


def validate_private_file(file):
    if PurePath(file.name).suffix.lower() not in PRIVATE_EXTENSIONS:
        raise ValidationError(_("Formato no permitido. Usa PDF, JPG o PNG."))
    if file.size > settings.PRIVATE_FILE_MAX_MB * 1024 * 1024:
        raise ValidationError(_("El archivo supera los %(mb)s MB.") % {"mb": settings.PRIVATE_FILE_MAX_MB})


class PrivateFileSystemStorage(FileSystemStorage):
    """Almacenamiento local sin URL pública: los archivos solo se entregan por vistas con permisos."""

    def url(self, name):
        raise ValueError("Los archivos privados no tienen URL pública.")

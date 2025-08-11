import pytest
from django.core.files.storage import FileSystemStorage
from rest_framework.test import APIClient

from apps.accounts.models import User


def _point_to(storage, path):
    if isinstance(storage, FileSystemStorage):
        storage._location = str(path)
        for attr in ("base_location", "location"):
            storage.__dict__.pop(attr, None)


@pytest.fixture(autouse=True)
def _tmp_media(tmp_path, settings):
    """Los archivos de los tests van a un directorio temporal, nunca a media/ ni private-media/."""
    settings.MEDIA_ROOT = tmp_path / "media"
    settings.STORAGES = {
        **settings.STORAGES,
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "private": {
            "BACKEND": "apps.accounts.files.PrivateFileSystemStorage",
            "OPTIONS": {"location": tmp_path / "private"},
        },
    }
    for field in ("document_file", "bank_certificate"):
        _point_to(User._meta.get_field(field).storage, tmp_path / "private")


@pytest.fixture
def api():
    return APIClient()

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from apps.accounts.models import User

from .factories import UserFactory

pytestmark = pytest.mark.django_db

PDF = b"%PDF-1.4 test"


def pdf(name="doc.pdf", content=PDF):
    return SimpleUploadedFile(name, content, content_type="application/pdf")


@pytest.fixture
def user():
    return UserFactory()


@pytest.fixture
def auth_api(api, user):
    api.force_authenticate(user)
    return api


def test_me_requires_authentication(api):
    assert api.get(reverse("me")).status_code == 401


def test_get_me(auth_api, user):
    data = auth_api.get(reverse("me")).data
    assert data["phone"] == user.phone
    assert data["profile_complete"] is False


def test_patch_me_updates_profile_but_not_role_or_phone(auth_api, user):
    response = auth_api.patch(
        reverse("me"),
        {"first_name": "Ana", "role": "operator", "phone": "+573009999999"},
        format="json",
    )
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.first_name == "Ana"
    assert user.role == User.Role.SELLER
    assert user.phone != "+573009999999"


def test_upload_documents_and_complete_profile(auth_api, user):
    auth_api.patch(
        reverse("me"),
        {"first_name": "Ana", "last_name": "Ruiz", "document_type": "national_id", "document_number": "123"},
        format="json",
    )
    response = auth_api.patch(
        reverse("me-documents"),
        {"document_file": pdf(), "bank_certificate": pdf("banco.pdf")},
        format="multipart",
    )
    assert response.status_code == 200
    assert response.data["has_document_file"] and response.data["has_bank_certificate"]
    assert response.data["profile_complete"] is True
    user.refresh_from_db()
    # El nombre original no se conserva.
    filename = user.document_file.name.rsplit("/", 1)[-1]
    assert filename != "doc.pdf" and filename.endswith(".pdf")


def test_upload_rejects_bad_extension(auth_api):
    response = auth_api.patch(
        reverse("me-documents"), {"document_file": pdf("virus.exe")}, format="multipart"
    )
    assert response.status_code == 400


def test_upload_rejects_big_files(auth_api, settings):
    settings.PRIVATE_FILE_MAX_MB = 1
    big = pdf(content=b"0" * (1024 * 1024 + 1))
    assert (
        auth_api.patch(reverse("me-documents"), {"document_file": big}, format="multipart").status_code == 400
    )


def test_replacing_document_deletes_old_file(auth_api, user):
    auth_api.patch(reverse("me-documents"), {"document_file": pdf()}, format="multipart")
    user.refresh_from_db()
    old = user.document_file.name
    auth_api.patch(reverse("me-documents"), {"document_file": pdf()}, format="multipart")
    assert not user.document_file.storage.exists(old)


def test_download_own_document(auth_api):
    auth_api.patch(reverse("me-documents"), {"document_file": pdf()}, format="multipart")
    response = auth_api.get(reverse("me-document-file", args=["document"]))
    assert response.status_code == 200
    assert b"".join(response.streaming_content) == PDF


def test_download_missing_document_is_404(auth_api):
    assert auth_api.get(reverse("me-document-file", args=["bank-certificate"])).status_code == 404
    assert auth_api.get(reverse("me-document-file", args=["otro"])).status_code == 404


def test_private_files_are_not_under_media_url(auth_api, user, settings):
    auth_api.patch(reverse("me-documents"), {"document_file": pdf()}, format="multipart")
    user.refresh_from_db()
    with pytest.raises(ValueError):
        user.document_file.url  # noqa: B018

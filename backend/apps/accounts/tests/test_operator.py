import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from .factories import OperatorFactory, UserFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def seller():
    user = UserFactory(email="ana@example.com")
    user.document_file = SimpleUploadedFile("d.pdf", b"%PDF doc")
    user.save()
    return user


def test_operator_sees_seller_profile_and_documents(api, seller):
    api.force_authenticate(OperatorFactory())
    data = api.get(reverse("user-detail", args=[seller.pk])).data
    assert (data["phone"], data["email"], data["has_document_file"]) == (
        seller.phone,
        "ana@example.com",
        True,
    )

    response = api.get(reverse("user-document-file", args=[seller.pk, "document"]))
    assert b"".join(response.streaming_content) == b"%PDF doc"
    assert api.get(reverse("user-document-file", args=[seller.pk, "bank-certificate"])).status_code == 404


def test_sellers_cannot_see_other_users(api, seller):
    api.force_authenticate(UserFactory())
    assert api.get(reverse("user-detail", args=[seller.pk])).status_code == 403
    assert api.get(reverse("user-document-file", args=[seller.pk, "document"])).status_code == 403


def test_create_operator_command():
    from io import StringIO

    from django.core.management import call_command

    from apps.accounts.models import User

    call_command("create_operator", "3009990001", "--first-name", "Ana", stdout=StringIO())
    call_command("create_operator", "+573009990001", "--first-name", "Ana", stdout=StringIO())
    user = User.objects.get()
    assert (user.phone, user.role, user.first_name) == ("+573009990001", User.Role.OPERATOR, "Ana")

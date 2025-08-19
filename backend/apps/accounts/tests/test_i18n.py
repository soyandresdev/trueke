"""El backend responde en el idioma de Accept-Language (inglés por defecto, español si se pide)."""

import pytest
from django.urls import reverse

from apps.listings.tests.factories import ListingFactory

pytestmark = pytest.mark.django_db


def verify_wrong_code(api, language):
    api.post(reverse("otp-request"), {"phone": "+573001112233"}, format="json")
    return api.post(
        reverse("otp-verify"),
        {"phone": "+573001112233", "code": "000000"},
        format="json",
        HTTP_ACCEPT_LANGUAGE=language,
    )


def test_errors_in_english_by_default(api):
    assert verify_wrong_code(api, "").data["detail"] == "The code is wrong or has expired."
    assert verify_wrong_code(api, "fr").data["detail"] == "The code is wrong or has expired."


def test_errors_in_spanish_when_asked(api):
    assert verify_wrong_code(api, "es-CO").data["detail"] == "El código es incorrecto o ya venció."


def test_otp_sms_in_the_language_of_the_request(api, django_capture_on_commit_callbacks):
    from unittest import mock

    sent = []

    def capture(phone, code):
        from apps.accounts.providers import _message

        sent.append(_message(code))

    with (
        mock.patch("apps.accounts.tasks.send_otp", side_effect=capture),
        django_capture_on_commit_callbacks(execute=True),
    ):
        api.post(reverse("otp-request"), {"phone": "+573001110001"}, format="json", HTTP_ACCEPT_LANGUAGE="es")
        api.post(reverse("otp-request"), {"phone": "+573001110002"}, format="json", HTTP_ACCEPT_LANGUAGE="en")
    assert sent[0].startswith("Tu código de Trueke es")
    assert sent[1].startswith("Your Trueke code is")


def test_transition_errors_and_labels_in_english(api):
    listing = ListingFactory(status="completed")
    api.force_authenticate(listing.seller)
    response = api.post(reverse("listing-cancel", args=[listing.pk]), HTTP_ACCEPT_LANGUAGE="en")
    assert response.status_code == 409
    assert response.data["detail"] == "Can’t “Cancel” a listing that is completed."


def test_validation_messages_in_english(api):
    listing = ListingFactory()
    api.force_authenticate(listing.seller)
    response = api.patch(
        reverse("listing-detail", args=[listing.pk]),
        {"attributes": {"storage_gb": 1}},
        format="json",
        HTTP_ACCEPT_LANGUAGE="en",
    )
    assert response.data["attributes"]["brand"] == ["This field is required."]


def test_compiled_translations_match_the_po_file():
    """Si alguien edita el .po y olvida `make messages`, el .mo (el que usa Django) queda viejo."""
    import gettext
    from pathlib import Path

    import polib
    from django.conf import settings

    stale = []
    for language in ("en", "es"):
        folder = Path(settings.BASE_DIR) / "locale" / language / "LC_MESSAGES"
        compiled = gettext.GNUTranslations((folder / "django.mo").open("rb"))
        stale += [
            f"{language}: {entry.msgid}"
            for entry in polib.pofile(str(folder / "django.po")).translated_entries()
            if compiled.gettext(entry.msgid) != entry.msgstr
        ]
    assert stale == []

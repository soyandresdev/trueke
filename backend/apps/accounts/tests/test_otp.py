from datetime import timedelta
from unittest import mock

import pytest
from django.urls import reverse
from django.utils import timezone
from freezegun import freeze_time

from apps.accounts.models import OtpCode, User

pytestmark = pytest.mark.django_db

PHONE = "+573001112233"


@pytest.fixture
def sent_codes():
    """Captura los códigos enviados en vez de loguearlos."""
    codes = []
    with mock.patch("apps.accounts.tasks.send_otp", side_effect=lambda phone, code: codes.append(code)):
        yield codes


def request_code(api, phone=PHONE):
    return api.post(reverse("otp-request"), {"phone": phone}, format="json")


def verify(api, code, phone=PHONE):
    return api.post(reverse("otp-verify"), {"phone": phone, "code": code}, format="json")


def test_request_normalizes_phone_and_stores_only_hash(api, sent_codes, django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True):
        response = request_code(api, "300 111 2233")
    assert response.status_code == 202
    otp = OtpCode.objects.get()
    assert otp.phone == PHONE
    assert len(sent_codes) == 1 and sent_codes[0] not in otp.code_hash


def test_invalid_phone_is_rejected(api):
    assert request_code(api, "123").status_code == 400


def test_resend_is_rate_limited(api, sent_codes, django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True):
        request_code(api)
    response = request_code(api)
    assert response.status_code == 429
    assert response.data["code"] == "resend_too_soon"


def test_verify_creates_user_and_returns_tokens(api, sent_codes, django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True):
        request_code(api)
    response = verify(api, sent_codes[0])
    assert response.status_code == 200
    assert response.data["created"] is True
    assert response.data["access"] and response.data["refresh"]
    user = User.objects.get(phone=PHONE)
    assert user.role == User.Role.SELLER and not user.has_usable_password()


def test_verify_existing_user_does_not_create(api, sent_codes, django_capture_on_commit_callbacks):
    User.objects.create_user(PHONE)
    with django_capture_on_commit_callbacks(execute=True):
        request_code(api)
    response = verify(api, sent_codes[0])
    assert response.data["created"] is False
    assert User.objects.count() == 1


def test_code_cannot_be_reused(api, sent_codes, django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True):
        request_code(api)
    assert verify(api, sent_codes[0]).status_code == 200
    assert verify(api, sent_codes[0]).status_code == 400


def test_wrong_code_counts_attempts_and_locks(api, sent_codes, django_capture_on_commit_callbacks, settings):
    with django_capture_on_commit_callbacks(execute=True):
        request_code(api)
    good = sent_codes[0]
    bad = "000000" if good != "000000" else "111111"
    for _ in range(settings.OTP_MAX_ATTEMPTS):
        assert verify(api, bad).status_code == 400
    # Bloqueado aunque ahora el código sea el correcto.
    assert verify(api, good).status_code == 400


def test_expired_code_is_rejected(api, sent_codes, django_capture_on_commit_callbacks, settings):
    with django_capture_on_commit_callbacks(execute=True):
        request_code(api)
    later = timezone.now() + timedelta(seconds=settings.OTP_TTL_SECONDS + 1)
    with freeze_time(later):
        assert verify(api, sent_codes[0]).status_code == 400


def test_new_code_invalidates_previous(api, sent_codes, django_capture_on_commit_callbacks, settings):
    with django_capture_on_commit_callbacks(execute=True):
        request_code(api)
    later = timezone.now() + timedelta(seconds=settings.OTP_RESEND_SECONDS + 1)
    with freeze_time(later):
        with django_capture_on_commit_callbacks(execute=True):
            request_code(api)
        first, second = sent_codes
        if first != second:
            assert verify(api, first).status_code == 400
        assert verify(api, second).status_code == 200


def test_inactive_user_cannot_log_in(api, sent_codes, django_capture_on_commit_callbacks):
    User.objects.create_user(PHONE, is_active=False)
    with django_capture_on_commit_callbacks(execute=True):
        request_code(api)
    assert verify(api, sent_codes[0]).status_code == 403

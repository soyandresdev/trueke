"""Emisión y verificación de códigos OTP."""

import secrets
from dataclasses import dataclass
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.utils import timezone

from .models import OtpCode
from .tasks import send_otp_task


class OtpError(Exception):
    code = "otp_error"


class ResendTooSoon(OtpError):
    code = "resend_too_soon"

    def __init__(self, wait_seconds: int):
        super().__init__(wait_seconds)
        self.wait_seconds = wait_seconds


class InvalidCode(OtpError):
    code = "invalid_code"


@dataclass(frozen=True)
class IssuedCode:
    expires_in: int
    resend_in: int


def issue_code(phone: str, language: str | None = None) -> IssuedCode:
    """`language`: idioma del SMS (el de quien lo pide); sin él, el idioma por defecto."""
    now = timezone.now()
    last = OtpCode.objects.filter(phone=phone).first()
    if last:
        elapsed = (now - last.created_at).total_seconds()
        if elapsed < settings.OTP_RESEND_SECONDS:
            raise ResendTooSoon(int(settings.OTP_RESEND_SECONDS - elapsed) + 1)

    code = "".join(secrets.choice("0123456789") for _ in range(settings.OTP_LENGTH))
    with transaction.atomic():
        # Un solo código vigente por teléfono.
        OtpCode.objects.filter(phone=phone, used_at__isnull=True).update(used_at=now)
        OtpCode.objects.create(
            phone=phone,
            code_hash=make_password(code),
            expires_at=now + timedelta(seconds=settings.OTP_TTL_SECONDS),
        )
        transaction.on_commit(lambda: send_otp_task.delay(phone, code, language))
    return IssuedCode(expires_in=settings.OTP_TTL_SECONDS, resend_in=settings.OTP_RESEND_SECONDS)


def verify_code(phone: str, code: str) -> None:
    """Marca el código como usado o lanza InvalidCode. Mismo error para todos los fallos."""
    # El error se lanza fuera de la transacción: si no, se revertiría el contador de intentos.
    with transaction.atomic():
        otp = (
            OtpCode.objects.select_for_update()
            .filter(phone=phone, used_at__isnull=True, expires_at__gt=timezone.now())
            .first()
        )
        if otp is None or otp.attempts >= settings.OTP_MAX_ATTEMPTS:
            valid = False
        elif check_password(code, otp.code_hash):
            otp.used_at = timezone.now()
            otp.save(update_fields=["used_at"])
            valid = True
        else:
            otp.attempts += 1
            otp.save(update_fields=["attempts"])
            valid = False
    if not valid:
        raise InvalidCode()

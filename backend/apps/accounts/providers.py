"""Envío de códigos OTP. El proveedor se elige con la variable OTP_PROVIDER."""

import logging
from base64 import b64encode
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.utils.translation import gettext as _

logger = logging.getLogger(__name__)


def _message(code: str) -> str:
    return _("Tu código de Trueke es %(code)s. No lo compartas con nadie.") % {"code": code}


def send_console(phone: str, code: str) -> None:
    # Solo desarrollo: el código aparece en los logs del backend.
    logger.warning("OTP para %s: %s", phone, code)


def send_twilio(phone: str, code: str) -> None:
    sid, token, sender = settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.TWILIO_FROM_NUMBER
    if not (sid and token and sender):
        raise ImproperlyConfigured("Faltan TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN o TWILIO_FROM_NUMBER.")
    request = Request(
        f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
        data=urlencode({"To": phone, "From": sender, "Body": _message(code)}).encode(),
        headers={"Authorization": "Basic " + b64encode(f"{sid}:{token}".encode()).decode()},
    )
    with urlopen(request, timeout=10) as response:  # noqa: S310 (URL fija de Twilio)
        response.read()


PROVIDERS = {"console": send_console, "twilio": send_twilio}


def send_otp(phone: str, code: str) -> None:
    try:
        provider = PROVIDERS[settings.OTP_PROVIDER]
    except KeyError as exc:
        raise ImproperlyConfigured(f"OTP_PROVIDER desconocido: {settings.OTP_PROVIDER}") from exc
    provider(phone, code)

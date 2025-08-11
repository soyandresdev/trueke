import phonenumbers
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


def normalize_phone(raw: str) -> str:
    """Devuelve el teléfono en formato E.164 (+573001234567) o lanza ValidationError."""
    try:
        number = phonenumbers.parse(raw, settings.PHONE_DEFAULT_REGION)
    except phonenumbers.NumberParseException as exc:
        raise ValidationError(_("Número de teléfono inválido.")) from exc
    if not phonenumbers.is_valid_number(number):
        raise ValidationError(_("Número de teléfono inválido."))
    return phonenumbers.format_number(number, phonenumbers.PhoneNumberFormat.E164)

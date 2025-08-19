from celery import shared_task
from django.utils import translation

from .providers import send_otp


@shared_task(autoretry_for=(OSError,), retry_backoff=True, max_retries=3)
def send_otp_task(phone: str, code: str, language: str | None = None) -> None:
    # El worker no tiene petición: el idioma del SMS llega como argumento.
    with translation.override(language):
        send_otp(phone, code)

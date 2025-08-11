from celery import shared_task

from .providers import send_otp


@shared_task(autoretry_for=(OSError,), retry_backoff=True, max_retries=3)
def send_otp_task(phone: str, code: str) -> None:
    send_otp(phone, code)

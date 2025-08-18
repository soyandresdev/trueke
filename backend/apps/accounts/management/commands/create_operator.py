from django.core.management.base import BaseCommand

from apps.accounts.models import User


class Command(BaseCommand):
    help = "Crea (o actualiza) un operador que entra por OTP. Útil para E2E y para arrancar una instalación."

    def add_arguments(self, parser):
        parser.add_argument("phone")
        parser.add_argument("--first-name", default="")
        parser.add_argument("--last-name", default="")

    def handle(self, *args, phone, first_name, last_name, **options):
        from apps.accounts.phone import normalize_phone

        user, created = User.objects.update_or_create(
            phone=normalize_phone(phone),
            defaults={"role": User.Role.OPERATOR, "first_name": first_name, "last_name": last_name},
        )
        self.stdout.write(f"{'Creado' if created else 'Actualizado'}: {user.phone} (operador)")

from django.core.management.base import BaseCommand

from apps.listings.demo import CATEGORIES
from apps.listings.models import Category


class Command(BaseCommand):
    help = "Crea o actualiza las categorías de demo."

    def handle(self, *args, **options):
        for position, data in enumerate(CATEGORIES):
            category = Category(position=position, **data)
            category.full_clean(validate_unique=False)
            _, created = Category.objects.update_or_create(
                code=data["code"], defaults={**data, "position": position}
            )
            self.stdout.write(f"{'+' if created else '~'} {data['name']}")

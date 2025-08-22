from django.core.management.base import BaseCommand

from apps.listings.images import optimize
from apps.listings.models import ListingImage


class Command(BaseCommand):
    help = (
        "Optimiza las fotos subidas antes de que existiera la optimización (WebP, sin metadatos, miniatura)."
    )

    def handle(self, *args, **options):
        pending = ListingImage.objects.filter(thumbnail="")
        done = 0
        for image in pending.iterator():
            with image.image.open("rb") as original:
                large, thumb = optimize(original)
            old = image.image.name
            image.image.save("foto.webp", large, save=False)
            image.thumbnail.save("miniatura.webp", thumb, save=False)
            image.save(update_fields=["image", "thumbnail"])
            image.image.storage.delete(old)  # el original con metadatos no se conserva
            done += 1
        self.stdout.write(f"Fotos optimizadas: {done}")

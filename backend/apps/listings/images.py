"""Fotos de las publicaciones: se guardan optimizadas y sin metadatos.

Las fotos de móvil traen EXIF (a veces con la ubicación GPS de la casa) y pesan varios MB.
Cada foto subida se endereza según su orientación, se le quitan todos los metadatos y se guarda
en WebP en dos tamaños: grande (detalle) y miniatura (listas y panel).
"""

from io import BytesIO

from django.core.files.base import ContentFile
from PIL import Image, ImageOps

LARGE_SIZE = 1600
THUMB_SIZE = 480
LARGE_QUALITY = 82
THUMB_QUALITY = 72


def _webp(image: Image.Image, max_size: int, quality: int) -> ContentFile:
    copy = image.copy()
    copy.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)  # solo reduce, nunca amplía
    buffer = BytesIO()
    # Sin `exif=` ni `icc_profile=`: el archivo nuevo no lleva metadatos.
    copy.save(buffer, format="WEBP", quality=quality, method=6)
    return ContentFile(buffer.getvalue())


def optimize(file) -> tuple[ContentFile, ContentFile]:
    """Devuelve (grande, miniatura) en WebP, sin metadatos y con la orientación aplicada."""
    file.seek(0)
    with Image.open(file) as source:
        image = ImageOps.exif_transpose(source)
        # WebP admite transparencia; el resto de modos (CMYK, P…) se pasa a RGB(A).
        image = image.convert("RGBA" if "A" in image.getbands() or "transparency" in image.info else "RGB")
    return _webp(image, LARGE_SIZE, LARGE_QUALITY), _webp(image, THUMB_SIZE, THUMB_QUALITY)

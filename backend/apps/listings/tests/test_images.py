import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.urls import reverse
from PIL import Image

from apps.listings.models import ListingImage

from .factories import ListingFactory

pytestmark = pytest.mark.django_db


def photo_with_gps(width=4000, height=3000, orientation=6, fmt="JPEG", mode="RGB"):
    """Foto de móvil: grande, girada por EXIF (Orientation=6: 90°) y con ubicación GPS."""
    image = Image.new(mode, (width, height), (200, 30, 30, 128) if mode == "RGBA" else (200, 30, 30))
    exif = Image.Exif()
    exif[0x0112] = orientation  # Orientation
    exif[0x8825] = {1: "N", 2: (4.0, 36.0, 0.0), 3: "W", 4: (74.0, 4.0, 0.0)}  # GPSInfo (Bogotá)
    buffer = io.BytesIO()
    image.save(buffer, fmt, exif=exif.tobytes() if fmt == "JPEG" else None)
    name = "IMG_1234.jpg" if fmt == "JPEG" else "logo.png"
    return SimpleUploadedFile(name, buffer.getvalue(), content_type=f"image/{fmt.lower()}")


def upload(api, listing, file):
    api.force_authenticate(listing.seller)
    return api.post(reverse("listing-images", args=[listing.pk]), {"image": file}, format="multipart")


def test_upload_is_rotated_resized_and_without_metadata(api):
    listing = ListingFactory()
    response = upload(api, listing, photo_with_gps())
    assert response.status_code == 201, response.data

    stored = ListingImage.objects.get()
    with Image.open(stored.image.open("rb")) as large:
        assert large.format == "WEBP"
        assert large.size == (1200, 1600)  # girada (vertical) y reducida a 1600 px
        assert not large.getexif()  # sin EXIF: ni orientación ni GPS
        assert "exif" not in large.info
    with Image.open(stored.thumbnail.open("rb")) as thumb:
        assert thumb.format == "WEBP" and max(thumb.size) == 480
    assert stored.image.name.endswith(".webp") and "IMG_1234" not in stored.image.name
    assert response.data["thumbnail"].endswith(stored.thumbnail.name)


def test_small_photos_are_not_enlarged_and_transparency_is_kept(api):
    listing = ListingFactory()
    upload(api, listing, photo_with_gps(300, 200, fmt="PNG", mode="RGBA"))
    stored = ListingImage.objects.get()
    with Image.open(stored.image.open("rb")) as large:
        assert large.size == (300, 200)
        assert large.mode == "RGBA"


def test_deleting_a_photo_removes_both_files(api):
    listing = ListingFactory()
    upload(api, listing, photo_with_gps(800, 600))
    stored = ListingImage.objects.get()
    names = [stored.image.name, stored.thumbnail.name]
    api.delete(reverse("listing-delete-image", args=[listing.pk, stored.pk]))
    assert not any(stored.image.storage.exists(name) for name in names)


def test_optimize_command_processes_old_photos_and_drops_the_original():
    listing = ListingFactory()
    old = ListingImage(listing=listing)
    old.image.save("vieja.jpg", photo_with_gps(2000, 1000, orientation=1), save=True)
    original = old.image.name

    call_command("optimize_images", stdout=io.StringIO())
    old.refresh_from_db()
    assert old.image.name.endswith(".webp") and old.thumbnail
    assert not old.image.storage.exists(original)
    call_command("optimize_images", stdout=io.StringIO())  # no vuelve a procesar las optimizadas


def test_old_photos_without_thumbnail_use_the_large_one(api):
    listing = ListingFactory()
    old = ListingImage(listing=listing)
    old.image.save("vieja.jpg", photo_with_gps(100, 100, orientation=1), save=True)
    api.force_authenticate(listing.seller)
    data = api.get(reverse("listing-detail", args=[listing.pk])).data["images"][0]
    assert data["thumbnail"] == data["image"]

import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image

from apps.accounts.tests.factories import UserFactory
from apps.listings.models import Listing

from .factories import CategoryFactory, ListingFactory

pytestmark = pytest.mark.django_db


def payload(category, **extra):
    return {
        "category": category.pk,
        "title": "Guitarra acústica",
        "description": "Con estuche.",
        "condition": "like_new",
        "attributes": {"brand": "Yamaha"},
        "city": "Medellín",
        "pickup_address": "Cra 10 # 20-30",
        "is_original": True,
        "terms_accepted": True,
        **extra,
    }


def png(name="foto.png"):
    buffer = io.BytesIO()
    Image.new("RGB", (4, 4), "blue").save(buffer, "PNG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


def detail(listing, suffix=""):
    return reverse(f"listing-{suffix or 'detail'}", args=[listing.pk])


# Crear y editar


def test_listings_require_authentication(api):
    assert api.get(reverse("listing-list")).status_code == 401


def test_create_listing(as_user, seller, category):
    response = as_user(seller).post(reverse("listing-list"), payload(category), format="json")
    assert response.status_code == 201, response.data
    listing = Listing.objects.get()
    assert listing.seller == seller
    assert listing.status == Listing.Status.IN_REVIEW
    assert listing.terms_accepted_at is not None
    assert response.data["available_actions"] == ["cancel"]
    assert list(listing.events.values_list("action", flat=True)) == ["create"]


def test_create_requires_terms(as_user, seller, category):
    response = as_user(seller).post(
        reverse("listing-list"), payload(category, terms_accepted=False), format="json"
    )
    assert response.status_code == 400
    assert "terms_accepted" in response.data


def test_create_ignores_status_and_offer(as_user, seller, category):
    data = payload(category, status="completed", offer_amount="999", seller=UserFactory().pk)
    as_user(seller).post(reverse("listing-list"), data, format="json")
    listing = Listing.objects.get()
    assert listing.status == Listing.Status.IN_REVIEW
    assert listing.offer_amount is None
    assert listing.seller == seller


def test_attributes_are_validated_against_category(as_user, seller, category):
    data = payload(category, attributes={"storage_gb": "mucho", "color": "rojo"})
    response = as_user(seller).post(reverse("listing-list"), data, format="json")
    assert response.status_code == 400
    assert set(response.data["attributes"]) == {"brand", "storage_gb", ""}


def test_inactive_category_is_rejected(as_user, seller):
    category = CategoryFactory(is_active=False)
    response = as_user(seller).post(reverse("listing-list"), payload(category), format="json")
    assert response.status_code == 400


def test_changing_category_revalidates_attributes(as_user, listing):
    other = CategoryFactory(fields_schema={"type": "object", "required": ["kind"]})
    response = as_user(listing.seller).patch(detail(listing), {"category": other.pk}, format="json")
    assert response.status_code == 400
    assert "kind" in response.data["attributes"]


def test_seller_edits_while_in_review(as_user, listing):
    response = as_user(listing.seller).patch(detail(listing), {"title": "Nuevo nombre"}, format="json")
    assert response.status_code == 200
    listing.refresh_from_db()
    assert listing.title == "Nuevo nombre"


def test_seller_cannot_edit_after_review(as_user, listing):
    Listing.objects.filter(pk=listing.pk).update(status=Listing.Status.OFFERED)
    response = as_user(listing.seller).patch(detail(listing), {"title": "x"}, format="json")
    assert response.status_code == 403


def test_operator_cannot_edit_listing(as_user, listing, operator):
    response = as_user(operator).patch(detail(listing), {"title": "x"}, format="json")
    assert response.status_code == 403


def test_no_delete(as_user, listing):
    assert as_user(listing.seller).delete(detail(listing)).status_code == 405


# Visibilidad y filtros


def test_seller_only_sees_own_listings(as_user, listing):
    other = ListingFactory()
    api = as_user(listing.seller)
    ids = [item["id"] for item in api.get(reverse("listing-list")).data["results"]]
    assert ids == [listing.pk]
    assert api.get(detail(other)).status_code == 404
    assert api.get(detail(other, "events")).status_code == 404
    assert api.post(detail(other, "cancel")).status_code == 404


def test_operator_sees_all_and_filters(as_user, operator):
    tech = CategoryFactory(code="tech")
    a = ListingFactory(category=tech, city="Cali", title="iPhone 12")
    b = ListingFactory(status=Listing.Status.OFFERED)
    api = as_user(operator)

    def ids(**params):
        return {item["id"] for item in api.get(reverse("listing-list"), params).data["results"]}

    assert ids() == {a.pk, b.pk}
    assert ids(status="offered") == {b.pk}
    assert ids(status="in_review,offered") == {a.pk, b.pk}
    assert ids(category="tech") == {a.pk}
    assert ids(city="cali") == {a.pk}
    assert ids(q="iphone") == {a.pk}
    assert ids(q=b.seller.phone) == {b.pk}


# Imágenes


def test_upload_and_delete_image(as_user, listing):
    api = as_user(listing.seller)
    response = api.post(detail(listing, "images"), {"image": png()}, format="multipart")
    assert response.status_code == 201, response.data
    image = listing.images.get()
    assert image.image.name.startswith(f"listings/{listing.pk}/")
    assert not image.image.name.endswith("foto.png")
    assert api.get(detail(listing)).data["images"][0]["id"] == image.pk

    url = reverse("listing-delete-image", args=[listing.pk, image.pk])
    name = image.image.name
    assert api.delete(url).status_code == 204
    assert not listing.images.exists()
    assert not image.image.storage.exists(name)


def test_image_must_be_a_real_image(as_user, listing):
    fake = SimpleUploadedFile("foto.png", b"no soy una imagen", content_type="image/png")
    response = as_user(listing.seller).post(detail(listing, "images"), {"image": fake}, format="multipart")
    assert response.status_code == 400


def test_image_extension_and_limit(as_user, listing, settings):
    api = as_user(listing.seller)
    response = api.post(detail(listing, "images"), {"image": png("foto.gif")}, format="multipart")
    assert response.status_code == 400

    settings.LISTING_MAX_IMAGES = 1
    assert api.post(detail(listing, "images"), {"image": png()}, format="multipart").status_code == 201
    assert api.post(detail(listing, "images"), {"image": png()}, format="multipart").status_code == 400


def test_images_only_by_seller_while_editable(as_user, listing, operator):
    assert (
        as_user(operator).post(detail(listing, "images"), {"image": png()}, format="multipart").status_code
        == 403
    )
    Listing.objects.filter(pk=listing.pk).update(status=Listing.Status.ACCEPTED)
    response = as_user(listing.seller).post(detail(listing, "images"), {"image": png()}, format="multipart")
    assert response.status_code == 403

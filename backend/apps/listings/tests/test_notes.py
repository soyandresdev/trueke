import pytest
from django.urls import reverse

from apps.accounts.tests.factories import OperatorFactory
from apps.listings.models import ListingNote
from apps.notifications.models import Notification

from .factories import ListingFactory

pytestmark = pytest.mark.django_db


def url(listing, name):
    return reverse(f"listing-{name}", args=[listing.pk])


# Responsable


def test_an_operator_takes_the_case(as_user, operator, listing):
    response = as_user(operator).post(url(listing, "assign"), {"operator": operator.pk}, format="json")

    assert response.status_code == 200
    assert response.data["assigned_to"] == {"id": operator.pk, "name": operator.get_full_name()}
    listing.refresh_from_db()
    assert listing.assigned_to == operator


def test_taking_your_own_case_does_not_notify_you(as_user, operator, listing):
    as_user(operator).post(url(listing, "assign"), {"operator": operator.pk}, format="json")

    assert not Notification.objects.exists()


def test_handing_a_case_to_someone_tells_them(as_user, operator, listing):
    other = OperatorFactory()

    as_user(operator).post(url(listing, "assign"), {"operator": other.pk}, format="json")

    notification = Notification.objects.get(user=other)
    assert notification.kind == Notification.Kind.LISTING_ASSIGN
    assert notification.actor == operator


def test_the_case_can_be_left(as_user, operator, listing):
    listing.assigned_to = operator
    listing.save()

    response = as_user(operator).post(url(listing, "assign"), {"operator": None}, format="json")

    assert response.data["assigned_to"] is None
    listing.refresh_from_db()
    assert listing.assigned_to is None


def test_only_an_active_operator_can_take_a_case(as_user, operator, seller, listing):
    response = as_user(operator).post(url(listing, "assign"), {"operator": seller.pk}, format="json")

    assert response.status_code == 400
    assert "operator" in response.data


def test_the_seller_neither_assigns_nor_sees_who_has_the_case(as_user, operator, seller, listing):
    listing.assigned_to = operator
    listing.save()
    api = as_user(seller)

    assert api.post(url(listing, "assign"), {"operator": seller.pk}, format="json").status_code == 403
    # En su publicación no hay rastro de la organización interna del equipo.
    assert api.get(reverse("listing-detail", args=[listing.pk])).data["assigned_to"] is None


def test_listings_can_be_filtered_by_who_has_them(as_user, operator, seller, category, listing):
    mine = ListingFactory(seller=seller, category=category, assigned_to=operator)

    api = as_user(operator)
    assert [row["id"] for row in api.get(reverse("listing-list"), {"assigned": "me"}).data["results"]] == [
        mine.pk
    ]
    assert [row["id"] for row in api.get(reverse("listing-list"), {"assigned": "none"}).data["results"]] == [
        listing.pk
    ]


# Notas internas


def test_the_team_writes_and_reads_notes(as_user, operator, listing):
    api = as_user(operator)

    created = api.post(url(listing, "notes"), {"text": "Llamé al vendedor, no contestó."}, format="json")
    assert created.status_code == 201
    assert created.data["author"]["name"] == operator.get_full_name()

    notes = api.get(url(listing, "notes")).data
    assert [note["text"] for note in notes] == ["Llamé al vendedor, no contestó."]


def test_notes_are_newest_first(as_user, operator, listing):
    api = as_user(operator)
    for text in ("primera", "segunda"):
        api.post(url(listing, "notes"), {"text": text}, format="json")

    assert [note["text"] for note in api.get(url(listing, "notes")).data] == ["segunda", "primera"]


def test_the_seller_cannot_see_or_write_notes(as_user, operator, seller, listing):
    ListingNote.objects.create(listing=listing, author=operator, text="Ojo con este caso.")
    api = as_user(seller)

    assert api.get(url(listing, "notes")).status_code == 403
    assert api.post(url(listing, "notes"), {"text": "hola"}, format="json").status_code == 403


def test_a_note_needs_text(as_user, operator, listing):
    assert as_user(operator).post(url(listing, "notes"), {"text": ""}, format="json").status_code == 400

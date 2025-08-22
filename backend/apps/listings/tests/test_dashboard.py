import csv
from datetime import timedelta
from decimal import Decimal

import pytest
from django.urls import reverse
from django.utils import timezone

from apps.listings import transitions
from apps.listings.models import Listing

from .factories import ListingFactory

pytestmark = pytest.mark.django_db

DASHBOARD = reverse("listing-dashboard")
OFFERS = reverse("listing-offers")
EXPORT = reverse("listing-offers-export")


@pytest.fixture
def sold(operator, seller, category, complete_profile):
    """Una publicación recorrida hasta el pago."""
    complete_profile(seller)
    listing = ListingFactory(seller=seller, category=category)
    transitions.record_creation(listing, seller)
    transitions.apply(listing, operator, "offer", amount=Decimal("100"), currency="COP")
    transitions.apply(listing, seller, "accept")
    transitions.apply(listing, operator, "pickup", pickup_by="platform")
    transitions.apply(listing, operator, "complete")
    transitions.apply(listing, operator, "pay", amount=Decimal("100"))
    return listing


# Permisos


def test_dashboard_is_only_for_operators(as_user, seller, operator):
    assert as_user(seller).get(DASHBOARD).status_code == 403
    assert as_user(operator).get(DASHBOARD).status_code == 200


def test_offers_table_is_only_for_operators(as_user, seller, operator):
    assert as_user(seller).get(OFFERS).status_code == 403
    assert as_user(seller).get(EXPORT).status_code == 403
    assert as_user(operator).get(OFFERS).status_code == 200


# Colas de trabajo


def test_queue_counts_what_waits_for_the_operator(as_user, operator, seller, category, listing):
    ListingFactory(seller=seller, category=category, status=Listing.Status.COUNTERED)
    ListingFactory(seller=seller, category=category, status=Listing.Status.COMPLETED)
    ListingFactory(
        seller=seller,
        category=category,
        status=Listing.Status.PICKUP_SENT,
        pickup_date=timezone.localdate(),
    )
    # Una recogida de la semana que viene todavía no es trabajo de hoy.
    ListingFactory(
        seller=seller,
        category=category,
        status=Listing.Status.PICKUP_SENT,
        pickup_date=timezone.localdate() + timedelta(days=7),
    )

    queue = as_user(operator).get(DASHBOARD).data["queue"]
    assert queue == {
        "unoffered": 1,
        "countered": 1,
        "pickups_today": 1,
        "unpaid": 1,
        "oldest_waiting_days": 0,
    }


def test_queue_filters_the_listing_list(as_user, operator, seller, category, listing):
    waiting = ListingFactory(seller=seller, category=category, status=Listing.Status.COUNTERED)

    response = as_user(operator).get(reverse("listing-list"), {"queue": "countered"})
    assert [row["id"] for row in response.data["results"]] == [waiting.pk]


def test_unknown_queue_returns_nothing(as_user, operator, listing):
    response = as_user(operator).get(reverse("listing-list"), {"queue": "inventada"})
    assert response.data["results"] == []


# Embudo y números del periodo


def test_funnel_and_period_follow_the_events(as_user, operator, sold):
    data = as_user(operator).get(DASHBOARD).data

    assert data["funnel"] == {
        "created": 1,
        "offered": 1,
        "accepted": 1,
        "picked_up": 1,
        "completed": 1,
        "paid": 1,
    }
    period = data["period"]
    assert period["created"] == 1
    assert period["acceptance_rate"] == 1.0
    assert period["paid_count"] == 1
    assert Decimal(period["paid_total"]) == Decimal("100")
    assert Decimal(period["offered_total"]) == Decimal("100")
    assert period["hours_to_offer"] == 0.0


def test_period_leaves_out_what_is_older_than_the_window(as_user, operator, sold):
    old = timezone.now() - timedelta(days=60)
    sold.events.update(created_at=old)
    Listing.objects.filter(pk=sold.pk).update(created_at=old)

    data = as_user(operator).get(DASHBOARD).data
    assert data["funnel"]["created"] == 0
    assert data["period"] == {
        "created": 0,
        "offered": 0,
        "accepted": 0,
        "acceptance_rate": None,
        "paid_count": 0,
        "paid_total": "0.00",
        "average_paid": None,
        "offered_total": "0.00",
        "hours_to_offer": None,
    }


# Tabla de ofertas


def test_offer_row_has_the_money_and_the_dates(as_user, operator, sold):
    row = as_user(operator).get(OFFERS).data["results"][0]

    assert row["id"] == sold.pk
    assert row["seller"]["name"] == sold.seller.get_full_name()
    assert row["category"] == sold.category.display_name
    assert Decimal(row["offer_amount"]) == Decimal("100")
    assert Decimal(row["paid_amount"]) == Decimal("100")
    assert row["offered_at"] and row["accepted_at"] and row["paid_at"]


def test_offers_can_be_ordered_by_amount(as_user, operator, seller, category):
    cheap = ListingFactory(seller=seller, category=category, offer_amount=Decimal("10"))
    pricey = ListingFactory(seller=seller, category=category, offer_amount=Decimal("90"))
    without = ListingFactory(seller=seller, category=category)

    rows = as_user(operator).get(OFFERS, {"ordering": "-offer_amount"}).data["results"]
    # Las publicaciones sin oferta van al final, no arriba.
    assert [row["id"] for row in rows] == [pricey.pk, cheap.pk, without.pk]


def test_unknown_ordering_falls_back_to_the_newest(as_user, operator, seller, category):
    first = ListingFactory(seller=seller, category=category)
    second = ListingFactory(seller=seller, category=category)

    rows = as_user(operator).get(OFFERS, {"ordering": "seller__phone"}).data["results"]
    assert [row["id"] for row in rows] == [second.pk, first.pk]


def test_offers_use_the_same_filters_as_the_list(as_user, operator, seller, category):
    ListingFactory(seller=seller, category=category, city="Cali")
    ListingFactory(seller=seller, category=category, city="Bogotá")

    rows = as_user(operator).get(OFFERS, {"city": "cali"}).data["results"]
    assert [row["city"] for row in rows] == ["Cali"]


# CSV


def test_export_returns_a_csv_with_one_row_per_listing(as_user, operator, sold):
    response = as_user(operator).get(EXPORT)

    assert response["Content-Type"].startswith("text/csv")
    assert "attachment" in response["Content-Disposition"]
    rows = list(csv.reader(b"".join(response.streaming_content).decode().splitlines()))
    assert len(rows) == 2
    assert rows[1][0] == str(sold.pk)
    assert rows[1][1] == sold.title


def test_export_respects_the_filters(as_user, operator, seller, category, sold):
    ListingFactory(seller=seller, category=category, city="Cali")

    response = as_user(operator).get(EXPORT, {"city": "cali"})
    rows = list(csv.reader(b"".join(response.streaming_content).decode().splitlines()))
    assert len(rows) == 2
    assert rows[1][3] == "Cali"

from decimal import Decimal

import pytest
from django.urls import reverse

from apps.listings.models import Listing

from .factories import ListingFactory

pytestmark = pytest.mark.django_db

SUMMARY = reverse("listing-summary")


def test_summary_adds_up_what_was_paid_and_what_is_owed(as_user, seller, category):
    ListingFactory(seller=seller, category=category, status=Listing.Status.PAID, paid_amount=Decimal("500"))
    ListingFactory(seller=seller, category=category, status=Listing.Status.PAID, paid_amount=Decimal("300"))
    ListingFactory(
        seller=seller,
        category=category,
        status=Listing.Status.COMPLETED,
        offer_amount=Decimal("200"),
    )
    ListingFactory(seller=seller, category=category, status=Listing.Status.IN_REVIEW)
    ListingFactory(seller=seller, category=category, status=Listing.Status.CANCELLED)

    data = as_user(seller).get(SUMMARY).data
    assert Decimal(data["paid_total"]) == Decimal("800")
    assert Decimal(data["pending_total"]) == Decimal("200")
    assert data["paid_count"] == 2
    # En curso: la completada y la que está en revisión. La cancelada no cuenta.
    assert data["in_progress"] == 2


def test_the_summary_is_only_about_your_own_listings(as_user, seller, category):
    other = ListingFactory(category=category, status=Listing.Status.PAID, paid_amount=Decimal("900"))

    data = as_user(seller).get(SUMMARY).data
    assert Decimal(data["paid_total"]) == 0
    assert other.seller_id != seller.pk


def test_someone_without_listings_gets_zeros(as_user, seller):
    data = as_user(seller).get(SUMMARY).data
    assert (Decimal(data["paid_total"]), data["paid_count"], data["in_progress"]) == (0, 0, 0)


def test_the_summary_needs_a_session(api):
    assert api.get(SUMMARY).status_code == 401

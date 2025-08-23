from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone

from apps.listings import tasks, transitions
from apps.listings.models import Listing
from apps.notifications.models import Notification

from .factories import ListingFactory

pytestmark = pytest.mark.django_db


def waiting(listing, days=0, hours=0):
    """Deja la publicación como si llevara ese tiempo en su estado."""
    when = timezone.now() - timedelta(days=days, hours=hours)
    Listing.objects.filter(pk=listing.pk).update(status_changed_at=when)
    listing.refresh_from_db()
    return listing


@pytest.fixture
def offered(operator, seller, category):
    listing = ListingFactory(seller=seller, category=category)
    transitions.apply(listing, operator, "offer", amount=Decimal("100"), currency="COP")
    return listing


# Publicaciones esperando oferta


def test_reminds_the_team_about_listings_waiting_too_long(operator, listing):
    waiting(listing, hours=50)

    assert tasks.remind_listings_in_review() == 1
    notification = Notification.objects.get(user=operator)
    assert notification.kind == Notification.Kind.LISTING_REVIEW_REMINDER
    assert notification.listing_id == listing.pk


def test_does_not_remind_about_a_recent_listing(operator, listing):
    waiting(listing, hours=2)

    assert tasks.remind_listings_in_review() == 0
    assert not Notification.objects.exists()


def test_reminds_only_once_for_the_same_wait(operator, listing):
    waiting(listing, hours=50)

    assert tasks.remind_listings_in_review() == 1
    assert tasks.remind_listings_in_review() == 0


def test_a_transition_starts_the_wait_again(operator, seller, listing):
    waiting(listing, hours=50)
    tasks.remind_listings_in_review()

    transitions.apply(listing, operator, "offer", amount=Decimal("100"), currency="COP")
    listing.refresh_from_db()
    assert listing.reminded_at is None


# Ofertas sin responder


def test_reminds_the_seller_about_a_pending_offer(seller, offered, settings):
    settings.LISTING_OFFER_EXPIRY_DAYS = 7
    waiting(offered, days=4)

    assert tasks.remind_pending_offers() == 1
    notification = Notification.objects.get(user=seller, kind=Notification.Kind.LISTING_OFFER_REMINDER)
    assert notification.data == {"days_left": 3}


def test_the_reminder_says_nothing_about_dates_without_expiry(seller, offered, settings):
    settings.LISTING_OFFER_EXPIRY_DAYS = 0
    waiting(offered, days=4)

    tasks.remind_pending_offers()
    assert Notification.objects.get(kind=Notification.Kind.LISTING_OFFER_REMINDER).data == {}


def test_a_counteroffer_is_also_waiting_for_an_answer(seller, operator, offered, complete_profile):
    complete_profile(seller)
    transitions.apply(offered, seller, "counter", amount=Decimal("120"))
    waiting(offered, days=4)

    assert tasks.remind_pending_offers() == 1
    assert Notification.objects.filter(kind=Notification.Kind.LISTING_OFFER_REMINDER).count() == 1


# Vencimiento


def test_an_old_offer_expires_and_the_listing_goes_back_to_review(seller, offered):
    waiting(offered, days=8)

    assert tasks.expire_offers() == 1
    offered.refresh_from_db()
    assert offered.status == Listing.Status.IN_REVIEW
    assert offered.offer_amount is None
    # El historial guarda cuánto se había ofertado.
    event = offered.events.get(action="expire")
    assert event.actor is None
    assert event.data["amount"] == "100.00"


def test_the_seller_hears_about_the_expired_offer(seller, offered, django_capture_on_commit_callbacks):
    waiting(offered, days=8)
    # El aviso sale de la señal, que se emite al confirmar la transacción.
    with django_capture_on_commit_callbacks(execute=True):
        tasks.expire_offers()

    assert Notification.objects.filter(user=seller, kind=Notification.Kind.LISTING_EXPIRE).exists()


def test_an_offer_within_the_term_does_not_expire(offered):
    waiting(offered, days=3)

    assert tasks.expire_offers() == 0
    offered.refresh_from_db()
    assert offered.status == Listing.Status.OFFERED


def test_expiry_can_be_turned_off(offered, settings):
    settings.LISTING_OFFER_EXPIRY_DAYS = 0
    waiting(offered, days=40)

    assert tasks.expire_offers() == 0


def test_nobody_can_expire_an_offer_by_hand(as_user, operator, seller, offered):
    for user in (operator, seller):
        assert "expire" not in transitions.available(offered, user)
        with pytest.raises(transitions.TransitionError) as error:
            transitions.apply(offered, user, "expire")
        assert error.value.code == "not_allowed"


def test_the_platform_only_does_its_own_transitions(offered):
    with pytest.raises(transitions.TransitionError) as error:
        transitions.apply(offered, None, "accept")
    assert error.value.code == "not_allowed"


# La tarea completa


def test_the_periodic_task_reports_what_it_did(operator, seller, category, listing, offered):
    waiting(listing, hours=50)
    other = ListingFactory(seller=seller, category=category)
    transitions.apply(other, operator, "offer", amount=Decimal("100"), currency="COP")
    waiting(other, days=8)
    waiting(offered, days=4)

    assert tasks.check_pending() == {"review_reminders": 1, "offer_reminders": 2, "expired": 1}

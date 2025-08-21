from decimal import Decimal

import pytest
from django.urls import reverse

from apps.accounts.tests.factories import OperatorFactory, UserFactory
from apps.listings import transitions
from apps.listings.models import Listing

from .factories import ListingFactory

pytestmark = pytest.mark.django_db

S = Listing.Status

# Datos válidos para cada transición.
DATA = {
    "offer": {"amount": "450000"},
    "accept": {},
    "reject": {"reason": "Muy poco"},
    "pickup": {"pickup_by": "platform", "pickup_date": "2026-10-01", "notes": "Portería"},
    "complete": {},
    "pay": {"amount": "450000", "reference": "TRF-001"},
    "cancel": {"reason": "Ya lo vendí"},
}

# (acción, estado inicial, actor que puede hacerla, estado final)
ALLOWED = [
    ("offer", S.IN_REVIEW, "operator", S.OFFERED),
    ("accept", S.OFFERED, "seller", S.ACCEPTED),
    ("reject", S.OFFERED, "seller", S.CANCELLED),
    ("pickup", S.ACCEPTED, "operator", S.PICKUP_SENT),
    ("complete", S.PICKUP_SENT, "operator", S.COMPLETED),
    ("pay", S.COMPLETED, "operator", S.PAID),
    ("cancel", S.IN_REVIEW, "seller", S.CANCELLED),
    ("cancel", S.IN_REVIEW, "operator", S.CANCELLED),
    ("cancel", S.OFFERED, "seller", S.CANCELLED),
    ("cancel", S.OFFERED, "operator", S.CANCELLED),
]
ALLOWED_KEYS = {(action, source, actor) for action, source, actor, _ in ALLOWED}


@pytest.fixture
def people(complete_profile):
    seller = complete_profile(UserFactory())
    return {"seller": seller, "operator": OperatorFactory(), "stranger": complete_profile(UserFactory())}


def post(api, listing, action, user):
    api.force_authenticate(user)
    return api.post(reverse(f"listing-{action}", args=[listing.pk]), DATA[action], format="json")


@pytest.mark.parametrize(("action", "source", "actor", "target"), ALLOWED)
def test_allowed_transition(api, people, action, source, actor, target):
    listing = ListingFactory(seller=people["seller"], status=source)
    response = post(api, listing, action, people[actor])
    assert response.status_code == 200, response.data
    assert response.data["status"] == target

    listing.refresh_from_db()
    assert listing.status == target
    event = listing.events.get()
    assert (event.action, event.from_status, event.to_status, event.actor) == (
        action,
        source,
        target,
        people[actor],
    )


REFUSED = [
    (action, source, actor)
    for action in transitions.TRANSITIONS
    for source in S.values
    for actor in ["seller", "operator", "stranger"]
    if (action, source, actor) not in ALLOWED_KEYS
]


@pytest.mark.parametrize(("action", "source", "actor"), REFUSED)
def test_everything_else_is_refused(api, people, action, source, actor):
    """Matriz completa: cualquier combinación que no esté en ALLOWED se rechaza sin tocar nada."""
    listing = ListingFactory(seller=people["seller"], status=source)
    response = post(api, listing, action, people[actor])

    if actor == "stranger":
        assert response.status_code == 404  # ni siquiera la ve
    elif transitions.can_act(listing, people[actor], action):
        assert response.status_code == 409
        assert response.data["code"] == "invalid_state"
    else:
        assert response.status_code == 403
        assert response.data["code"] == "not_allowed"
    listing.refresh_from_db()
    assert listing.status == source
    assert not listing.events.exists()


def test_offer_stores_amount_and_currency(api, people, settings):
    listing = ListingFactory(seller=people["seller"])
    post(api, listing, "offer", people["operator"])
    listing.refresh_from_db()
    assert listing.offer_amount == Decimal("450000")
    assert listing.offer_currency == settings.LISTING_CURRENCY


@pytest.mark.parametrize("amount", ["0", "-5", "abc", None])
def test_offer_requires_positive_amount(api, people, amount):
    listing = ListingFactory(seller=people["seller"])
    api.force_authenticate(people["operator"])
    response = api.post(reverse("listing-offer", args=[listing.pk]), {"amount": amount}, format="json")
    assert response.status_code == 400
    listing.refresh_from_db()
    assert listing.status == S.IN_REVIEW


def test_pickup_requires_pickup_by(api, people):
    listing = ListingFactory(seller=people["seller"], status=S.ACCEPTED)
    api.force_authenticate(people["operator"])
    response = api.post(reverse("listing-pickup", args=[listing.pk]), {}, format="json")
    assert response.status_code == 400


def test_pickup_stores_details(api, people):
    listing = ListingFactory(seller=people["seller"], status=S.ACCEPTED)
    post(api, listing, "pickup", people["operator"])
    listing.refresh_from_db()
    assert listing.pickup_by == Listing.PickupBy.PLATFORM
    assert str(listing.pickup_date) == "2026-10-01"
    assert listing.pickup_notes == "Portería"


def test_accept_requires_complete_profile(api):
    listing = ListingFactory(status=S.OFFERED)
    response = post(api, listing, "accept", listing.seller)
    assert response.status_code == 409
    assert response.data["code"] == "profile_incomplete"
    listing.refresh_from_db()
    assert listing.status == S.OFFERED


def test_operator_acts_as_seller_on_own_listing(api):
    operator = OperatorFactory()
    listing = ListingFactory(seller=operator)
    response = post(api, listing, "offer", operator)
    assert response.status_code == 403


def test_available_actions_per_user(api, people):
    listing = ListingFactory(seller=people["seller"], status=S.OFFERED)
    assert transitions.available(listing, people["seller"]) == ["accept", "reject", "cancel"]
    assert transitions.available(listing, people["operator"]) == ["cancel"]
    assert transitions.available(listing, people["stranger"]) == []


def test_full_flow_with_history_and_signal(api, people, django_capture_on_commit_callbacks):
    received = []

    def handler(sender, listing, event, **kwargs):
        received.append((listing.status, event.action))

    transitions.listing_transitioned.connect(handler)
    try:
        listing = ListingFactory(seller=people["seller"])
        with django_capture_on_commit_callbacks(execute=True):
            for action, actor in [
                ("offer", "operator"),
                ("accept", "seller"),
                ("pickup", "operator"),
                ("complete", "operator"),
            ]:
                assert post(api, listing, action, people[actor]).status_code == 200
    finally:
        transitions.listing_transitioned.disconnect(handler)

    assert received == [
        (S.OFFERED, "offer"),
        (S.ACCEPTED, "accept"),
        (S.PICKUP_SENT, "pickup"),
        (S.COMPLETED, "complete"),
    ]
    api.force_authenticate(people["seller"])
    history = api.get(reverse("listing-events", args=[listing.pk])).data
    assert [e["to_status"] for e in history] == ["offered", "accepted", "pickup_sent", "completed"]
    assert history[0]["data"] == {"amount": "450000.00", "currency": "COP"}


def test_signal_not_sent_when_transition_fails(api, people, django_capture_on_commit_callbacks):
    listing = ListingFactory(seller=people["seller"], status=S.COMPLETED)
    with django_capture_on_commit_callbacks() as callbacks:
        post(api, listing, "cancel", people["seller"])
    assert callbacks == []


def test_pay_with_receipt_is_private_and_recorded(api, people, django_capture_on_commit_callbacks):
    from django.core.files.uploadedfile import SimpleUploadedFile

    from apps.notifications.models import Notification

    listing = ListingFactory(seller=people["seller"], status=S.COMPLETED, offer_amount="450000")
    api.force_authenticate(people["operator"])
    receipt = SimpleUploadedFile("transferencia laura.pdf", b"%PDF recibo", content_type="application/pdf")
    with django_capture_on_commit_callbacks(execute=True):
        response = api.post(
            reverse("listing-pay", args=[listing.pk]),
            {"amount": "450000", "reference": "TRF-001", "paid_at": "2026-09-25", "receipt": receipt},
            format="multipart",
        )
    assert response.status_code == 200, response.data
    assert response.data["status"] == "paid"
    assert response.data["has_payment_receipt"] is True
    listing.refresh_from_db()
    assert (str(listing.paid_amount), str(listing.paid_at), listing.payment_reference) == (
        "450000.00",
        "2026-09-25",
        "TRF-001",
    )
    assert "laura" not in listing.payment_receipt.name
    event = listing.events.get()
    assert event.data["receipt"] is True and "transferencia" not in str(event.data)
    assert Notification.objects.get(user=people["seller"]).kind == "listing.pay"

    # El comprobante lo descargan el vendedor y los operadores; nadie más.
    for user, expected in [(people["seller"], 200), (people["operator"], 200), (people["stranger"], 404)]:
        api.force_authenticate(user)
        download = api.get(reverse("listing-receipt", args=[listing.pk]))
        assert download.status_code == expected
        if expected == 200:
            assert b"".join(download.streaming_content) == b"%PDF recibo"


def test_pay_without_date_uses_today_and_rejects_bad_files(api, people):
    from django.core.files.uploadedfile import SimpleUploadedFile
    from django.utils import timezone

    listing = ListingFactory(seller=people["seller"], status=S.COMPLETED)
    api.force_authenticate(people["operator"])
    bad = SimpleUploadedFile("recibo.exe", b"MZ", content_type="application/octet-stream")
    response = api.post(
        reverse("listing-pay", args=[listing.pk]), {"amount": "1", "receipt": bad}, format="multipart"
    )
    assert response.status_code == 400
    response = api.post(reverse("listing-pay", args=[listing.pk]), {"amount": "1000"}, format="json")
    assert response.data["paid_at"] == str(timezone.localdate())
    assert response.data["has_payment_receipt"] is False

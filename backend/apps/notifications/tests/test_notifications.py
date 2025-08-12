from unittest import mock

import pytest
from django.urls import reverse

from apps.accounts.tests.factories import OperatorFactory, UserFactory
from apps.listings.tests.factories import CategoryFactory, ListingFactory
from apps.notifications.models import Notification

pytestmark = pytest.mark.django_db


@pytest.fixture
def operators():
    return [OperatorFactory(), OperatorFactory()]


@pytest.fixture
def listing():
    return ListingFactory()


@pytest.fixture
def run(api, django_capture_on_commit_callbacks):
    """Hace una petición como `user` ejecutando lo que queda para después del commit (Celery en línea)."""

    def request(user, method, url, data=None, **kwargs):
        api.force_authenticate(user)
        with django_capture_on_commit_callbacks(execute=True):
            return getattr(api, method)(url, data, format="json", **kwargs)

    return request


def kinds(user):
    return list(Notification.objects.filter(user=user).values_list("kind", flat=True))


def test_new_listing_notifies_all_operators(run, operators):
    seller = UserFactory()
    data = {
        "category": CategoryFactory().pk,
        "title": "Cámara",
        "description": "Poco uso",
        "condition": "good",
        "attributes": {"brand": "Canon"},
        "city": "Bogotá",
        "pickup_address": "Calle 1",
        "terms_accepted": True,
    }
    assert run(seller, "post", reverse("listing-list"), data).status_code == 201
    for operator in operators:
        assert kinds(operator) == ["listing.create"]
    assert kinds(seller) == []


def test_operator_actions_notify_the_seller(run, listing, operators):
    run(operators[0], "post", reverse("listing-offer", args=[listing.pk]), {"amount": "300000"})
    notification = Notification.objects.get(user=listing.seller)
    assert notification.kind == "listing.offer"
    assert notification.actor == operators[0]
    assert notification.data == {"status": "offered", "amount": "300000.00", "currency": "COP"}
    assert kinds(operators[0]) == kinds(operators[1]) == []


def test_seller_actions_notify_operators(run, listing, operators):
    run(listing.seller, "post", reverse("listing-cancel", args=[listing.pk]), {"reason": "Ya no"})
    for operator in operators:
        assert kinds(operator) == ["listing.cancel"]
    assert kinds(listing.seller) == []


def test_operator_cancel_notifies_seller(run, listing, operators):
    run(operators[0], "post", reverse("listing-cancel", args=[listing.pk]))
    assert kinds(listing.seller) == ["listing.cancel"]


def test_inactive_operators_are_skipped(run, listing):
    inactive = OperatorFactory(is_active=False)
    run(listing.seller, "post", reverse("listing-cancel", args=[listing.pk]))
    assert kinds(inactive) == []


def test_failed_transition_notifies_nobody(run, listing, operators):
    run(listing.seller, "post", reverse("listing-accept", args=[listing.pk]))
    assert not Notification.objects.exists()


def test_messages_group_into_one_unseen_notification(run, listing, operators):
    url = reverse("message-list", args=[listing.pk])
    run(listing.seller, "post", url, {"text": "hola"})
    run(listing.seller, "post", url, {"text": "¿sigue en pie?"})
    notification = Notification.objects.get(user=operators[0])
    assert notification.kind == "message.new"
    assert notification.data["count"] == 2

    # Una vez vista, el siguiente mensaje abre un aviso nuevo.
    run(operators[0], "post", reverse("notification-seen-all"))
    run(listing.seller, "post", url, {"text": "?"})
    assert Notification.objects.filter(user=operators[0]).count() == 2

    run(operators[1], "post", url, {"text": "Sí"})
    assert kinds(listing.seller) == ["message.new"]


def test_list_only_own_and_unseen_filter(run, api, listing, operators):
    run(operators[0], "post", reverse("listing-offer", args=[listing.pk]), {"amount": "1000"})
    run(operators[0], "post", reverse("message-list", args=[listing.pk]), {"text": "hola"})

    api.force_authenticate(listing.seller)
    results = api.get(reverse("notification-list")).data["results"]
    assert [n["kind"] for n in results] == ["message.new", "listing.offer"]
    assert results[1]["listing"] == {"id": listing.pk, "title": listing.title, "status": "offered"}
    assert api.get(reverse("notification-unseen-count")).data == {"count": 2}

    first = results[0]["id"]
    assert api.post(reverse("notification-seen", args=[first])).data == {"updated": 1}
    unseen = api.get(reverse("notification-list"), {"unseen": "true"}).data["results"]
    assert [n["id"] for n in unseen] == [results[1]["id"]]

    api.force_authenticate(operators[1])
    assert api.get(reverse("notification-list")).data["results"] == []
    assert api.post(reverse("notification-seen", args=[first])).data == {"updated": 0}


def test_mark_all_seen(run, api, listing, operators):
    run(operators[0], "post", reverse("listing-offer", args=[listing.pk]), {"amount": "1000"})
    run(operators[0], "post", reverse("message-list", args=[listing.pk]), {"text": "hola"})
    assert run(listing.seller, "post", reverse("notification-seen-all")).data == {"updated": 2}
    assert run(listing.seller, "post", reverse("notification-seen-all")).data == {"updated": 0}
    api.force_authenticate(listing.seller)
    assert api.get(reverse("notification-unseen-count")).data == {"count": 0}


def test_requires_authentication(api):
    assert api.get(reverse("notification-list")).status_code == 401


def test_notifications_are_pushed_to_user_channel(run, listing, operators):
    with mock.patch("apps.notifications.services.broadcast") as broadcast:
        run(operators[0], "post", reverse("listing-offer", args=[listing.pk]), {"amount": "1000"})
    channel, event, data = broadcast.call_args.args
    assert (channel, event, data["kind"]) == (
        f"user.{listing.seller.pk}",
        "notification.created",
        "listing.offer",
    )

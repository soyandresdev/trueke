import uuid
from unittest import mock

import pytest
from django.core.cache import cache
from django.urls import reverse
from rest_framework.throttling import ScopedRateThrottle

from apps.newsletter.models import Subscriber

pytestmark = pytest.mark.django_db


def subscribe(api, email, **headers):
    return api.post(reverse("newsletter-subscribe"), {"email": email}, format="json", **headers)


def test_subscribe_is_public_and_normalizes(api):
    assert subscribe(api, "  Ana@Example.COM ", HTTP_ACCEPT_LANGUAGE="en").status_code == 202
    subscriber = Subscriber.objects.get()
    assert subscriber.email == "ana@example.com"
    assert subscriber.language == "en"


def test_subscribe_twice_is_same_response(api):
    first = subscribe(api, "ana@example.com")
    second = subscribe(api, "ANA@example.com")
    assert first.status_code == second.status_code == 202
    assert first.content == second.content
    assert Subscriber.objects.count() == 1


def test_invalid_email(api):
    assert subscribe(api, "no-es-email").status_code == 400


def test_unsubscribe_and_resubscribe(api):
    subscribe(api, "ana@example.com")
    subscriber = Subscriber.objects.get()
    url = reverse("newsletter-unsubscribe")
    assert api.post(url, {"token": str(subscriber.token)}, format="json").status_code == 204
    subscriber.refresh_from_db()
    assert subscriber.unsubscribed_at is not None

    subscribe(api, "ana@example.com")
    subscriber.refresh_from_db()
    assert subscriber.unsubscribed_at is None


def test_unsubscribe_unknown_token_reveals_nothing(api):
    response = api.post(reverse("newsletter-unsubscribe"), {"token": str(uuid.uuid4())}, format="json")
    assert response.status_code == 204


def test_subscribe_is_throttled(api):
    cache.clear()
    with mock.patch.object(ScopedRateThrottle, "THROTTLE_RATES", {"newsletter": "2/hour"}):
        codes = [subscribe(api, f"u{i}@example.com").status_code for i in range(3)]
    assert codes == [202, 202, 429]

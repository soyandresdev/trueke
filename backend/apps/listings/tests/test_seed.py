import io

import pytest
from django.core.management import CommandError, call_command

from apps.chat.models import Message
from apps.listings.models import Listing, ListingEvent
from apps.notifications.models import Notification

pytestmark = pytest.mark.django_db


def seed(*args):
    out = io.StringIO()
    call_command("seed_demo", *args, stdout=out)
    return out.getvalue()


def test_seed_creates_every_status(settings, django_capture_on_commit_callbacks):
    settings.DEBUG = True
    with django_capture_on_commit_callbacks(execute=True):
        seed()
    assert Listing.objects.count() == 12
    assert set(Listing.objects.values_list("status", flat=True)) == set(Listing.Status.values)
    assert all(listing.images.count() == 1 for listing in Listing.objects.all())
    assert ListingEvent.objects.filter(action="complete").count() == 2
    assert Message.objects.exists()
    assert Notification.objects.exists()


def test_seed_is_not_repeated_without_reset(settings):
    settings.DEBUG = True
    seed()
    assert "Ya hay datos de demo" in seed()
    assert Listing.objects.count() == 12
    seed("--reset")
    assert Listing.objects.count() == 12


def test_seed_refuses_without_debug(settings):
    settings.DEBUG = False
    with pytest.raises(CommandError):
        seed()


def test_seed_in_english_by_default_and_spanish_on_request(settings):
    from apps.accounts.models import User

    settings.DEBUG = True
    seed()
    assert Listing.objects.filter(title="128 GB phone").exists()
    assert set(User.objects.values_list("language", flat=True)) == {"en"}
    seed("--reset", "--language", "es")
    assert Listing.objects.filter(title="Celular de 128 GB").exists()
    assert Message.objects.filter(text__startswith="Hola").exists()
    assert set(User.objects.values_list("language", flat=True)) == {"es"}

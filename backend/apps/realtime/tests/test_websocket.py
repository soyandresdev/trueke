import pytest
from asgiref.sync import sync_to_async
from channels.testing import WebsocketCommunicator
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.tests.factories import OperatorFactory, UserFactory
from apps.listings.tests.factories import ListingFactory
from apps.realtime import consumers
from config.asgi import application

pytestmark = [pytest.mark.asyncio, pytest.mark.django_db(transaction=True)]

ORIGIN = (b"origin", b"http://localhost:5173")


@pytest.fixture
def listing():
    return ListingFactory()


@pytest.fixture
def operator():
    return OperatorFactory()


def token(user):
    return str(RefreshToken.for_user(user).access_token)


async def connect(headers=(ORIGIN,)):
    ws = WebsocketCommunicator(application, "/ws/", headers=list(headers))
    connected, _ = await ws.connect()
    assert connected
    return ws


async def login(user):
    ws = await connect()
    await ws.send_json_to({"type": "auth", "token": token(user)})
    assert await ws.receive_json_from() == {"type": "auth.ok", "user": user.pk}
    return ws


async def subscribe(ws, channel):
    await ws.send_json_to({"type": "subscribe", "channel": channel})
    return await ws.receive_json_from()


async def assert_closed(ws, code=consumers.CLOSE_UNAUTHENTICATED):
    assert await ws.receive_output() == {"type": "websocket.close", "code": code}


async def test_rejects_unknown_origin():
    ws = WebsocketCommunicator(application, "/ws/", headers=[(b"origin", b"https://evil.example")])
    connected, _ = await ws.connect()
    assert not connected


async def test_first_message_must_be_auth():
    ws = await connect()
    await ws.send_json_to({"type": "subscribe", "channel": "listing.1"})
    await assert_closed(ws)


async def test_bad_token_closes():
    ws = await connect()
    await ws.send_json_to({"type": "auth", "token": "no-es-un-jwt"})
    await assert_closed(ws)


async def test_inactive_user_closes(listing):
    user = await sync_to_async(UserFactory)(is_active=False)
    ws = await connect()
    await ws.send_json_to({"type": "auth", "token": token(user)})
    await assert_closed(ws)


async def test_auth_timeout(monkeypatch):
    monkeypatch.setattr(consumers, "AUTH_TIMEOUT_SECONDS", 0.05)
    ws = await connect()
    await assert_closed(ws)


async def test_subscription_permissions(listing, operator):
    other = await sync_to_async(ListingFactory)()
    seller = await sync_to_async(lambda: listing.seller)()

    ws = await login(seller)
    assert await subscribe(ws, f"listing.{listing.pk}") == {
        "type": "subscribed",
        "channel": f"listing.{listing.pk}",
    }
    for channel in [f"listing.{other.pk}", f"user.{operator.pk}", "listing.x", "admin", "listing.1.2"]:
        response = await subscribe(ws, channel)
        assert (response["type"], response["code"]) == ("error", "forbidden"), channel
    await ws.disconnect()

    ws = await login(operator)
    assert (await subscribe(ws, f"listing.{other.pk}"))["type"] == "subscribed"
    await ws.disconnect()


async def test_receives_messages_and_status_changes(listing, operator):
    seller = await sync_to_async(lambda: listing.seller)()
    ws = await login(seller)
    await subscribe(ws, f"listing.{listing.pk}")

    def act():
        api = APIClient()
        api.force_authenticate(seller)
        api.post(reverse("message-list", args=[listing.pk]), {"text": "hola"}, format="json")
        api.force_authenticate(operator)
        api.post(reverse("listing-offer", args=[listing.pk]), {"amount": "100000"}, format="json")

    await sync_to_async(act)()

    message = await ws.receive_json_from(timeout=2)
    assert (message["channel"], message["event"], message["data"]["text"]) == (
        f"listing.{listing.pk}",
        "message.created",
        "hola",
    )
    status = await ws.receive_json_from(timeout=2)
    assert (status["event"], status["data"]["status"]) == ("listing.status", "offered")
    await ws.disconnect()


async def test_unsubscribe_stops_events(listing):
    seller = await sync_to_async(lambda: listing.seller)()
    ws = await login(seller)
    await subscribe(ws, f"listing.{listing.pk}")
    await ws.send_json_to({"type": "unsubscribe", "channel": f"listing.{listing.pk}"})
    assert (await ws.receive_json_from())["type"] == "unsubscribed"

    def act():
        api = APIClient()
        api.force_authenticate(seller)
        api.post(reverse("message-list", args=[listing.pk]), {"text": "hola"}, format="json")

    await sync_to_async(act)()
    assert await ws.receive_nothing(timeout=0.2)
    await ws.disconnect()


async def test_ping_and_unknown_type(listing):
    seller = await sync_to_async(lambda: listing.seller)()
    ws = await login(seller)
    await ws.send_json_to({"type": "ping"})
    assert await ws.receive_json_from() == {"type": "pong"}
    await ws.send_json_to({"type": "hack"})
    assert (await ws.receive_json_from())["code"] == "unknown_type"
    await ws.disconnect()

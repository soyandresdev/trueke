"""WebSocket contra un Redis real (la capa en memoria no reproduce sus timeouts).

Se salta si no hay `TEST_REDIS_URL`. En local: `make test-redis` (usa el Redis de Docker).
En CI siempre corre.
"""

import asyncio
import os

import pytest
from asgiref.sync import sync_to_async
from channels.layers import channel_layers
from channels_redis.core import RedisChannelLayer

from apps.accounts.tests.factories import UserFactory
from apps.realtime.broadcast import broadcast
from config.settings import redis_channel_layer

from .test_websocket import login

REDIS_URL = os.environ.get("TEST_REDIS_URL")

needs_redis = pytest.mark.skipif(not REDIS_URL, reason="Sin TEST_REDIS_URL")


@pytest.fixture
def redis_layer(settings):
    settings.CHANNEL_LAYERS = {"default": redis_channel_layer(REDIS_URL)}
    channel_layers.backends.clear()  # Channels guarda la capa creada; así toma la nueva configuración
    yield
    channel_layers.backends.clear()


def test_read_timeout_is_longer_than_channel_layer_wait():
    host = redis_channel_layer("redis://x")["CONFIG"]["hosts"][0]
    assert host["socket_timeout"] > RedisChannelLayer.brpop_timeout


@needs_redis
@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_idle_websocket_survives_and_keeps_receiving(redis_layer):
    user = await sync_to_async(UserFactory)()
    ws = await login(user)

    # Más que la espera de BZPOPMIN (5 s): con el timeout por defecto de redis-py 8 la conexión moría aquí.
    await asyncio.sleep(RedisChannelLayer.brpop_timeout + 2)
    assert await ws.receive_nothing(timeout=0.1)

    await sync_to_async(broadcast)(f"user.{user.pk}", "notification.created", {"id": 1})
    event = await ws.receive_json_from(timeout=3)
    assert (event["channel"], event["event"]) == (f"user.{user.pk}", "notification.created")
    await ws.disconnect()

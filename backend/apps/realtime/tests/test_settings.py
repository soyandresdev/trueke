import importlib

from channels_redis.core import RedisChannelLayer

import config.settings


def test_redis_read_timeout_is_longer_than_channel_layer_wait(monkeypatch):
    """Si el timeout de lectura no supera la espera de BZPOPMIN, los WebSockets se caen solos."""
    monkeypatch.setenv("REDIS_URL", "redis://redis:6379/0")
    settings = importlib.reload(config.settings)
    try:
        host = settings.CHANNEL_LAYERS["default"]["CONFIG"]["hosts"][0]
        assert host["socket_timeout"] > RedisChannelLayer.brpop_timeout
    finally:
        monkeypatch.delenv("REDIS_URL")
        importlib.reload(config.settings)

"""Envío de eventos al WebSocket.

Los canales tienen la forma `<tipo>.<id>`:
- `user.<id>`: eventos personales (notificaciones). Cada conexión se suscribe sola al suyo.
- `listing.<id>`: cambios de estado y mensajes de una publicación. Hay que suscribirse.
"""

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction


def group_name(channel: str) -> str:
    return f"rt.{channel}"


def broadcast(channel: str, event: str, data: dict) -> None:
    """Envía `event` a todos los suscritos a `channel` cuando la transacción actual se confirma."""

    def send():
        async_to_sync(get_channel_layer().group_send)(
            group_name(channel), {"type": "rt.event", "channel": channel, "event": event, "data": data}
        )

    transaction.on_commit(send)

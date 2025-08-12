"""Un solo WebSocket (`/ws/`) para toda la app.

Protocolo (JSON):
    cliente → {"type": "auth", "token": "<access JWT>"}      primer mensaje, obligatorio
    servidor → {"type": "auth.ok", "user": 7}
    cliente → {"type": "subscribe", "channel": "listing.12"}
    servidor → {"type": "subscribed", "channel": "listing.12"}
    cliente → {"type": "unsubscribe", "channel": "listing.12"}
    servidor → {"type": "event", "channel": "listing.12", "event": "message.created", "data": {...}}
    servidor → {"type": "error", "code": "...", "detail": "..."}

El token va en un mensaje y no en la URL para que no quede en logs de proxies.
"""

import asyncio

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken

from .broadcast import group_name
from .permissions import can_subscribe

AUTH_TIMEOUT_SECONDS = 10
MAX_SUBSCRIPTIONS = 50

# Códigos de cierre (rango 4000-4999 reservado para la aplicación).
CLOSE_UNAUTHENTICATED = 4401


@database_sync_to_async
def authenticate(token):
    auth = JWTAuthentication()
    try:
        user = auth.get_user(auth.get_validated_token(token))
    except (InvalidToken, AuthenticationFailed):
        return None
    return user if user.is_active else None


class RealtimeConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = None
        self.channels_joined: set[str] = set()
        await self.accept()
        self.auth_timer = asyncio.get_running_loop().call_later(
            AUTH_TIMEOUT_SECONDS, lambda: asyncio.ensure_future(self.close(CLOSE_UNAUTHENTICATED))
        )

    async def disconnect(self, code):
        self.auth_timer.cancel()
        for channel in list(self.channels_joined):
            await self.channel_layer.group_discard(group_name(channel), self.channel_name)

    async def receive_json(self, content, **kwargs):
        kind = content.get("type") if isinstance(content, dict) else None
        if self.user is None:
            if kind != "auth":
                return await self.close(CLOSE_UNAUTHENTICATED)
            return await self.handle_auth(content.get("token"))
        if kind == "subscribe":
            return await self.handle_subscribe(content.get("channel"))
        if kind == "unsubscribe":
            return await self.handle_unsubscribe(content.get("channel"))
        if kind == "ping":
            return await self.send_json({"type": "pong"})
        await self.error("unknown_type", "Tipo de mensaje desconocido.")

    async def handle_auth(self, token):
        user = await authenticate(token) if isinstance(token, str) else None
        if user is None:
            return await self.close(CLOSE_UNAUTHENTICATED)
        self.auth_timer.cancel()
        self.user = user
        await self.join(f"user.{user.pk}")
        await self.send_json({"type": "auth.ok", "user": user.pk})

    async def handle_subscribe(self, channel):
        if not isinstance(channel, str) or not await database_sync_to_async(can_subscribe)(
            self.user, channel
        ):
            return await self.error("forbidden", "No puedes suscribirte a este canal.", channel)
        if channel not in self.channels_joined and len(self.channels_joined) >= MAX_SUBSCRIPTIONS:
            return await self.error("too_many", "Demasiadas suscripciones abiertas.", channel)
        await self.join(channel)
        await self.send_json({"type": "subscribed", "channel": channel})

    async def handle_unsubscribe(self, channel):
        if channel in self.channels_joined and channel != f"user.{self.user.pk}":
            await self.channel_layer.group_discard(group_name(channel), self.channel_name)
            self.channels_joined.discard(channel)
        await self.send_json({"type": "unsubscribed", "channel": channel})

    async def join(self, channel):
        await self.channel_layer.group_add(group_name(channel), self.channel_name)
        self.channels_joined.add(channel)

    async def error(self, code, detail, channel=None):
        await self.send_json({"type": "error", "code": code, "detail": detail, "channel": channel})

    async def rt_event(self, message):
        await self.send_json(
            {
                "type": "event",
                "channel": message["channel"],
                "event": message["event"],
                "data": message["data"],
            }
        )

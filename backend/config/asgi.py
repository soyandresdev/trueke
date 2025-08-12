import os

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import OriginValidator
from django.conf import settings
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# Inicializa Django antes de importar consumers.
django_asgi_app = get_asgi_application()

from apps.realtime.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        # La autenticación va dentro del socket (primer mensaje con el JWT), ver apps/realtime/consumers.py.
        "websocket": OriginValidator(URLRouter(websocket_urlpatterns), settings.CORS_ALLOWED_ORIGINS),
    }
)

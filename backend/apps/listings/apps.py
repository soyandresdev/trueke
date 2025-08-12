from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class ListingsConfig(AppConfig):
    name = "apps.listings"
    verbose_name = _("Publicaciones")

    def ready(self):
        from . import receivers  # noqa: F401

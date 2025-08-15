"""Configuración de Trueke. Todo lo que cambia entre entornos viene de variables de entorno."""

from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env")

DEBUG = env.bool("DEBUG", default=False)
SECRET_KEY = env("SECRET_KEY", default="dev-insecure-change-me" if DEBUG else environ.Env.NOTSET)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

INSTALLED_APPS = [
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "drf_spectacular",
    "corsheaders",
    "channels",
    "apps.accounts",
    "apps.listings",
    "apps.chat",
    "apps.notifications",
    "apps.newsletter",
    "apps.realtime",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# Sin DATABASE_URL se usa SQLite: permite correr los tests sin Docker.
DATABASES = {"default": env.db("DATABASE_URL", default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}")}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
]

# Idioma
LANGUAGE_CODE = "es"
LANGUAGES = [("es", "Español"), ("en", "English")]
LOCALE_PATHS = [BASE_DIR / "locale"]
TIME_ZONE = env("TIME_ZONE", default="America/Bogota")
USE_I18N = True
USE_TZ = True

# Archivos
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"
PRIVATE_MEDIA_ROOT = BASE_DIR / "private-media"
PRIVATE_FILE_MAX_MB = env.int("PRIVATE_FILE_MAX_MB", default=5)

# Publicaciones
LISTING_IMAGE_MAX_MB = env.int("LISTING_IMAGE_MAX_MB", default=8)
LISTING_MAX_IMAGES = env.int("LISTING_MAX_IMAGES", default=10)
LISTING_CURRENCY = env("LISTING_CURRENCY", default="COP")
CHAT_FILE_MAX_MB = env.int("CHAT_FILE_MAX_MB", default=10)

S3_BUCKET = env("S3_BUCKET", default="")
if S3_BUCKET:
    _s3 = {
        "bucket_name": S3_BUCKET,
        "endpoint_url": env("S3_ENDPOINT_URL", default=None),
        "access_key": env("S3_ACCESS_KEY", default=None),
        "secret_key": env("S3_SECRET_KEY", default=None),
        "region_name": env("S3_REGION", default=None),
        "custom_domain": env("S3_PUBLIC_DOMAIN", default=None),
    }
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3.S3Storage",
            "OPTIONS": {**_s3, "querystring_auth": False, "location": "public"},
        },
        # Documentos de identidad y certificados: sin acceso público, URLs firmadas que expiran.
        "private": {
            "BACKEND": "storages.backends.s3.S3Storage",
            "OPTIONS": {
                **_s3,
                "custom_domain": None,
                "location": "private",
                "default_acl": "private",
                "querystring_auth": True,
                "querystring_expire": 300,
            },
        },
    }
else:
    STORAGES = {
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "private": {
            "BACKEND": "apps.accounts.files.PrivateFileSystemStorage",
            "OPTIONS": {"location": PRIVATE_MEDIA_ROOT},
        },
    }
STORAGES["staticfiles"] = {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"}

# API
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework_simplejwt.authentication.JWTAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_THROTTLE_RATES": {
        "otp": env("OTP_THROTTLE_RATE", default="10/hour"),
        "newsletter": env("NEWSLETTER_THROTTLE_RATE", default="20/hour"),
    },
}
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env.int("JWT_ACCESS_MINUTES", default=15)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env.int("JWT_REFRESH_DAYS", default=30)),
    "ROTATE_REFRESH_TOKENS": True,
}
SPECTACULAR_SETTINGS = {
    "TITLE": "Trueke API",
    "DESCRIPTION": "API del marketplace Trueke.",
    "VERSION": "0.1.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "ENUM_NAME_OVERRIDES": {"ListingStatusEnum": "apps.listings.models.Listing.Status"},
}
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=["http://localhost:5173"])


# Redis: canales en tiempo real y Celery. Sin REDIS_URL todo corre en memoria y en línea.
def redis_channel_layer(url: str) -> dict:
    # channels_redis espera mensajes con BZPOPMIN bloqueando 5 s; redis-py 8 corta las lecturas a los 5 s
    # por defecto y cada WebSocket moría con "Timeout reading from redis". El timeout debe ser mayor.
    # Lo prueba apps/realtime/tests/test_redis.py contra un Redis real.
    return {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": [{"address": url, "socket_timeout": 30}]},
    }


REDIS_URL = env("REDIS_URL", default="")
if REDIS_URL:
    CHANNEL_LAYERS = {"default": redis_channel_layer(REDIS_URL)}
    CELERY_BROKER_URL = REDIS_URL
else:
    CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}
    CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_IGNORE_RESULT = True

# OTP
OTP_PROVIDER = env("OTP_PROVIDER", default="console")  # console | twilio
OTP_LENGTH = 6
OTP_TTL_SECONDS = env.int("OTP_TTL_SECONDS", default=300)
OTP_MAX_ATTEMPTS = 5
OTP_RESEND_SECONDS = env.int("OTP_RESEND_SECONDS", default=60)
PHONE_DEFAULT_REGION = env("PHONE_DEFAULT_REGION", default="CO")
TWILIO_ACCOUNT_SID = env("TWILIO_ACCOUNT_SID", default="")
TWILIO_AUTH_TOKEN = env("TWILIO_AUTH_TOKEN", default="")
TWILIO_FROM_NUMBER = env("TWILIO_FROM_NUMBER", default="")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": env("LOG_LEVEL", default="INFO")},
}

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

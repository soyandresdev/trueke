<p><a href="../deployment.md">English</a> · <strong>Español</strong></p>

# Despliegue

Trueke en producción son cuatro piezas:

| Pieza | Qué es | Cómo corre |
|---|---|---|
| **Frontend** | Archivos estáticos (`frontend/dist`) | Cualquier servidor estático o CDN, con fallback a `index.html` |
| **Backend** | Django por ASGI (HTTP y WebSocket) | La imagen de `backend/Dockerfile` (`daphne` en el puerto 8000) |
| **Worker** | Celery (envío de OTP y notificaciones) | La misma imagen con `celery -A config worker -l info` |
| **Servicios** | PostgreSQL 16, Redis 7 y un bucket S3 (o compatible) | Los que prefieras, gestionados o propios |

## Recomendado: todo en un mismo dominio

Un proxy (nginx, Caddy…) sirve el frontend y reenvía al backend `/api`, `/ws`, `/admin` y `/static`. Así no hace falta CORS, el WebSocket va por el mismo origen y las cookies del admin funcionan sin configuración extra. Hay un ejemplo completo en [`nginx.conf.example`](../nginx.conf.example).

```sh
# Frontend: sin variables, la app usa su propio origen para /api y /ws
cd frontend && pnpm install --frozen-lockfile && pnpm build   # → dist/

# Backend y worker
docker build -t trueke-backend backend
docker run --env-file prod.env trueke-backend python manage.py migrate
docker run --env-file prod.env -p 8000:8000 trueke-backend
docker run --env-file prod.env trueke-backend celery -A config worker -l info
```

## Variables del backend

| Variable | Ejemplo | Notas |
|---|---|---|
| `DEBUG` | `false` | Obligatorio en producción |
| `SECRET_KEY` | 50+ caracteres aleatorios | Firma los JWT. Sin ella el backend no arranca. |
| `ALLOWED_HOSTS` | `trueke.example` | Separados por coma |
| `CSRF_TRUSTED_ORIGINS` | `https://trueke.example` | Para el admin |
| `CORS_ALLOWED_ORIGINS` | `https://trueke.example` | También decide qué orígenes pueden abrir el WebSocket |
| `DATABASE_URL` | `postgres://user:pass@host:5432/trueke` | |
| `REDIS_URL` | `redis://host:6379/0` | Canales en tiempo real y cola de Celery |
| `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | | Sin `S3_BUCKET` se usa el disco (ver abajo) |
| `S3_ENDPOINT_URL` | `https://<cuenta>.r2.cloudflarestorage.com` | Solo para proveedores distintos de AWS |
| `S3_PUBLIC_DOMAIN` | `cdn.trueke.example` | Opcional: dominio para las fotos públicas |
| `OTP_PROVIDER` | `twilio` | Con `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` |
| `PHONE_DEFAULT_REGION` | `CO` | Región para números sin prefijo |
| `TIME_ZONE` | `America/Bogota` | |
| `LISTING_CURRENCY` | `COP` | Moneda de las ofertas |
| `LISTING_MAX_COUNTEROFFERS` | `2` | Contraofertas que puede hacer un vendedor en una publicación |
| `JWT_ACCESS_MINUTES`, `JWT_REFRESH_DAYS` | `15`, `30` | Duración de la sesión |
| `OTP_THROTTLE_RATE`, `NEWSLETTER_THROTTLE_RATE` | `10/hour`, `20/hour` | Límites por IP |
| `LISTING_IMAGE_MAX_MB`, `LISTING_MAX_IMAGES`, `PRIVATE_FILE_MAX_MB`, `CHAT_FILE_MAX_MB` | `8`, `10`, `5`, `10` | Límites de archivos. Si los cambias, cámbialos también en el frontend (`photoRules.ts`, `DocumentsCard.tsx`, `chat/api.ts`). |
| `LOG_LEVEL` | `INFO` | |

La caché de Django no usa Redis: los límites de peticiones se cuentan por proceso. Con varias réplicas del backend, el límite real es la suma. Si necesitas límites estrictos, configura `CACHES` con Redis.

## Archivos

- **Con S3** (recomendado): el bucket guarda las fotos en `public/` y los documentos en `private/`. Solo `public/` debe ser legible sin firma; los documentos se entregan con URLs firmadas de 5 minutos.
- **Sin S3**: los archivos van a `MEDIA_ROOT` y `PRIVATE_MEDIA_ROOT`, que deben ser volúmenes persistentes. El proxy sirve `/media` directamente desde `MEDIA_ROOT` (el backend solo lo hace con `DEBUG`). `PRIVATE_MEDIA_ROOT` **nunca** debe servirse: lo entrega la API con permisos.

## Frontend en otro dominio

Si la API vive en otro dominio (p. ej. `api.trueke.example`), compila el frontend con:

```sh
VITE_API_URL=https://api.trueke.example VITE_WS_URL=wss://api.trueke.example/ws/ pnpm build
```

y en el backend pon el dominio del frontend en `CORS_ALLOWED_ORIGINS`.

## Primer arranque

```sh
python manage.py migrate
python manage.py createsuperuser                 # admin con contraseña
python manage.py create_operator 3001234567      # operadores (entran por OTP)
python manage.py load_demo_categories            # opcional: las 4 categorías de ejemplo
```

Si actualizas desde la 0.1.0 y ya tienes fotos, ejecuta una vez `python manage.py optimize_images` después de `migrate`. Crea las versiones WebP y las miniaturas, y borra los originales con sus metadatos.

Las categorías se gestionan en el admin. Cada una define sus campos extra con un JSON Schema de tipo `object`: `title` y `x-title-en` para los textos, y `x-labels` / `x-labels-en` para las opciones de un `enum`. Ejemplos en `backend/apps/listings/demo.py`.

## Antes de abrir al público

- [ ] `DEBUG=false` y un `SECRET_KEY` propio y secreto.
- [ ] HTTPS en el proxy, que debe enviar `X-Forwarded-Proto` (Django lo usa para saber que la petición es segura).
- [ ] `OTP_PROVIDER=twilio` probado con un número real. `console` escribe los códigos en los logs.
- [ ] El bucket o el volumen privado no es accesible desde fuera.
- [ ] Copias de seguridad de la base de datos y del almacenamiento privado.
- [ ] Revisa los términos de uso (`frontend/src/features/terms/content.ts`): son una plantilla de ejemplo.

<p><strong>English</strong> · <a href="es/despliegue.md">Español</a></p>

# Deployment

In production, Trueke has four parts:

| Part | What it is | How it runs |
|---|---|---|
| **Frontend** | Static files (`frontend/dist`) | Any static server or CDN, with a fallback to `index.html` |
| **Backend** | Django over ASGI (HTTP and WebSocket) | The image from `backend/Dockerfile` (`daphne` on port 8000) |
| **Worker** | Celery (sends codes and notifications) | The same image with `celery -A config worker -l info` |
| **Services** | PostgreSQL 16, Redis 7 and an S3 bucket (or compatible) | Managed or your own |

## Recommended: everything on one domain

A proxy (nginx, Caddy…) serves the frontend and sends `/api`, `/ws`, `/admin` and `/static` to the backend. This way you don't need CORS, the WebSocket uses the same origin and the admin cookies work without extra settings. There is a full example in [`nginx.conf.example`](nginx.conf.example).

```sh
# Frontend: no settings needed; the app uses its own origin for /api and /ws
cd frontend && pnpm install --frozen-lockfile && pnpm build   # → dist/

# Backend and worker
docker build -t trueke-backend backend
docker run --env-file prod.env trueke-backend python manage.py migrate
docker run --env-file prod.env -p 8000:8000 trueke-backend
docker run --env-file prod.env trueke-backend celery -A config worker -l info
```

## Backend settings

| Variable | Example | Notes |
|---|---|---|
| `DEBUG` | `false` | Required in production |
| `SECRET_KEY` | 50+ random characters | Signs the JWTs. The backend doesn't start without it. |
| `ALLOWED_HOSTS` | `trueke.example` | Comma-separated |
| `CSRF_TRUSTED_ORIGINS` | `https://trueke.example` | For the admin |
| `CORS_ALLOWED_ORIGINS` | `https://trueke.example` | Also decides which origins can open the WebSocket |
| `DATABASE_URL` | `postgres://user:pass@host:5432/trueke` | |
| `REDIS_URL` | `redis://host:6379/0` | Real-time channels and the Celery queue |
| `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | | Without `S3_BUCKET`, files go to disk (see below) |
| `S3_ENDPOINT_URL` | `https://<account>.r2.cloudflarestorage.com` | Only for providers other than AWS |
| `S3_PUBLIC_DOMAIN` | `cdn.trueke.example` | Optional: a domain for the public photos |
| `OTP_PROVIDER` | `twilio` | With `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` |
| `PHONE_DEFAULT_REGION` | `CO` | Region for numbers without a country code |
| `TIME_ZONE` | `America/Bogota` | |
| `LISTING_CURRENCY` | `COP` | Currency of the offers |
| `LISTING_MAX_COUNTEROFFERS` | `2` | Counteroffers a seller can make on one listing |
| `JWT_ACCESS_MINUTES`, `JWT_REFRESH_DAYS` | `15`, `30` | Session length |
| `OTP_THROTTLE_RATE`, `NEWSLETTER_THROTTLE_RATE` | `10/hour`, `20/hour` | Limits per IP address |
| `LISTING_IMAGE_MAX_MB`, `LISTING_MAX_IMAGES`, `PRIVATE_FILE_MAX_MB`, `CHAT_FILE_MAX_MB` | `8`, `10`, `5`, `10` | File limits. If you change them, change them in the frontend too (`photoRules.ts`, `DocumentsCard.tsx`, `chat/api.ts`). |
| `LOG_LEVEL` | `INFO` | |

The Django cache doesn't use Redis, so request limits are counted per process. With several backend copies, the real limit is the sum. If you need exact limits, set `CACHES` to use Redis.

## Files

- **With S3** (recommended): the bucket keeps photos in `public/` and documents in `private/`. Only `public/` should be readable without a signature. Documents are delivered with signed URLs that expire in 5 minutes.
- **Without S3**: files go to `MEDIA_ROOT` and `PRIVATE_MEDIA_ROOT`, which must be persistent volumes. The proxy serves `/media` straight from `MEDIA_ROOT` (the backend only does it with `DEBUG`). **Never** publish `PRIVATE_MEDIA_ROOT`: the API delivers those files with permission checks.

## Frontend on another domain

If the API is on another domain (for example `api.trueke.example`), build the frontend with:

```sh
VITE_API_URL=https://api.trueke.example VITE_WS_URL=wss://api.trueke.example/ws/ pnpm build
```

and put the frontend domain in `CORS_ALLOWED_ORIGINS` on the backend.

## First start

```sh
python manage.py migrate
python manage.py createsuperuser                 # admin with a password
python manage.py create_operator 3001234567      # operators (they log in with a code)
python manage.py load_demo_categories            # optional: the 4 sample categories
```

If you update from 0.1.0 and already have photos, run `python manage.py optimize_images` once after `migrate`. It creates the WebP versions and the thumbnails, and deletes the originals with their metadata.

You manage categories in the admin. Each one defines its extra fields with a JSON Schema of type `object`:
- `title` is the label in Spanish and `x-title-en` in English.
- `x-labels` / `x-labels-en` are the labels of the options of an `enum`.

There are examples in `backend/apps/listings/demo.py`.

## Before going live

- [ ] `DEBUG=false` and your own secret `SECRET_KEY`.
- [ ] HTTPS on the proxy. It must send `X-Forwarded-Proto` (Django uses it to know that the request is secure).
- [ ] `OTP_PROVIDER=twilio` tested with a real phone number. `console` writes the codes in the logs.
- [ ] The private bucket or volume can't be reached from outside.
- [ ] Backups of the database and the private storage.
- [ ] Review the terms of use (`frontend/src/features/terms/content.ts`): they are only a sample.

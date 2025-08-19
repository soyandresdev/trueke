<p><strong>English</strong> · <a href="es/instalacion.md">Español</a></p>

# Installation

You can run Trueke on your computer in two ways: with Docker (one command) or without Docker (faster when you work on the code).

## With Docker

You need Docker with Compose.

```sh
make dev     # frontend, backend, Celery worker, Postgres and Redis
make seed    # in another terminal: demo data
```

| What | Where |
|---|---|
| App | http://localhost:5173 |
| API (Swagger) | http://localhost:8000/api/docs/ |
| Django admin | http://localhost:8000/admin/ (create a user with `make superuser`) |

The first time takes a few minutes: Docker builds the backend image and installs the frontend packages inside the container.

### Log in

You log in with a phone number and a 6-digit code (OTP). In development the code is not sent by SMS. You can find it in the logs:

```sh
docker compose logs -f backend worker | grep OTP
```

`make seed` creates these accounts:

| Phone | Who | Use it to see |
|---|---|---|
| `300 000 0001` | Sara, operator | The operator panel: all listings, offers, pickups |
| `300 000 0002` | Laura, seller with a complete profile | Her listings in every status, accepting offers, chat |
| `300 000 0003` | Mateo, seller without documents | The "incomplete profile" message |

The demo data is in English. For Spanish data, run `make seed ARGS="--language es"`. To go back to the original demo data, add `--reset`: `make seed ARGS=--reset`.

The app is in English by default. You can switch to Spanish with the selector in the header, and each account's profile language is used when the person logs in.

To try the operator and the seller at the same time in one browser, use `http://localhost:5173` for one and `http://127.0.0.1:5173` for the other. They are different origins, so each one keeps its own session.

## Without Docker

You need [uv](https://docs.astral.sh/uv/) and Node 24 with pnpm. Without `DATABASE_URL` the backend uses SQLite. Without `REDIS_URL` the real-time channels run in memory and Celery tasks run right away. So you don't need anything else.

```sh
# Terminal 1: backend at http://localhost:8000
cd backend
cp .env.example .env
uv run python manage.py migrate
uv run python manage.py seed_demo            # --language es for Spanish data
uv run python manage.py runserver

# Terminal 2: frontend at http://localhost:5173
cd frontend
pnpm install
pnpm dev
```

Vite sends `/api`, `/media` and `/ws` to the backend (proxy), so you don't need to set up CORS in development.

## Commands

| Command | What it does |
|---|---|
| `make test` | Backend tests (pytest) and frontend tests (Vitest) |
| `make test-redis` | WebSocket tests against the Redis in Docker (needs `make dev` running) |
| `make e2e` | End-to-end tests with Playwright (starts its own backend and frontend) |
| `make lint` / `make format` | ruff, oxlint, oxfmt and TypeScript |
| `make api` | Rebuilds the frontend types from the OpenAPI schema |
| `make messages` | Updates and compiles the backend translations (needs gettext) |
| `make categories` | Loads or updates the 4 demo categories |
| `make seed` | Demo data (`ARGS=--reset` to rebuild it, `ARGS="--language es"` for Spanish) |
| `make superuser` | Creates a user with a password for the admin |

To rebuild the screenshots and the GIF of the documentation, in English and Spanish: `cd frontend && pnpm screenshots` (needs ffmpeg).

## Create an operator

Operators log in with a code, the same as sellers. To give a phone number the operator role:

```sh
cd backend && uv run python manage.py create_operator 3001234567 --first-name Ana --last-name Perez --language en
```

With Docker: `docker compose run --rm backend python manage.py create_operator …`.

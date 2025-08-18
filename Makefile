.PHONY: e2e messages dev down logs test test-back test-front test-redis lint lint-back lint-front format api migrate makemigrations superuser shell categories seed

dev:            ## Levanta todo: frontend (http://localhost:5173), backend, worker, Postgres, Redis
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f backend worker frontend

test: test-back test-front

test-back:      ## Tests del backend (SQLite en memoria, sin Docker)
	cd backend && uv run pytest

test-redis:     ## Tests del WebSocket contra el Redis de Docker (necesita `make dev` corriendo)
	cd backend && TEST_REDIS_URL=redis://localhost:6379/1 uv run pytest apps/realtime

e2e:            ## Pruebas de extremo a extremo (levanta su propio backend y frontend en 8011/5174)
	cd frontend && pnpm e2e

test-front:
	cd frontend && pnpm test

lint: lint-back lint-front

lint-back:
	cd backend && uv run ruff check . && uv run ruff format --check .

lint-front:
	cd frontend && pnpm lint && pnpm exec oxfmt --check . && pnpm typecheck

format:
	cd backend && uv run ruff format . && uv run ruff check --fix .
	cd frontend && pnpm format

messages:       ## Actualiza y compila las traducciones del backend (necesita gettext)
	cd backend && SECRET_KEY=x uv run python manage.py makemessages -l en --ignore=.venv --ignore="*/tests/*" --ignore="*/migrations/*"
	cd backend && SECRET_KEY=x uv run python manage.py compilemessages -l en --ignore=.venv

api:            ## Regenera frontend/src/api/schema.d.ts desde el esquema OpenAPI del backend
	cd frontend && pnpm api:generate

migrate:
	docker compose run --rm backend python manage.py migrate

makemigrations:
	cd backend && uv run python manage.py makemigrations

superuser:      ## Crea un operador con contraseña para el admin
	docker compose run --rm backend python manage.py createsuperuser

shell:
	docker compose run --rm backend python manage.py shell

categories:     ## Carga las 4 categorías de demo (idempotente)
	docker compose run --rm backend python manage.py load_demo_categories

seed:           ## Datos de demo: usuarios, 12 publicaciones en todos los estados, mensajes (--reset para rehacer)
	docker compose run --rm backend python manage.py seed_demo $(ARGS)

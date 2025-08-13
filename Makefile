.PHONY: dev down logs test lint format migrate makemigrations superuser shell categories seed

dev:            ## Levanta todo (backend, worker, Postgres, Redis)
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f backend worker

test:           ## Tests del backend (SQLite en memoria, sin Docker)
	cd backend && uv run pytest

lint:
	cd backend && uv run ruff check . && uv run ruff format --check .

format:
	cd backend && uv run ruff format . && uv run ruff check --fix .

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

# Instalación

Hay dos formas de levantar Trueke en tu máquina: con Docker (un comando) o sin Docker (más rápido para trabajar en el código).

## Con Docker

Requisitos: Docker con Compose.

```sh
make dev     # frontend, backend, worker de Celery, Postgres y Redis
make seed    # en otra terminal: datos de demo
```

| Qué | Dónde |
|---|---|
| App | http://localhost:5173 |
| API (Swagger) | http://localhost:8000/api/docs/ |
| Admin de Django | http://localhost:8000/admin/ (crea un usuario con `make superuser`) |

La primera vez tarda unos minutos: construye la imagen del backend e instala las dependencias del frontend dentro del contenedor.

### Entrar a la app

El login es por teléfono y código de 6 dígitos (OTP). En desarrollo el código no se envía por SMS: aparece en los logs.

```sh
docker compose logs -f backend worker | grep OTP
```

`make seed` crea estas cuentas:

| Teléfono | Quién | Para ver |
|---|---|---|
| `300 000 0001` | Sara, operadora | El panel del operador: todas las publicaciones, ofertas, recogidas |
| `300 000 0002` | Laura, vendedora con perfil completo | Sus publicaciones en todos los estados, aceptar ofertas, chat |
| `300 000 0003` | Mateo, vendedor sin documentos | El aviso de perfil incompleto |

Para volver a los datos de demo originales: `make seed ARGS=--reset`.

Para probar como operadora y como vendedora a la vez en el mismo navegador, usa `http://localhost:5173` para una y `http://127.0.0.1:5173` para la otra: son orígenes distintos y cada uno guarda su propia sesión.

## Sin Docker

Requisitos: [uv](https://docs.astral.sh/uv/), Node 24 con pnpm. Sin `DATABASE_URL` el backend usa SQLite, y sin `REDIS_URL` los canales en tiempo real funcionan en memoria y las tareas de Celery se ejecutan en línea, así que no hace falta nada más.

```sh
# Terminal 1: backend en http://localhost:8000
cd backend
cp .env.example .env
uv run python manage.py migrate
uv run python manage.py seed_demo
uv run python manage.py runserver

# Terminal 2: frontend en http://localhost:5173
cd frontend
pnpm install
pnpm dev
```

Vite hace de proxy de `/api`, `/media` y `/ws` hacia el backend, así que no hay que configurar CORS en desarrollo.

## Comandos

| Comando | Qué hace |
|---|---|
| `make test` | Tests del backend (pytest) y del frontend (Vitest) |
| `make test-redis` | Tests del WebSocket contra el Redis de Docker (con `make dev` corriendo) |
| `make e2e` | Pruebas de extremo a extremo con Playwright (levanta su propio backend y frontend) |
| `make lint` / `make format` | ruff, oxlint, oxfmt y TypeScript |
| `make api` | Regenera los tipos del frontend desde el esquema OpenAPI |
| `make messages` | Actualiza y compila las traducciones del backend (necesita gettext) |
| `make categories` | Carga o actualiza las 4 categorías de demo |
| `make seed` | Datos de demo (`ARGS=--reset` para rehacerlos) |
| `make superuser` | Crea un usuario con contraseña para el admin |

Para regenerar las capturas y el GIF de la documentación: `cd frontend && pnpm capturas` (necesita ffmpeg).

## Crear un operador

Los operadores entran por OTP igual que los vendedores. Para dar ese rol a un teléfono:

```sh
cd backend && uv run python manage.py create_operator 3001234567 --first-name Ana --last-name Pérez
```

Con Docker: `docker compose run --rm backend python manage.py create_operator …`.

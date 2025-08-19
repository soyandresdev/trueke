FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.8 /uv /usr/local/bin/uv
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 UV_PROJECT_ENVIRONMENT=/venv UV_LINK_MODE=copy
WORKDIR /app

COPY pyproject.toml uv.lock ./
# Sin dependencias de desarrollo (pytest, ruff…): los tests corren fuera del contenedor.
RUN uv sync --frozen --no-dev --no-install-project
COPY . .

ENV PATH="/venv/bin:$PATH"
# Estáticos del admin para WhiteNoise (la clave solo se usa durante este paso).
RUN SECRET_KEY=build-only python manage.py collectstatic --noinput -v0
EXPOSE 8000
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]

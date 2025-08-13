<p align="center"><img src="brand/logo/trueke-logo.svg" alt="Trueke" height="64"></p>

**Trueke** es un marketplace open source de "véndenos lo que ya no usas": la persona publica su artículo con fotos, el equipo de la plataforma lo revisa, le hace una oferta por chat y, si la acepta, coordina la recogida y el pago.

> 🚧 En construcción. El plan completo está en [`PLAN.md`](PLAN.md).

## Stack
- **Backend**: Python 3.12, Django 5, Django REST Framework, Channels (WebSockets), PostgreSQL, Redis, Celery.
- **Frontend**: React 19 (con React Compiler), Vite, TypeScript, Tailwind CSS 4, TanStack Query y Router, Zustand, i18next.
- **Infra**: Docker Compose, almacenamiento compatible con S3 en producción.

## Desarrollo
Requisitos: Docker. Para trabajar fuera de Docker: [uv](https://docs.astral.sh/uv/) y Node 24 con pnpm.

```sh
make dev     # frontend en http://localhost:5173, API en http://localhost:8000/api/docs/
make seed    # datos de demo (en otra terminal)
make test    # tests del backend y del frontend
make api     # regenera los tipos de la API para el frontend
```

Para entrar, usa uno de los teléfonos que imprime `make seed`; el código OTP aparece en los logs del backend.

## Marca
Logo, paleta, tipografías e imágenes en [`brand/`](brand/README.md).

## Licencia
[MIT](LICENSE)

<p><a href="CONTRIBUTING.md">English</a> · <strong>Español</strong></p>

# Cómo contribuir

¡Gracias por querer mejorar Trueke! Esta guía resume cómo trabajamos.

## Antes de empezar

- Para errores y mejoras pequeñas, abre directamente un pull request.
- Para algo grande (una pantalla nueva, un cambio de modelo, una dependencia nueva), abre antes un issue y lo hablamos.
- Levanta el proyecto con [`docs/es/instalacion.md`](docs/es/instalacion.md) y lee [`docs/es/arquitectura.md`](docs/es/arquitectura.md).

## Ramas (git flow)

- `main`: versiones publicadas. Solo recibe merges de `release/*` y `hotfix/*`, con tag `vX.Y.Z`.
- `develop`: integración.
- Tu trabajo va en `feature/<nombre>` (o `fix/<nombre>`), creada desde `develop`. El pull request va contra `develop`.

## Antes de abrir el pull request

```sh
make lint     # ruff, oxlint, oxfmt, TypeScript
make test     # pytest y Vitest
make e2e      # si tocaste un flujo de punta a punta
```

El CI corre todo eso y además comprueba que:

- no falten migraciones (`makemigrations --check`);
- los tipos del frontend estén al día con la API (`make api` y commitea `frontend/src/api/`);
- las traducciones del backend estén al día y completas (`make messages`, necesita gettext).

## Criterios

- **Tests con cada cambio.** Backend: pytest en `apps/<app>/tests/`. Frontend: Vitest junto al código (`*.test.tsx`). Un permiso nuevo o una transición nueva van con su test de "quién sí y quién no".
- **Estados de una publicación**: solo por `apps/listings/transitions.py`. Nunca `listing.status = …` en otro sitio.
- **Frontend**:
  - Los datos del servidor viven en TanStack Query, no en `useState` ni en efectos.
  - Un `useEffect` solo sirve para sincronizar con algo externo (DOM, WebSocket, temporizadores).
  - El lint lo vigila, y `src/test/renders.test.tsx` detecta re-renders de más.
- **Textos visibles**:
  - En el frontend, siempre por i18n (`src/i18n/locales/es.json` y `en.json`).
  - En el backend, con `gettext`, y después `make messages` y la traducción al inglés en `backend/locale/en`.
- **Documentación**: la versión principal es la inglesa. Si cambias un documento, actualiza también la copia en español (`docs/es/`, `README.es.md`, `CONTRIBUTING.es.md`), o avisa en el pull request de que falta.
- **Accesibilidad**:
  - Cada campo con su etiqueta.
  - Botones de solo icono con `aria-label`.
  - Nada que funcione solo con el ratón.
- **Marca**: colores, tipografías y componentes del sistema de diseño (`frontend/src/components/ui`, catálogo en `/dev/ui`). Nada de colores sueltos.
- **Comentarios**: explican el porqué, no el qué.

## Mensajes de commit

En inglés o en español, como título corto: `Chat: mark as read on open`. Si hace falta, un párrafo con el porqué.

## Licencia

Al contribuir aceptas que tu aporte se publique con la licencia [MIT](LICENSE) del proyecto.

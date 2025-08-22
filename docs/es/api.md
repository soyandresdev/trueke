<p><a href="../api.md">English</a> · <strong>Español</strong></p>

# API

La referencia completa, generada desde el código, está en **`/api/docs/`** (Swagger) y el esquema OpenAPI en `/api/schema/`. Esta guía explica lo que el esquema no cuenta: cómo se entra, cómo son los errores y el WebSocket.

## Autenticación

Sin contraseñas: teléfono y código de un solo uso.

```http
POST /api/auth/otp/request/      {"phone": "300 123 4567"}
→ 202 {"expires_in": 300, "resend_in": 60}

POST /api/auth/otp/verify/       {"phone": "300 123 4567", "code": "123456"}
→ 200 {"access": "…", "refresh": "…", "created": true, "user": {…}}
```

- El teléfono se normaliza a E.164 con la región por defecto (`PHONE_DEFAULT_REGION`, `CO`).
- Si el teléfono no tiene cuenta, `verify` la crea (`created: true`).
- Los códigos vencen a los 5 minutos, admiten 5 intentos y son de un solo uso. No se puede pedir otro antes de 60 s: responde `429 {"code": "resend_too_soon", "wait": 42}`.
- En el resto de peticiones: `Authorization: Bearer <access>`. El access dura 15 minutos. Con `POST /api/auth/token/refresh/ {"refresh": "…"}` se obtiene otro, y el refresh rota en cada uso.

## Idioma

Se responde en el idioma de `Accept-Language` (`en` por defecto, o `es`): mensajes de error, nombres de categorías, etiquetas y el SMS del código.

## Errores

| Código | Cuándo | Cuerpo |
|---|---|---|
| 400 | Datos inválidos | `{"campo": ["mensaje"]}` (formato de DRF). En `attributes` de una publicación los errores van por campo de la categoría. |
| 401 | Sin sesión o token vencido | `{"detail": "…"}` |
| 403 | Sin permiso para esa acción | `{"code": "not_allowed", "detail": "…"}` en transiciones |
| 404 | No existe **o no es tuyo**: una publicación ajena responde igual que una inexistente | `{"detail": "…"}` |
| 409 | La acción no toca en este estado | `{"code": "invalid_state" \| "profile_incomplete" \| "counter_limit", "detail": "…"}` |
| 429 | Demasiadas peticiones (OTP, newsletter) | `{"detail": "…"}` |

## Endpoints

| Método y ruta | Quién | Qué |
|---|---|---|
| `GET /api/me/` · `PATCH` | cualquiera | Mi perfil (nombre, email, idioma, documento). `profile_complete` indica si ya se le puede pagar. |
| `PATCH /api/me/documents/` | cualquiera | Sube `document_file` y/o `bank_certificate` (multipart; PDF/JPG/PNG, 5 MB) |
| `GET /api/me/documents/{document\|bank-certificate}/` | cualquiera | Descarga mi documento (en S3, redirige a una URL firmada) |
| `GET /api/categories/` | público | Categorías activas con su `fields_schema` (JSON Schema) |
| `GET /api/listings/` | vendedor: las suyas; operador: todas | Filtros: `status` (uno o varios separados por coma), `category` (código), `city`, `q`, `page`, y `queue` para el operador (`unoffered`, `countered`, `pickups_today`, `unpaid`) |
| `POST /api/listings/` | vendedor | Crear. Exige `terms_accepted: true` y valida `attributes` con el esquema de la categoría |
| `GET /api/listings/stats/` | ídem lista | Cuántas hay en cada estado |
| `GET /api/listings/dashboard/` | operador | Colas de trabajo, embudo y números de los últimos 30 días |
| `GET /api/listings/offers/` | operador | Tabla de ofertas. Los mismos filtros y `ordering` (`title`, `city`, `status`, `offer_amount`, `paid_amount`, `created_at`, `offered_at`, con `-` para descendente) |
| `GET /api/listings/offers/export/` | operador | La misma tabla en CSV, sin páginas |
| `GET /api/listings/{id}/` · `PATCH` | vendedor (editar solo en revisión) | Detalle con `available_actions` |
| `POST /api/listings/{id}/images/` · `DELETE …/images/{image_id}/` | vendedor, en revisión | Fotos (JPG/PNG/WebP, 8 MB, hasta 10) |
| `POST /api/listings/{id}/{acción}/` | según la acción | `offer {amount, currency}`, `accept`, `counter {amount}`, `accept-counter`, `reject {reason}`, `pickup {pickup_by, pickup_date, notes}`, `complete`, `pay {amount, paid_at, reference, receipt}` (multipart si hay comprobante), `cancel {reason}` |
| `GET /api/listings/{id}/receipt/` | vendedor y operadores | Comprobante de pago (privado) |
| `GET /api/listings/{id}/events/` | quien la ve | Historial de la publicación |
| `GET /api/listings/{id}/messages/` · `POST` | vendedor y operadores | Chat. Paginado por cursor, del más nuevo al más viejo. Envío JSON o multipart con `attachment`. |
| `POST /api/listings/{id}/messages/read/` | ídem | Marca leídos los mensajes del otro lado |
| `GET /api/listings/{id}/messages/{mid}/attachment/` | ídem | Descarga un adjunto (privado) |
| `GET /api/notifications/` | cualquiera | Mis notificaciones (`?unseen=true`) |
| `GET /api/notifications/unseen-count/` | cualquiera | Contador de la campana |
| `POST /api/notifications/seen-all/` · `POST …/{id}/seen/` | cualquiera | Marcar vistas |
| `GET /api/users/{id}/` · `…/documents/{kind}/` | operador | Perfil y documentos de un vendedor |
| `POST /api/newsletter/subscribe/` · `unsubscribe/` | público | Alta (responde igual exista o no) y baja por token |

## WebSocket

Una sola conexión en `/ws/` para todo. Mensajes JSON:

```jsonc
// 1. Lo primero, en menos de 10 s (si no, se cierra con 4401)
→ {"type": "auth", "token": "<access JWT>"}
← {"type": "auth.ok", "user": 7}          // ya estás suscrito a "user.7"

// 2. Suscribirse a una publicación (solo si la puedes ver)
→ {"type": "subscribe", "channel": "listing.12"}
← {"type": "subscribed", "channel": "listing.12"}
→ {"type": "unsubscribe", "channel": "listing.12"}

// 3. Eventos
← {"type": "event", "channel": "listing.12", "event": "listing.status", "data": {"status": "offered", …}}
← {"type": "event", "channel": "listing.12", "event": "message.created", "data": {<mensaje>}}
← {"type": "event", "channel": "listing.12", "event": "message.read", "data": {…}}
← {"type": "event", "channel": "user.7", "event": "notification.created", "data": {<notificación>}}
← {"type": "event", "channel": "user.7", "event": "notification.seen", "data": {"ids": […]}}

// Otros
→ {"type": "ping"}   ← {"type": "pong"}
← {"type": "error", "code": "forbidden" | "too_many" | "unknown_type", "detail": "…"}
```

- Si el token vence, el servidor cierra con **4401**: renueva el token y reconecta.
- Solo se aceptan conexiones desde los orígenes de `CORS_ALLOWED_ORIGINS`.
- El cliente de referencia está en `frontend/src/realtime/client.ts`: reconexión con espera creciente, suscripciones con contador y renovación del token.

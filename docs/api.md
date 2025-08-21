<p><strong>English</strong> · <a href="es/api.md">Español</a></p>

# API

The full reference, generated from the code, is at **`/api/docs/`** (Swagger). The OpenAPI schema is at `/api/schema/`. This guide explains what the schema doesn't: how to log in, what errors look like, and the WebSocket.

## Login

There are no passwords: you use a phone number and a one-time code.

```http
POST /api/auth/otp/request/      {"phone": "300 123 4567"}
→ 202 {"expires_in": 300, "resend_in": 60}

POST /api/auth/otp/verify/       {"phone": "300 123 4567", "code": "123456"}
→ 200 {"access": "…", "refresh": "…", "created": true, "user": {…}}
```

- The phone number is changed to E.164 format with the default region (`PHONE_DEFAULT_REGION`, `CO`).
- If the phone number has no account, `verify` creates one (`created: true`).
- Codes expire after 5 minutes, allow 5 tries and work only once. You can't ask for a new code within 60 seconds: the API answers `429 {"code": "resend_too_soon", "wait": 42}`.
- For all other requests, send `Authorization: Bearer <access>`. The access token lasts 15 minutes. Get a new one with `POST /api/auth/token/refresh/ {"refresh": "…"}`. The refresh token changes each time you use it.

## Language

The API answers in the language of `Accept-Language`: `en` by default, or `es`. This covers error messages, category names, labels and the SMS with the code.

## Errors

| Code | When | Body |
|---|---|---|
| 400 | Invalid data | `{"field": ["message"]}` (DRF format). For `attributes` of a listing, errors are per category field. |
| 401 | No session or expired token | `{"detail": "…"}` |
| 403 | You can't do this action | `{"code": "not_allowed", "detail": "…"}` for transitions |
| 404 | It doesn't exist **or it isn't yours**: another person's listing answers the same as a missing one | `{"detail": "…"}` |
| 409 | The action isn't possible in this status | `{"code": "invalid_state" \| "profile_incomplete", "detail": "…"}` |
| 429 | Too many requests (OTP, newsletter) | `{"detail": "…"}` |

## Endpoints

| Method and path | Who | What |
|---|---|---|
| `GET /api/me/` · `PATCH` | anyone | My profile (name, email, language, ID). `profile_complete` says if the person can be paid. |
| `PATCH /api/me/documents/` | anyone | Uploads `document_file` and/or `bank_certificate` (multipart; PDF/JPG/PNG, 5 MB) |
| `GET /api/me/documents/{document\|bank-certificate}/` | anyone | Downloads my document (on S3, it redirects to a signed URL) |
| `GET /api/categories/` | public | Active categories with their `fields_schema` (JSON Schema) |
| `GET /api/listings/` | seller: own listings; operator: all | Filters: `status` (one or more, comma-separated), `category` (code), `city`, `q`, `page` |
| `POST /api/listings/` | seller | Create. Needs `terms_accepted: true` and checks `attributes` against the category schema |
| `GET /api/listings/stats/` | same as the list | How many listings are in each status |
| `GET /api/listings/{id}/` · `PATCH` | seller (edit only in review) | Detail with `available_actions` |
| `POST /api/listings/{id}/images/` · `DELETE …/images/{image_id}/` | seller, in review | Photos (JPG/PNG/WebP, 8 MB, up to 10) |
| `POST /api/listings/{id}/{action}/` | depends on the action | `offer {amount, currency}`, `accept`, `reject {reason}`, `pickup {pickup_by, pickup_date, notes}`, `complete`, `pay {amount, paid_at, reference, receipt}` (multipart if there is a receipt), `cancel {reason}` |
| `GET /api/listings/{id}/receipt/` | seller and operators | Payment receipt (private) |
| `GET /api/listings/{id}/events/` | whoever can see it | History of the listing |
| `GET /api/listings/{id}/messages/` · `POST` | seller and operators | Chat. Cursor pagination, newest first. Send JSON, or multipart with `attachment`. |
| `POST /api/listings/{id}/messages/read/` | same | Marks the other side's messages as read |
| `GET /api/listings/{id}/messages/{mid}/attachment/` | same | Downloads an attachment (private) |
| `GET /api/notifications/` | anyone | My notifications (`?unseen=true`) |
| `GET /api/notifications/unseen-count/` | anyone | Number for the bell |
| `POST /api/notifications/seen-all/` · `POST …/{id}/seen/` | anyone | Mark as seen |
| `GET /api/users/{id}/` · `…/documents/{kind}/` | operator | A seller's profile and documents |
| `POST /api/newsletter/subscribe/` · `unsubscribe/` | public | Sign up (same answer whether the email exists or not) and unsubscribe with a token |

## WebSocket

One connection at `/ws/` for everything. Messages are JSON:

```jsonc
// 1. The first message, within 10 s (if not, the server closes with 4401)
→ {"type": "auth", "token": "<access JWT>"}
← {"type": "auth.ok", "user": 7}          // you are now in "user.7"

// 2. Join a listing (only if you can see it)
→ {"type": "subscribe", "channel": "listing.12"}
← {"type": "subscribed", "channel": "listing.12"}
→ {"type": "unsubscribe", "channel": "listing.12"}

// 3. Events
← {"type": "event", "channel": "listing.12", "event": "listing.status", "data": {"status": "offered", …}}
← {"type": "event", "channel": "listing.12", "event": "message.created", "data": {<message>}}
← {"type": "event", "channel": "listing.12", "event": "message.read", "data": {…}}
← {"type": "event", "channel": "user.7", "event": "notification.created", "data": {<notification>}}
← {"type": "event", "channel": "user.7", "event": "notification.seen", "data": {"ids": […]}}

// Other messages
→ {"type": "ping"}   ← {"type": "pong"}
← {"type": "error", "code": "forbidden" | "too_many" | "unknown_type", "detail": "…"}
```

- If the token expires, the server closes with **4401**. Refresh the token and connect again.
- The server only accepts connections from the origins in `CORS_ALLOWED_ORIGINS`.
- The reference client is `frontend/src/realtime/client.ts`: it reconnects with a growing wait, counts subscriptions and refreshes the token.

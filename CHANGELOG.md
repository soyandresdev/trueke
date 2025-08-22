<p><strong>English</strong> · <a href="CHANGELOG.es.md">Español</a></p>

# Changelog

## Unreleased

- **Lighter and safer photos.** Uploaded photos are saved as WebP in two sizes (a large one and a thumbnail for lists), rotated correctly, and without metadata such as the GPS location. Lists load about 8 times less data. For existing photos, run `python manage.py optimize_images`.
- **Counteroffers.** The seller can answer an offer with their own price. The operator can accept it, make a new offer or cancel. The number of rounds is limited (`LISTING_MAX_COUNTEROFFERS`, 2 by default).
- **Payments are recorded.** After the sale is completed, the operator records the payment (amount, date, transfer reference and a private receipt). The listing moves to the new "paid" status and the seller sees it live and can download the receipt.

## 0.1.0 · 2026-09-20

The first version of Trueke.

### For sellers
- Log in with a phone number and a one-time code. No passwords.
- "My account": personal details, language, ID document and bank certificate (private files).
- List an item in 4 steps: category, details with the category's own fields, photos, and pickup address.
- Edit a listing while it is in review, and add or remove photos.
- See every listing with its status, the offer as a ticket, and the full history.
- Accept or decline an offer, or cancel a listing.
- Chat with the Trueke team for each listing, with attachments and read receipts.
- Notification bell and pop-up messages, all in real time.

### For operators
- Panel with search, filters by status, city and category, and pages.
- The seller's profile, contact and documents, to check them and pay them.
- Make offers, arrange the pickup and complete the sale.

### For everyone
- Landing page with how it works, categories, benefits, FAQ and newsletter.
- Terms of use (a sample to adapt) and newsletter unsubscribe.
- English by default, with a full Spanish version: app, API, SMS and documentation.

### Under the hood
- Django 5 + DRF + Channels + Celery. One authenticated WebSocket for everything.
- A single state machine for listings, with permissions for each action and tests for every combination.
- React 19 with React Compiler, TanStack Query and Router. Types generated from the OpenAPI schema.
- Tests: pytest, Vitest (including a render count test), Playwright end-to-end tests, and WebSocket tests against a real Redis in CI.
- `make dev` starts everything with Docker; `make seed` loads demo data in English or Spanish.

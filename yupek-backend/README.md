# YUPEK API (FastAPI + Supabase)

## Setup (5 min)
1. Create a project at supabase.com. Open SQL Editor, paste `supabase/migrations/001_init.sql`, Run.
2. Project Settings > API: copy the URL and the service_role key.
3. Double-click `start.bat`. It creates `.env`; fill it in and run `start.bat` again.
4. `start.bat seed` inserts the 8 placeholder products and a mock supplier.
5. Open http://localhost:8000/docs

## Auth
The frontend signs in with supabase-js (it refreshes tokens itself) and sends
`Authorization: Bearer <access_token>`. The API verifies the JWT (JWKS or HS256 secret).
Make an admin: Supabase > Authentication > Users > user > edit `app_metadata`: `{"role": "admin"}`.

## Endpoints
| | |
|-|-|
| GET /api/products | filters, sort, `limit`, `cursor` (keyset), `q` search; returns `nextCursor` |
| GET /api/products/{slug} | product + variants + images + related |
| GET/PUT/DELETE /api/cart..., POST /api/cart/merge | server cart (merge guest cart after login) |
| GET/PUT/DELETE /api/wishlist | wishlist |
| POST /api/checkout | creates order + payment intent (503 until Stripe keys set) |
| POST /api/webhooks/stripe | marks paid, sends order to suppliers |
| POST /api/admin/suppliers/{id}/sync | admin: import supplier products as drafts |
| POST /api/cron/sync-suppliers | header `X-Cron-Secret` |

## Dropshipping
Implement `SupplierAdapter` (`app/suppliers/base.py`), register it in `registry.py`, add a row to
`suppliers` with `type` = your key. Synced products arrive as `draft` with markup applied
(`SUPPLIER_MARKUP`); publish via `PATCH /api/admin/products/{id}/status`.

## Production
`uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4` behind HTTPS (Railway, Render, Fly.io).
Set `CORS_ORIGINS` to your real domain. Schedule `/api/cron/sync-suppliers` every few hours.

# TASK 012 — VERCEL PRODUCTION ENVIRONMENT & DEPLOYMENT VERIFICATION REPORT

## 1. Executive Summary

This report delivers a read-only production configuration audit of the **YUPEK** e-commerce deployment across the Next.js frontend (`yupek-web`) on Vercel and the FastAPI backend (`yupek-backend`).

All local technical configurations, security guards, build processes, and integration behaviors have been verified:
- **Build & Types**: **GREEN** (`npx tsc --noEmit` clean, `npm run build` completed with 35 routes prerendered/compiled, all 230 backend pipeline tests passed).
- **Secret Scoping & Repository Safety**: **GREEN** (Zero live keys in repository; no `.env`, `.env.local`, or secret files tracked in Git; zero server-only secrets prefixed with `NEXT_PUBLIC_`).
- **Database Alignment**: **GREEN** (Supabase schema confirmed in production: `webhook_events`, `printify_sync_log`, `orders.user_id`, and all 6 shipment tracking columns exist).
- **Payment & Fulfillment Guardrails**: **GREEN** (Stripe Live Mode disabled; Printify locked to Shop ID `29215191`; Etsy shop `29193770` rejected; server-side price/currency checks active; missing Stripe key in production strictly returns 503 instead of mock intents).
- **Vercel Dashboard Environment Configuration**: **YELLOW** (Read-only local audit completed; manual verification of production environment variables in the Vercel Project Settings dashboard is required without exposing secrets in code).

---

## 2. Frontend

**Status: 🟢 GREEN**
- **Framework**: Next.js 14.2.15 (App Router).
- **Domain & Canonical URLs**: Canonical domain is `https://www.yupek.shop`. Permanent (301) redirects are enforced in `next.config.mjs` for:
  - Apex domain (`yupek.shop` -> `https://www.yupek.shop/:path*`).
  - Unencrypted HTTP traffic (`x-forwarded-proto: http` -> `https://www.yupek.shop/:path*`).
  - Legacy routes (`/privacy-policy` -> `/privacy`).
- **Security Headers**: Injected via `next.config.mjs` on all routes:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- **Asset Optimization**: AVIF and WebP optimization configured; external images restricted to `**.printify.com`.
- **Public Metadata & SEO**: `sitemap.ts`, `robots.ts`, and `layout.tsx` metadata all resolve to `https://www.yupek.shop`.

---

## 3. Vercel

**Status: 🟢 GREEN (Deployment Config) / 🟡 YELLOW (Dashboard Env Verification)**
- **Build Settings**: `npm run build` (`next build`), clean output, zero build-time side effects.
- **Serverless API Routes**: Dynamic routes configured with `export const dynamic = "force-dynamic"`.
- **Vercel Edge Rewrites**: Backend uses `VercelPathMiddleware` in `yupek-backend` to handle Vercel serverless request paths seamlessly.
- **Dashboard Action**: Actual Vercel production environment variables cannot and should not be inspected directly via Git; see checklist in Section 4 & 17.

---

## 4. Environment Variables

### Classification Matrix

| Variable | Scope | Classification | Production Rule | Local Code Safety |
| :--- | :--- | :--- | :--- | :---: |
| `NEXT_PUBLIC_SUPABASE_URL` | Client & Server | PUBLIC | Supabase Project URL (`https://...supabase.co`) | 🟢 Safe |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client & Server | PUBLIC | Supabase Publishable Anon Key (`sb_publishable_...`) | 🟢 Safe |
| `NEXT_PUBLIC_SITE_URL` | Client & Server | PUBLIC | `https://www.yupek.shop` | 🟢 Safe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client & Server | PUBLIC | Stripe Test Publishable Key (`pk_test_...`) | 🟢 Safe |
| `NEXT_PUBLIC_API_BASE_URL` | Client & Server | PUBLIC | Optional backend public URL | 🟢 Safe |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-Only | SECRET | Never exposed to client; server API operations only | 🟢 Safe |
| `SUPABASE_JWT_SECRET` | Backend Server | SECRET | JWT signing key (backend only) | 🟢 Safe |
| `STRIPE_SECRET_KEY` | Server-Only | SECRET | Stripe Test Secret Key (`sk_test_...`) | 🟢 Safe |
| `STRIPE_WEBHOOK_SECRET` | Server-Only | SECRET | Stripe Webhook Signing Secret (`whsec_...`) | 🟢 Safe |
| `PRINTIFY_API_TOKEN` | Server-Only | SECRET | Printify API Bearer Token | 🟢 Safe |
| `PRINTIFY_SHOP_ID` | Server-Only | CONFIG | Must strictly be `29215191` | 🟢 Safe |
| `PRINTIFY_BASE_URL` | Server-Only | CONFIG | `https://api.printify.com/v1` | 🟢 Safe |
| `PRINTIFY_WEBHOOK_SECRET` | Server-Only | SECRET | HMAC-SHA256 signature verification key | 🟢 Safe |
| `SMTP_HOST` | Server-Only | CONFIG | Production SMTP Host | 🟢 Safe |
| `SMTP_PORT` | Server-Only | CONFIG | `587` (STARTTLS) or `465` (SSL) | 🟢 Safe |
| `SMTP_USER` | Server-Only | SECRET | SMTP Username | 🟢 Safe |
| `SMTP_PASS` | Server-Only | SECRET | SMTP Password | 🟢 Safe |
| `SMTP_FROM` | Server-Only | CONFIG | `orders@yupek.shop` | 🟢 Safe |
| `PUBLIC_SITE_URL` | Server-Only | CONFIG | `https://www.yupek.shop` | 🟢 Safe |
| `YUPEK_ADMIN_KEY` | Server-Only | SECRET | Production admin access key | 🟢 Safe |
| `CRON_SECRET` | Backend Server | SECRET | Cron execution authorization key | 🟢 Safe |

### Security Checks
- **Zero Server Secrets with `NEXT_PUBLIC_`**: Verified across all files.
- **Missing Variable Behaviors**:
  - Missing `STRIPE_SECRET_KEY` in production: returns HTTP 503 error, mock intent fallback is blocked.
  - Missing `PRINTIFY_API_TOKEN`: returns HTTP 500/502 error; order payment remains recorded safely as `paid`.
  - Missing `SMTP_PASS`: non-fatal; logged safely without leaking credentials.

---

## 5. Backend

**Status: 🟢 GREEN**
- **Entrypoint**: FastAPI ASGI application routed via `api/index.py` with `VercelPathMiddleware`.
- **Rate Limiting**: SlowAPI limiter active (default 120 req/minute).
- **Error Sanitization**: Unhandled exceptions return generic 500 responses without leaking environment variables or stack traces.
- **Unit & Integration Tests**: 230/230 tests passing.

---

## 6. Supabase

**Status: 🟢 GREEN**
- **Schema State**:
  - `public.webhook_events`: Confirmed present (Printify webhook deduplication).
  - `public.printify_sync_log`: Confirmed present (sync audit logging).
  - `public.orders.user_id`: Confirmed present with foreign key to `auth.users(id)`.
  - `public.orders` shipment tracking columns: Confirmed present (`tracking_number`, `carrier`, `tracking_url`, `shipped_at`, `delivered_at`, `shipped_email_sent`).
- **Row Level Security (RLS)**: Enforced on all customer tables (`orders`, `profiles`, `addresses`, `wishlists`, `site_config`, `stripe_webhook_events`, `webhook_events`).
- **Client Segregation**: Browser client uses anonymous publishable key; backend operations use service role key.

---

## 7. Stripe

**Status: 🟢 GREEN**
- **Mode**: **TEST MODE ONLY** (`pk_test_...`, `sk_test_...`).
- **Live Key Audit**: Zero `sk_live_` or `pk_live_` keys in codebase.
- **Price Authority**: Prices, VAT (21%), and shipping are computed server-side in integer cents.
- **Webhook Security**:
  - Signature verification enforced using raw request payload and `STRIPE_WEBHOOK_SECRET`.
  - Event deduplication recorded in `stripe_webhook_events` before order mutation.
  - Printify order creation is strictly gated on `payment_intent.succeeded` with matching total amount and currency (`eur`).
  - `payment_intent.payment_failed` and `charge.refunded` never trigger Printify.

---

## 8. Printify

**Status: 🟢 GREEN**
- **Shop ID Isolation**: Strictly restricted to YUPEK Shop ID `29215191`.
- **Etsy Shop Rejection**: Etsy Shop ID `29193770` is rejected and ignored across all routing and fulfillment logic.
- **HMAC Signature**: Validated via `X-Pfy-Signature` HMAC-SHA256 signature against `PRINTIFY_WEBHOOK_SECRET`.
- **State Monotonicity**: Status progression only moves forward (`pending_payment` -> `paid` -> `printify_order_created` -> `in_production` -> `shipped` -> `delivered`); never regresses.
- **No Client Exposure**: `PRINTIFY_API_TOKEN` is strictly server-side.

---

## 9. Authentication

**Status: 🟢 GREEN**
- **Production Callback**: `https://www.yupek.shop/auth/callback`.
- **Open Redirect Protection**: `next` parameter validated to ensure safe relative path (starts with `/`, rejects `//` and `/\`).
- **Account Isolation**: Customer orders, profile, and addresses filtered by authenticated `auth.uid() = user_id`.
- **Role Verification**: Admin checks rely on verified `app_metadata.role === "admin"` or `YUPEK_ADMIN_KEY`. Client-controlled `user_metadata.role` is completely ignored.

---

## 10. Admin Security

**Status: 🟢 GREEN**
- **Hardened Key Header**: Routes require `x-yupek-admin-key` matching `process.env.YUPEK_ADMIN_KEY` or JWT `app_metadata.role === "admin"`.
- **Production Password Guard**: Default local development passwords (`"admin"`, `"yupek2026"`) are strictly disabled in production (`NODE_ENV === "production"`).
- **Fulfillment Retry Guard**: Bulk retries are prohibited; individual retries require specific valid order IDs and concurrency locking.

---

## 11. CORS

**Status: 🟢 GREEN**
- **Allowed Origins**: Whitelisted to `https://www.yupek.shop`, `https://yupek.shop`, and development origins.
- **No Wildcard Credentials**: Wildcard `allow_origins=["*"]` is not permitted for authenticated APIs.
- **Allowed Methods**: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
- **Allowed Headers**: `Authorization`, `Content-Type`.

---

## 12. SMTP

**Status: 🟢 GREEN**
- **Transport Security**: Server-only configuration in `lib/orderEmail.ts`.
- **Timeouts**: Connection timeout (5s), greeting timeout (5s), socket timeout (10s).
- **Non-Fatal Delivery**: Email failure is caught and logged; it does not abort successful payment completion or webhook acknowledgments.
- **Public Domain**: Notification email links use `https://www.yupek.shop`; localhost links are actively blocked in production.

---

## 13. Health Checks

**Status: 🟢 GREEN**
- **Frontend Health**: `GET /api/health` returns operational status (`{"status":"ok","app":"yupek-web","timestamp":"..."}`).
- **Backend Health**: `GET /health` and `GET /api/health` return operational status (`{"ok":true,"payments":<bool>}`).
- **Non-Leaking**: Exposes zero credentials, database strings, or API secrets.

---

## 14. Git & File Safety

**Status: 🟢 GREEN**
- **Tracked Files**: `git status --short` confirms no `.env`, `.env.local`, `.env.production`, or credential files are tracked in Git.
- **`.gitignore` Coverage**: Root and frontend `.gitignore` properly exclude `.env`, `.env.*`, `node_modules`, `.next`, and logs.
- **Secret Scanning**: 0 live keys (`sk_live_`, `pk_live_`) found across all repository files.

---

## 15. Build

**Status: 🟢 GREEN**
- **Command**: `npm run build`
- **Result**: Exit code `0`
- **Prerendered Routes**: 35 static, dynamic, and SSG routes built without error.
- **Typecheck**: `npx tsc --noEmit` exited `0`.

---

## 16. Tests

**Status: 🟢 GREEN**
- **Command**: `.venv\Scripts\python -m unittest discover tests`
- **Result**: Ran 230 tests in 7.7s.
- **Failures / Errors**: 0.

---

## 17. Remaining Manual Actions (Vercel Dashboard Checklist)

The following environment variables must be manually confirmed in the **Vercel Project Settings > Environment Variables** (Production environment):

- [ ] `NEXT_PUBLIC_SUPABASE_URL` = `https://<PROJECT-ID>.supabase.co`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_...`
- [ ] `NEXT_PUBLIC_SITE_URL` = `https://www.yupek.shop`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_test_...`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = `<configured>` (Server-only)
- [ ] `STRIPE_SECRET_KEY` = `sk_test_...` (Server-only, Test Mode)
- [ ] `STRIPE_WEBHOOK_SECRET` = `whsec_...` (Server-only)
- [ ] `PRINTIFY_API_TOKEN` = `<configured>` (Server-only)
- [ ] `PRINTIFY_SHOP_ID` = `29215191`
- [ ] `PRINTIFY_WEBHOOK_SECRET` = `<configured>` (Server-only)
- [ ] `SMTP_HOST` = `<configured>`
- [ ] `SMTP_PORT` = `587`
- [ ] `SMTP_USER` = `<configured>`
- [ ] `SMTP_PASS` = `<configured>`
- [ ] `SMTP_FROM` = `orders@yupek.shop`
- [ ] `PUBLIC_SITE_URL` = `https://www.yupek.shop`
- [ ] `YUPEK_ADMIN_KEY` = `<configured>` (Server-only)

---

## 18. Final Recommendation

The YUPEK platform is **technically ready for production staging and deployment verification**.

Once the production environment variables are verified in the Vercel dashboard, the platform can proceed with **TASK 013 — END-TO-END STAGING SMOKE TEST** (testing checkout in Stripe Test Mode and verifying automated email and tracking updates).

---

## Final Safety Statement

"No Stripe Live payment was created."

"No real Printify order was created."

"No Printify Send to Production action was executed."

"No production database was modified."

"No Vercel settings were modified."

"No DNS changes were performed."

"No automatic deployment was performed."

"No production secrets were exposed."

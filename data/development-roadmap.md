# TipVan — Development Roadmap

> Build plan for the current architecture: **Lovable frontend (TanStack Start) + separate NestJS backend**, preserving the existing UI.
> Source of truth for requirements: [projeto-gorjetas-qrcode.md](projeto-gorjetas-qrcode.md).

---

## 0. Guiding principles
1. **Keep the frontend appearance exactly.** The Lovable UI ("TipVan", teal `#1D9E75`, £9.99/mo) stays pixel-for-pixel. We replace mock data with real API calls behind the same TypeScript interfaces — never restyle.
2. **Mobile-first.** The customer tip flow is the critical path (scan/lookup → pay in seconds).
3. **Mock → API, not blank delete.** Each mock is removed only when its screen is wired to a working endpoint, so the UI never breaks.
4. **Keyless-first payments.** Build Stripe behind a mock/real gateway so everything runs and is testable before real keys exist.
5. **Incremental & deployable.** Each phase ends shippable.

---

## 1. Tech stack
| Layer | Tech |
|---|---|
| Frontend | TanStack Start + TanStack Router, React 19, Vite, Tailwind v4, shadcn/ui, TanStack Query, react-hook-form + zod, qrcode.react, recharts |
| Backend | **NestJS** (TypeScript), REST under `/api/v1` |
| ORM / DB | Prisma 6 + PostgreSQL (db `tipvan_dev` / `tipvan_test` / `tipvan_prod`) |
| Auth | JWT in httpOnly cookie + bcrypt |
| Payments | Stripe (Connect + Billing + webhooks) via a mock/real gateway |
| Validation | class-validator / zod DTOs |
| Hosting | VPS (Ubuntu) — PM2 (2 processes) behind nginx + Certbot TLS |

## 2. Repo structure
```
/root/projects/Blank/
├── data/        project docs (requirements, this roadmap)
├── frontend/    Lovable "TipVan" app (UI complete, mock data)
└── backend/     NestJS API (scaffolded)
```

## 3. Data model (Prisma — done)
- **Driver** — publicId, email, passwordHash, role(driver|admin), name, company, phone, photoUrl, vanPhotoUrl, city, tagline, verified, yearsActive, deliveries, Stripe fields (accountId, customerId, subscriptionStatus, stripeOnboarded, isActive), timestamps.
- **Tip** — driverId, amount(pence), currency, rating, status(pending|succeeded|failed|refunded), customerName/customerAddress/message, stripePaymentIntentId, createdAt.
- **WebhookEvent** — idempotency for Stripe webhooks.

## 4. Screen → API contract (what each screen will call)
| Screen | Endpoint(s) | Replaces mock |
|---|---|---|
| `index` (landing lookup) | `GET /drivers/:publicId` | — |
| `signup` | `POST /auth/signup` | navigate-only |
| `login` | `POST /auth/login` | navigate-only |
| `dashboard` | `GET /me`, `GET /me/tips`, `GET /me/stats` | `useDriver`, `useTips` |
| `profile` | `GET /me`, `PATCH /me`, `POST /me/photo` | `useDriver` |
| `account` | `GET /me`, `PATCH /me`, `POST /subscription/portal`, cancel | hardcoded email/phone |
| `tip/$driverId` | `GET /drivers/:publicId`, `POST /drivers/:publicId/tips` | `useDriver` |
| `tip/$driverId/success` | (uses returned tip) | random id |
| `admin/*` | `GET /admin/overview`, `GET /admin/drivers`, `GET /admin/transactions` | `useAdminData` |

Auth: `GET /auth/me`, `POST /auth/logout`. Payments: `POST /subscription/checkout`, `POST /connect/onboard`, `GET /connect/status`, `POST /webhooks/stripe`.

---

## 5. Phases & milestones

### ✅ Phase 0 — Foundations (done)
- Monorepo structure (data/frontend/backend); frontend de-git'd.
- NestJS scaffold; Prisma 6 + Postgres `tipvan_dev`; schema + migration; PrismaModule; global prefix `/api/v1`, CORS, cookies, validation; `GET /health`.

### Phase 1 — MVP (the client's $900 milestone)
Goal: a driver can sign up, activate (monthly fee), connect payouts, get a QR; a customer can scan/lookup → tip → success. Deployed.
1. **Auth module** — signup/login/logout/me, JWT cookie, guard. → wire `signup`/`login`/route protection.
2. **Driver service** — `GET /me`, `PATCH /me`, `POST /me/photo` (sharp), `GET /drivers/:publicId` (public). publicId generator. → wire `profile`, landing lookup.
3. **Stripe gateway** (mock/real) — Connect onboard + status; subscription checkout/portal; activation gating. → wire `account` + dashboard gating.
4. **Tips** — `POST /drivers/:publicId/tips` (validate + PaymentIntent + persist), success returns tip. → wire `tip/$driverId` + success (remove `useDriver` mock).
5. **Webhooks** — idempotent: payment_intent.*, account.updated, customer.subscription.*.
6. **Deploy** — both apps under PM2 + nginx + TLS; `tipvan_prod`.

### Phase 2 — Driver dashboard & account (part of $1500 full)
7. **Tips read + stats** — `GET /me/tips`, `GET /me/stats` (total, average, avgRating, perDay 14d, bestDay, 5★ streak). → wire `dashboard` (remove `useTips`).
8. **Account** — contact update, subscription status, cancel via portal. → wire `account`.

### Phase 3 — Admin panel (part of $1500 full)
9. **Admin auth/role** + `GET /admin/overview` (totals, monthly volume), `GET /admin/drivers` (search/filter/paginate), `GET /admin/transactions` (date-range/search/paginate, CSV stays client-side). → wire `admin/*` (remove `useAdminData`).

### Phase 4 — Real payments & go-live
10. Add Stripe **test keys** → mount **Payment Element** (card/Apple/Google Pay) on tip page; verify with test cards; then **live keys**.
11. Terms + Privacy pages (GDPR — optional customer name/address; required by Stripe).

---

## 6. Definition of done per slice
For each endpoint slice: backend unit/e2e test (Jest + supertest) → wire the matching frontend hook/route (remove its mock) → verify the screen renders identically (Playwright/manual on mobile viewport) → no UI regression.

## 7. Deployment (target)
- **backend**: NestJS under PM2 (port 4000).
- **frontend**: TanStack Start under PM2 (port 3000) — or static build if SSR not needed.
- **nginx**: `domain/api/*` → backend:4000, everything else → frontend:3000; Certbot TLS.
- Reuse the server's PostgreSQL; nightly `pg_dump` of `tipvan_prod`.
- Pin test/E2E to `tipvan_test` (never prod) — keep DBs isolated.

## 8. Testing strategy
- **Backend:** Jest unit + e2e (supertest) per module; dedicated `tipvan_test` DB.
- **Frontend:** keep types as the contract; optional Playwright smoke on the customer flow at mobile size.
- Run lint + tests before each deploy.

## 9. Commercial scope mapping (from requirements doc)
- **MVP ($900):** Phase 1 (tip flow + auth + QR + Stripe Connect/subscription + deploy). Monetization = **monthly subscription**, driver keeps 100%. Includes **star rating** + **optional customer identification** (already in the UI).
- **Full ($1500):** + Phase 2 (dashboard/stats) + Phase 3 (admin) + verification, print templates, email notifications, multi-category (incremental).

## 10. Open decisions
- **Brand:** keep "TipVan" (frontend) vs domain `luxerontech.com`? (Assumed: keep TipVan unless told.)
- **Subscription price:** £9.99/mo (from UI) — confirm.
- **Frontend hosting:** SSR (TanStack Start node server) vs static build behind nginx.
- **Stripe keys:** needed for Phase 4 (real payments).

---

## Status
- Phase 0: ✅ done. Currently entering **Phase 1, step 1 (Auth)**.

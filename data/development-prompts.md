# TipVan — Development Prompts

> Sequenced build prompts for a coding agent. Stack: **NestJS backend** + **Lovable TanStack Start frontend**, monorepo (`data/` `frontend/` `backend/`).
> Companion docs: [development-roadmap.md](development-roadmap.md) · [projeto-gorjetas-qrcode.md](projeto-gorjetas-qrcode.md)
> Execute prompts **in order**. Each is self-contained and ends with the **3-Test Gate**.

---

## ⛔ GLOBAL RULES (apply to every prompt)

1. **Preserve the frontend appearance exactly.** Do **not** restyle. Keep TipVan branding, teal `#1D9E75`, layout, copy, EN/PT toggle, validation messages. Only swap the **data source** (mock → API) behind the **existing TypeScript interfaces**.
2. **Replace mocks, never blank-delete.** A mock is removed only once its screen calls a working endpoint, so the UI never renders empty.
3. **API shape must match the frontend types** (`Driver`, `Tip`, `AdminDriver`, `AdminTransaction`, …) so components don't change.
4. **Auth via httpOnly cookie**, sent with `credentials: "include"`; backend CORS allows the frontend origin.
5. **Money in pence** in the DB; convert to pounds (number) at the API boundary to match the UI.
6. **Stripe behind a mock/real gateway** — runs keyless until real keys are set (no code change to switch).

### ⛔ THE RULE — 3 mandatory tests at the END of EVERY prompt
A prompt is **not complete** until all three are done, in this order. Do not start the next prompt until they pass.

1. **Backend API tests.** Automated tests for every endpoint added/changed (Jest + supertest): success cases, validation/errors, and auth/permission gating. Run them; show the output; all green.
2. **Integration test (backend ↔ frontend).** Run backend + frontend together and verify the wired screen actually talks to the API end-to-end (data loads, the action works), and the **UI still looks identical** to before the mock was removed. Use Playwright (preferred) or a clearly documented automated check.
3. **Manual test.** STOP and hand it to the user: report what changed, exactly how to run/see it locally, and the results of tests 1–2. The user manually verifies and approves **before** the next prompt begins.

**Conventions:** backend tests vs `tipvan_test` DB (never prod); a shared API client in `frontend/src/lib/api.ts`; data hooks become thin TanStack Query wrappers over the API, keeping their current return shape.

---

## P0 — Foundations  ✅ (done)
- Monorepo; NestJS scaffold; Prisma 6 + Postgres `tipvan_dev`; schema (Driver/Tip/WebhookEvent) + migration; PrismaModule; `/api/v1` prefix, CORS, cookie-parser, global ValidationPipe; `GET /api/v1/health`.
- **Remaining setup (do first):** frontend `src/lib/api.ts` (fetch wrapper with `credentials:"include"` + `VITE_API_URL`), `.env` with `VITE_API_URL=http://localhost:4000/api/v1`, install `@tanstack/react-query` provider (already in deps).

**➡ 3-Test Gate:** (1) `GET /health` returns `{ok:true}`. (2) Frontend can call `/health` from the browser. (3) Ask user.

---

## P1 — Auth (signup / login / me / logout)
**Backend:** `auth` module — `POST /auth/signup` (name, email, phone, company, password → bcrypt, generate unique `publicId`, create Driver, set JWT cookie), `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`. JWT in httpOnly cookie; `AuthGuard` + `@CurrentUser()`.
**Frontend wiring:** `login.tsx` + `signup.tsx` submit to the API (keep the same zod forms, fields, copy, redirects to `/dashboard`). Add an auth check so `/dashboard`,`/profile`,`/account` redirect to `/login` when `GET /auth/me` is 401. Photo at signup can defer to profile.
**Acceptance:** real account is created and persists; protected routes gate on the cookie.

**➡ 3-Test Gate:** (1) Jest: signup success/duplicate/weak-password, login success/wrong-password, `me` 200/401. (2) Integration: signup in the UI → lands on dashboard authenticated; logout → protected route redirects to login. (3) Ask user.

---

## P2 — Driver profile & public lookup
**Backend:** `drivers` module — `GET /me`, `PATCH /me` (name/company/phone/photo), `POST /me/photo` (sharp → webp, served from `/uploads`), and **public** `GET /drivers/:publicId` (public-safe fields only). Compute `rating`/`ratingsCount` from succeeded tips.
**Frontend wiring:** replace **`useDriver`** with `GET /me` (dashboard/profile) and `GET /drivers/:publicId` (landing lookup + tip page). Remove the `MOCK` driver and the hardcoded `useDriver("5HQN7")`. Landing "find by ID" calls the public endpoint; unknown ID shows the existing error UI. Profile edit + photo persist.
**Acceptance:** profile reads/writes real data; QR (client-side `qrcode.react`) points at the real `publicId` URL.

**➡ 3-Test Gate:** (1) Jest: me get/patch, public profile valid/404, owner-only patch. (2) Integration: profile shows real driver, edit saves, landing lookup → tip page renders real driver (UI unchanged). (3) Ask user.

---

## P3 — Stripe gateway, Connect & subscription gating
**Backend:** `stripe` gateway (mock|real, auto-select by env). `connect` — `POST /connect/onboard`, `GET /connect/status`. `subscription` — `POST /subscription/checkout` (Billing, £9.99/mo), `POST /subscription/portal`, status; activation gating (`isActive`). `me` reflects subscription + payout state.
**Frontend wiring:** `account.tsx` — real email/phone (remove hardcoded), subscription status + Activate/Manage (portal) + Cancel; remove the alert stubs. Dashboard/profile reflect active state. (Keep all UI.)
**Acceptance:** driver activates subscription (mock instant) and connects payouts; gating works.

**➡ 3-Test Gate:** (1) Jest: checkout/portal/activate, status transitions, gating. (2) Integration: account screen activates → shows active + Manage; inactive state shown otherwise. (3) Ask user.

---

## P4 — Tips: create & pay
**Backend:** `tips` module — `POST /drivers/:publicId/tips` (validate amount £0.50–£500, rating 1–5, optional name/address/message; require driver onboarded + active; create PaymentIntent to connected account; persist Tip; mock → succeeded, real → pending). Returns tip + clientSecret + mock flag.
**Frontend wiring:** `tip/$driverId.tsx` submit calls the API; on mock success navigate to `tip/$driverId/success` with the real amount + driver name (remove the random-id mock). Keep presets £1/£2/£5 + "Most popular", custom, stars, personal touch, sticky bar, EN/PT — unchanged.
**Acceptance:** a tip is created and persisted; success page shows real data.

**➡ 3-Test Gate:** (1) Jest: create success, not-accepting (inactive/un-onboarded) → blocked, validation. (2) Integration: full tip flow on a real driver → success (mock). (3) Ask user.

---

## P5 — Stripe webhooks
**Backend:** `POST /webhooks/stripe` — signature verify (real) / trusted JSON (mock), idempotent via `WebhookEvent`; handle `payment_intent.succeeded|failed`, `account.updated`, `customer.subscription.*` → update Tip/onboarding/subscription.
**Frontend:** none.
**Acceptance:** events update DB idempotently.

**➡ 3-Test Gate:** (1) Jest: each handler + idempotency + bad signature → 400. (2) Integration: a subscription-cancel event flips a driver inactive (observable on their public page). (3) Ask user.

---

## P6 — Driver dashboard (tips + stats)
**Backend:** `GET /me/tips` (newest first) and `GET /me/stats` (total, average, avgRating, perDay 14-day buckets, bestDay, fiveStarStreak) — shapes matching `useTips()`.
**Frontend wiring:** replace **`useTips`** with these endpoints. Remove `MOCK_TIPS` + hardcoded `perDay`. Dashboard chart (recharts), totals, tips list render real data — same layout/colors.
**Acceptance:** dashboard shows the signed-in driver's real tips/stats.

**➡ 3-Test Gate:** (1) Jest: tips list + stats correctness + per-driver scoping. (2) Integration: dashboard renders real data, charts intact. (3) Ask user.

---

## P7 — Account polish
**Backend:** finalize contact update + cancel-subscription via portal (if not fully done in P3).
**Frontend wiring:** ensure `account.tsx` fully real (no stubs/hardcoded).
**➡ 3-Test Gate:** (1) Jest: contact update validation. (2) Integration: edit contact persists; cancel flow. (3) Ask user.

---

## P8 — Admin panel
**Backend:** `admin` module (admin role guard) — `GET /admin/overview` (totalDrivers, activeSubs, totalTipsProcessed, platformRevenue=activeSubs×£9.99, monthly volume), `GET /admin/drivers` (search/filter/paginate → `AdminDriver`), `GET /admin/transactions` (date-range/search/paginate → `AdminTransaction`).
**Frontend wiring:** replace **`useAdminData`** (remove `ADMIN_DRIVERS`/`ADMIN_TRANSACTIONS`/`MONTHLY_VOLUME`). Keep tables, filters, pagination, CSV export (client-side), detail sheet — unchanged.
**Acceptance:** admin screens show real aggregates; non-admin is forbidden.

**➡ 3-Test Gate:** (1) Jest: admin-only access, overview math, list filters/pagination. (2) Integration: admin browses real drivers/transactions; non-admin blocked. (3) Ask user.

---

## P9 — Production deployment
- Build both; run **backend** (PM2, :4000) and **frontend** (PM2, :3000) ; **nginx**: `/api/*` → backend, `/` → frontend; Certbot TLS; `tipvan_prod` DB + migrations + nightly backup; env wired (CORS to the domain, `VITE_API_URL` to `/api/v1`).
**➡ 3-Test Gate:** (1) Smoke: `/api/v1/health` on prod. (2) Full customer + driver flow on the live URL (mock Stripe). (3) Ask user — production sign-off.

---

## P10 — Real Stripe & legal (go-live)
- Add Stripe **test keys** → mount **Payment Element** (card/Apple/Google Pay) on the tip page using the returned `clientSecret`; verify with test cards; then **live keys**.
- Add **Terms + Privacy** pages (GDPR — optional customer name/address; required by Stripe).
**➡ 3-Test Gate:** (1) Backend: live-mode webhook confirms tips/subscriptions. (2) Real test-card payment end-to-end. (3) Ask user — go-live sign-off.

---

> Reminder: every prompt = **backend test ✅ → frontend⇄backend integration ✅ (UI unchanged) → user approves ✅** before moving on.

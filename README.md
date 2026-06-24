# SelfeConnect

Reviews & tips platform for self-employed professionals. Customers scan a
professional's personal QR code to leave a review and a cashless tip in
seconds — no app, no account, no commission on tips.

## Monorepo structure
- `frontend/` — TanStack Start (React) app, mobile-first, Tailwind + shadcn/ui
- `backend/` — NestJS + Prisma + PostgreSQL REST API (auth, Stripe, webhooks, admin)
- `data/` — product requirements and notes
- `manual-tests/` — Playwright end-to-end checks against a deployment

## Features
- Professional sign-up, profile, photo, and a unique 5-character ID + QR code
- Printable **flyer** and **QR-only** outputs for each professional
- Customer tipping page with star rating, optional message, card + Apple Pay + Google Pay
- £5.49/month subscription (Stripe Checkout + Billing Portal)
- Payouts via Stripe Connect (professionals keep 100% of tips)
- Stripe webhooks reconciling payments, subscriptions and payout onboarding
- Professional dashboard (earnings, ratings, recent tips) and admin panel

## Setup
1. `cd backend && npm install && cp .env.example .env` (fill values), then
   `npx prisma migrate dev` and `npm run start:dev`
2. `cd frontend && npm install && npm run dev`
3. Production: copy `ecosystem.config.example.cjs` → `ecosystem.config.cjs`
   (fill values), build both, and run with PM2.

## Stripe
The Stripe gateway auto-selects **mock** mode when `STRIPE_SECRET_KEY` is empty,
and **real** mode when it is set. See `data/go-live-stripe.md`.

## Tests
- Backend: `cd backend && npm run test:e2e`
- End-to-end (live): `cd manual-tests && BASE_URL=... DATABASE_URL=... node run.mjs`

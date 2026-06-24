# TipVan manual tests

Automated end-to-end "manual tests" that drive the **live deployment** with a
real browser (Playwright/Chromium) plus Stripe webhook calls — the automated
form of the manual-test gate every phase must pass.

Each phase file is self-contained: it signs up its own driver(s) (emails
prefixed `mt_…`), exercises the flow through the real UI, and asserts on what a
user would see. `run.mjs` runs them and cleans up the `mt_…` test rows at the end.

## Run

From the repo root (Chromium comes from `frontend/node_modules`):

```bash
cd frontend
BASE_URL=https://luxerontech.com \
DATABASE_URL=postgresql://tips:PASSWORD@localhost:5432/tipvan_prod \
  node ../manual-tests/run.mjs
```

Or a subset:

```bash
node ../manual-tests/run.mjs p3 p4
```

## Environment

- `BASE_URL` — site under test (default `https://luxerontech.com`).
- `DATABASE_URL` — **optional.** Needed only for P5 (reads the driver's internal
  id, which the API never exposes, and seeds a pending tip) and for test-row
  cleanup. Without it, P5 is skipped and no cleanup runs.

## Phases

| Phase | Covers |
|-------|--------|
| `p1` | signup, `/me` session, logout protects dashboard, login, duplicate-email rejected |
| `p2` | photo persisted, profile edit saves & persists, public driver lookup, tip-page hero |
| `p3` | activate subscription → Active, connect payouts → Ready, cancel → Inactive |
| `p4` | tip an accepting driver → success page; non-accepting driver → error |
| `p5` | webhooks reconcile account/tip state (checkout, account.updated, subscription.deleted, payment_intent), idempotency *(needs `DATABASE_URL`)* |
| `p6` | dashboard empty state, then real tips drive the hero total, recent-tips list and "Customer love" quote |
| `p7` | contact details edit & persist, client + server reject invalid input, no fabricated billing date |
| `p8` | admin panel: real aggregates, drivers/transactions browse + search, non-admin blocked *(needs `DATABASE_URL`)* |

Exit code is non-zero if any step fails.

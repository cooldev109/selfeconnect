# SelfeConnect tests

Two layers, run against a running deployment. Latest full run:
**250 assertions, 0 failures** (API 135 · p1-p8 37 · content 26 ·
founding-ui 15 · payments-list 9 · founding-api 28).

---

## 1. API integration suites — `api/`

Hit the API directly (no browser): fast, deterministic, and they cover the
backend surface exhaustively — customer auth, pros search, the jobs marketplace
(consent, quote cap, contact unlock, interested, edit/delete), reviews (per-IP
rate limit, verified badge, self-review guard), the geo service-area gate, the
email flows (password reset, verification, unsubscribe), the admin console CRUD,
and every auth boundary. Each suite tears down every row it creates.

```bash
node manual-tests/api/run.mjs            # all API suites (needs the dev API on :4100)
node manual-tests/api/jobs.mjs           # a single suite
API_URL=http://localhost:4100/api/v1 DB_URL=postgresql://tips:tips_local_dev@localhost:5432/selfeconnect_dev \
  node manual-tests/api/run.mjs
```

| Suite | Covers |
|-------|--------|
| `customers` | customer signup/login/logout/`me`/patch, password change, validation |
| `pros` | search by category/postcode/radius, inactive hidden, contact gated by customer session |
| `jobs` | post (consent required), quote cap, contact unlock, interested, edit/delete, ownership |
| `reviews` | anonymous QR reviews + per-IP rate limit, verified customer reviews, self-review guard, `me/reviews` |
| `geo-gate` | postcode autocomplete/reverse, signup service-area radius gate |
| `account-flows` | password reset + email verify (full token happy path via the mock mailer log), unsubscribe |
| `admin-crud` | overview aggregates, every list, subscription toggle, deletes, non-admin blocked |
| `auth-boundaries` | every guarded endpoint rejects anonymous / wrong-role / cross-session |

---

## 2. Browser (end-to-end) suites

Drive real Chromium (Chromium comes from `frontend/node_modules`). Each phase
file signs up its own actors (emails prefixed `mt_…`), exercises the real UI,
and cleans up at the end.

The billing/checkout flows bounce through `PUBLIC_URL`, which must be a **single
origin** serving both the web app and `/api` — as nginx does in production. On
the split-port dev box, put both behind one origin with the bundled proxy:

```bash
# one-time setup for a dev run:
VITE_API_URL=/api/v1 npm --prefix frontend run build          # web same-origin
# restart the API with PUBLIC_URL=http://localhost:3200 CORS_ORIGIN=http://localhost:3200
node manual-tests/dev-proxy.mjs                                # :3200 -> web :3100 / api :4100

BASE_URL=http://localhost:3200 \
DATABASE_URL=postgresql://tips:tips_local_dev@localhost:5432/selfeconnect_dev \
  node manual-tests/run.mjs                 # p1-p8 (or: run.mjs p3 p4)
BASE=http://localhost:3200     node manual-tests/content-and-legal.mjs
WEB_URL=http://localhost:3200  node manual-tests/founding-pricing-ui.mjs
WEB_URL=http://localhost:3200  node manual-tests/dashboard-payments-list.mjs
node manual-tests/founding-pricing-api.mjs  # restarts the API itself; run last
```

Against production, point `BASE_URL` at the live origin (nginx already unifies
web + `/api`), e.g. `BASE_URL=https://selfeconnect.com`. The content-only suites
also run standalone against `:3100` when the web is built with the absolute
`VITE_API_URL=http://localhost:4100/api/v1`.

`DATABASE_URL` is optional for the browser suites; without it P5 is skipped and
no cleanup runs.

| Phase | Covers |
|-------|--------|
| `p1` | signup, `/me` session, logout protects dashboard, login, duplicate-email rejected |
| `p2` | photo persisted, profile edit saves & persists, public driver lookup, tip-page hero |
| `p3` | activate subscription → Active, connect payouts → Ready, cancel → Inactive |
| `p4` | tip an accepting driver → success page; non-accepting driver → error |
| `p5` | webhooks reconcile account/tip state, idempotency *(needs `DATABASE_URL`)* |
| `p6` | dashboard empty state, then real tips drive the hero total, recent-tips list and quote |
| `p7` | contact details edit & persist, client + server reject invalid input, no fabricated billing date |
| `p8` | admin panel: real aggregates, drivers/transactions browse + search, non-admin blocked |

Exit code is non-zero if any step fails.

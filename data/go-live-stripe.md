# TipVan — Stripe setup, testing & go-live

The site is live at **https://luxerontech.com** and currently runs in **real Stripe
mode using the client's TEST (sandbox) keys**. That means the whole flow is fully
functional, but **no real money moves** — payments use Stripe **test cards**.

## What's wired
- **Subscription** (£9.99/mo) — Stripe Checkout + Billing Portal. Price:
  `price_1TkurCDEYC0cxjVgJ4ymtuLI` (sandbox).
- **Driver payouts** — Stripe Connect (controller-based Express accounts). Drivers
  complete Stripe's hosted onboarding themselves (identity + bank). No platform
  "sign up for Connect" dashboard step is required.
- **Tips** — destination charges via the Stripe Payment Element on the tip page
  (driver keeps 100%).
- **Webhook** — `https://luxerontech.com/api/v1/stripe/webhook` (8 events), signed.

## How a driver gets set up (self-serve)
1. Sign up at `/signup`.
2. **Account → Activate subscription** → pay on Stripe Checkout.
3. **Account → Connect payouts** → complete Stripe onboarding (identity + bank).
4. When Account shows **"Ready"**, the driver's QR/tip page accepts tips.

## Testing now (test mode — no real money)
- **Card:** `4242 4242 4242 4242`, any future expiry, any CVC, any postcode.
- **Onboarding identity:** any test name/DOB; UK bank sort code `10-88-00`,
  account `00012345`.
- A successful tip shows on the driver's **Dashboard** (total, recent tips, rating).

## Going live (real money) — later
Live mode is separate from test mode and needs the **business verified** first
("Verify your business" in the Stripe dashboard — only the account owner can do it).
Then, **in live mode**, recreate and provide these 4 values:
1. `pk_live_…` (publishable key)
2. `sk_live_…` (secret key)
3. `price_…` (recreate the £9.99/mo product/price in live)
4. `whsec_…` (recreate the webhook endpoint at the URL above in live)

Swapping these 4 values (publishable key in `frontend/.env.production`; the other
three in `ecosystem.config.cjs` → `tipvan-api` env) and redeploying flips the site
to real money. **No code changes** — test and live use identical code.

## Where the values live (server)
- Publishable key → `frontend/.env.production` (`VITE_STRIPE_PUBLISHABLE_KEY`)
- Secret key / price / webhook secret → `ecosystem.config.cjs` (`tipvan-api` env)
- Redeploy: `cd frontend && npm run build && pm2 restart tipvan-web` and
  `pm2 restart ecosystem.config.cjs --only tipvan-api`

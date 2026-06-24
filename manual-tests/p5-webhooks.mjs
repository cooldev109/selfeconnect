// P5 — Stripe webhooks reconcile state, visible on the account page. Requires
// DATABASE_URL (to read the driver's internal id, which the API never exposes,
// and to seed a pending tip). Skips cleanly if DATABASE_URL is unset.
import {
  BASE, reporter, uniqueEmail, writeTestPng, signupDriver,
  hasDb, sql, webhook, eventId,
} from "./lib.mjs";

export async function run(browser) {
  const R = reporter();
  if (!hasDb()) {
    console.log("  SKIP  P5 webhooks — set DATABASE_URL to run (needs internal driver id)");
    return R.summary("P5 webhooks (skipped)");
  }

  const png = writeTestPng();
  const ctx = await browser.newContext();
  const email = uniqueEmail("mt_p5");
  const page = await signupDriver(ctx, { email, name: "P5 Driver", photo: png });
  const did = sql(`SELECT id FROM "Driver" WHERE email='${email}';`);

  await R.step("account starts Inactive", async () => {
    await page.goto(BASE + "/account", { waitUntil: "networkidle" });
    await page.getByText("Inactive").first().waitFor({ timeout: 8000 });
  });

  await R.step("checkout.session.completed -> account Active + Manage", async () => {
    const res = await webhook({
      id: eventId(), type: "checkout.session.completed",
      data: { object: { mode: "subscription", customer: "cus_mt", metadata: { driverId: did } } },
    });
    if (!res.received) throw new Error("not received");
    await page.reload({ waitUntil: "networkidle" });
    await page.getByText("Active", { exact: true }).first().waitFor({ timeout: 8000 });
    await page.getByRole("button", { name: /Manage subscription/i }).waitFor({ timeout: 8000 });
    const row = sql(`SELECT "subscriptionStatus", "isActive", "stripeCustomerId" FROM "Driver" WHERE id='${did}';`);
    if (row !== "active|t|cus_mt") throw new Error("db row=" + row);
  });

  await R.step("payment_intent.succeeded reconciles a pending tip", async () => {
    const pi = "pi_mt_" + Date.now();
    sql(`INSERT INTO "Tip"(id,"driverId",amount,currency,status,"stripePaymentIntentId") VALUES (gen_random_uuid(),'${did}',700,'gbp','pending','${pi}');`);
    await webhook({ id: eventId(), type: "payment_intent.succeeded", data: { object: { id: pi } } });
    const st = sql(`SELECT status FROM "Tip" WHERE "stripePaymentIntentId"='${pi}';`);
    if (st !== "succeeded") throw new Error("tip status=" + st);
  });

  await R.step("account.updated -> payouts 'Ready'", async () => {
    sql(`UPDATE "Driver" SET "stripeAccountId"='acct_mt', "stripeOnboarded"=false WHERE id='${did}';`);
    await webhook({ id: eventId(), type: "account.updated", data: { object: { id: "acct_mt", charges_enabled: true, payouts_enabled: true } } });
    if (sql(`SELECT "stripeOnboarded" FROM "Driver" WHERE id='${did}';`) !== "t") throw new Error("not onboarded");
    await page.reload({ waitUntil: "networkidle" });
    await page.getByText(/Ready/).first().waitFor({ timeout: 8000 });
  });

  await R.step("customer.subscription.deleted -> account Inactive", async () => {
    await webhook({ id: eventId(), type: "customer.subscription.deleted", data: { object: { customer: "cus_mt", status: "canceled" } } });
    await page.reload({ waitUntil: "networkidle" });
    await page.getByText("Inactive").first().waitFor({ timeout: 8000 });
    const row = sql(`SELECT "subscriptionStatus", "isActive" FROM "Driver" WHERE id='${did}';`);
    if (row !== "canceled|f") throw new Error("db row=" + row);
  });

  await R.step("idempotency: replayed event id is a no-op", async () => {
    const e = { id: eventId(), type: "checkout.session.completed", data: { object: { mode: "subscription", customer: "cus_mt", metadata: { driverId: did } } } };
    const first = await webhook(e);
    if (first.duplicate) throw new Error("first already duplicate");
    sql(`UPDATE "Driver" SET "subscriptionStatus"='canceled', "isActive"=false WHERE id='${did}';`);
    const second = await webhook(e);
    if (second.duplicate !== true) throw new Error("replay not duplicate");
    if (sql(`SELECT "subscriptionStatus" FROM "Driver" WHERE id='${did}';`) !== "canceled") {
      throw new Error("event re-applied");
    }
  });

  await ctx.close();
  return R.summary("P5 webhooks");
}

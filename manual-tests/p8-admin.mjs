// P8 — Admin panel: a promoted admin sees real platform aggregates and can
// browse/search the real drivers & transactions; a normal driver is blocked
// (redirected by the UI and rejected by the API). Requires DATABASE_URL to
// promote a driver to admin and to seed.
import {
  BASE, API, reporter, uniqueEmail, writeTestPng, signupDriver, hasDb, sql,
} from "./lib.mjs";

async function makeAccepting(ctx, png, email, name) {
  const page = await signupDriver(ctx, { email, name, photo: png });
  await page.goto(BASE + "/account", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Activate subscription/i }).click();
  await page.waitForURL(/\/account$/, { timeout: 20000 });
  await page.getByRole("button", { name: /Connect payouts/i }).click();
  await page.waitForURL(/\/account$/, { timeout: 20000 });
  await page.getByText(/Ready/).first().waitFor({ timeout: 10000 });
  return page;
}

export async function run(browser) {
  const R = reporter();
  if (!hasDb()) {
    console.log("  SKIP  P8 admin — set DATABASE_URL to run (needs role promotion)");
    return R.summary("P8 admin (skipped)");
  }
  const png = writeTestPng();
  const stamp = Date.now();
  const driverName = `Alpha Driver ${stamp}`;

  // A real accepting driver with two tips → drives the aggregates.
  const ctxA = await browser.newContext();
  const pA = await makeAccepting(ctxA, png, uniqueEmail("mt_p8d"), driverName);
  const idA = (await pA.evaluate((a) => fetch(a + "/me", { credentials: "include" }).then((r) => r.json()), API)).id;
  await pA.evaluate(
    ([u]) => Promise.all([
      fetch(u, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount: 500, rating: 5, customerName: "Sarah" }) }),
      fetch(u, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount: 200, rating: 4, customerName: "Tom" }) }),
    ]),
    [`${API}/drivers/${idA}/tips`],
  );

  // Admin: sign up then promote in the DB (the guard reads role per-request).
  const adminEmail = uniqueEmail("mt_p8a");
  const ctxAdmin = await browser.newContext();
  const pAdmin = await signupDriver(ctxAdmin, { email: adminEmail, name: "Boss", photo: png });
  sql(`UPDATE "Driver" SET role='admin' WHERE email='${adminEmail}';`);

  // Aggregates are platform-wide (other phases' data may coexist), so assert
  // invariants + that our seeded contribution is included, not exact totals.
  let overview;
  await R.step("admin overview API returns real aggregates", async () => {
    overview = await pAdmin.evaluate((a) => fetch(a + "/admin/overview", { credentials: "include" }).then((r) => r.json()), API);
    if (overview.totalDrivers < 1) throw new Error("totalDrivers=" + overview.totalDrivers);
    if (overview.activeSubs < 1) throw new Error("activeSubs=" + overview.activeSubs);
    if (Math.abs(overview.platformRevenue - overview.activeSubs * 9.99) > 0.01) {
      throw new Error(`revenue ${overview.platformRevenue} != activeSubs ${overview.activeSubs} × 9.99`);
    }
    if (overview.totalTipsProcessed < 7) throw new Error("tips=" + overview.totalTipsProcessed);
    if (!Array.isArray(overview.monthly) || overview.monthly.length !== 6) throw new Error("monthly bad");
  });

  await R.step("admin dashboard renders metrics matching the API", async () => {
    await pAdmin.goto(BASE + "/admin", { waitUntil: "networkidle" });
    await pAdmin.getByText(`£${overview.platformRevenue.toFixed(2)}`).first().waitFor({ timeout: 8000 });
    await pAdmin.getByText(`£${overview.totalTipsProcessed.toFixed(2)}`).first().waitFor({ timeout: 8000 });
  });

  await R.step("admin drivers table finds the real driver via search + empty state", async () => {
    await pAdmin.goto(BASE + "/admin/drivers", { waitUntil: "networkidle" });
    // Search by the unique name so it lands on page 1 regardless of dataset size.
    await pAdmin.getByPlaceholder(/Search by name/i).fill(driverName);
    await pAdmin.getByText(driverName).first().waitFor({ timeout: 8000 });
    await pAdmin.getByPlaceholder(/Search by name/i).fill("zzzz-no-match");
    await pAdmin.getByText(/No drivers match/i).waitFor({ timeout: 5000 });
  });

  await R.step("admin transactions table lists real tips", async () => {
    await pAdmin.goto(BASE + "/admin/transactions", { waitUntil: "networkidle" });
    await pAdmin.getByPlaceholder(/Search by driver name/i).fill(driverName);
    await pAdmin.getByText(driverName).first().waitFor({ timeout: 8000 });
    await pAdmin.getByText("£5.00").first().waitFor({ timeout: 8000 });
  });

  await R.step("non-admin driver is redirected away from /admin", async () => {
    const ctxN = await browser.newContext();
    const pN = await signupDriver(ctxN, { email: uniqueEmail("mt_p8n"), name: "Plain", photo: png });
    await pN.goto(BASE + "/admin", { waitUntil: "networkidle" });
    await pN.waitForURL(/\/dashboard$/, { timeout: 10000 });
    const status = await pN.evaluate((a) => fetch(a + "/admin/overview", { credentials: "include" }).then((r) => r.status), API);
    if (status !== 403) throw new Error("non-admin API status=" + status);
    await ctxN.close();
  });

  await ctxA.close();
  await ctxAdmin.close();
  return R.summary("P8 admin");
}

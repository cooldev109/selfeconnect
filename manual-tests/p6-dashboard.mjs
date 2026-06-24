// P6 — Dashboard tips & stats: empty state for a new driver, then real tips
// drive the hero total, "Recent tips" list and the "Customer love" quote
// (the useTips mock is gone — this is live data via GET /me/tips).
import { BASE, API, reporter, uniqueEmail, writeTestPng, signupDriver } from "./lib.mjs";

async function makeAccepting(ctx, png, email) {
  const page = await signupDriver(ctx, { email, name: "P6 Driver", photo: png });
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
  const png = writeTestPng();
  const ctx = await browser.newContext();
  const page = await makeAccepting(ctx, png, uniqueEmail("mt_p6"));
  const me = await page.evaluate(
    (a) => fetch(a + "/me", { credentials: "include" }).then((r) => r.json()),
    API,
  );
  const id = me.id;

  await R.step("new driver dashboard shows the empty state (£0.00)", async () => {
    await page.goto(BASE + "/dashboard", { waitUntil: "networkidle" });
    await page.getByText("No tips yet").waitFor({ timeout: 8000 });
    const sum = await page.evaluate(
      (a) => fetch(a + "/me/tips", { credentials: "include" }).then((r) => r.json()),
      API,
    );
    if (sum.total !== 0 || sum.tips.length !== 0) throw new Error("summary not empty: " + JSON.stringify(sum));
  });

  await R.step("seed tips via public API (mock -> succeeded)", async () => {
    const post = (body) =>
      page.evaluate(
        ([u, b]) => fetch(u, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }).then((r) => r.json()),
        [`${API}/drivers/${id}/tips`, body],
      );
    // Seed oldest first; the 5-star (with message) is newest so it leads the
    // streak and supplies the "Customer love" quote.
    const b = await post({ amount: 200, rating: 4, customerName: "Tom R." });
    const a = await post({ amount: 500, rating: 5, customerName: "Sarah M.", customerAddress: "Alfama", message: "Thank you so much for the careful delivery!" });
    if (!a.mock || !b.mock) throw new Error("tips not mock-succeeded");
  });

  await R.step("summary API reflects the seeded tips", async () => {
    const sum = await page.evaluate(
      (a) => fetch(a + "/me/tips", { credentials: "include" }).then((r) => r.json()),
      API,
    );
    if (sum.total !== 7) throw new Error("total=" + sum.total);
    if (sum.tips.length !== 2) throw new Error("count=" + sum.tips.length);
    if (sum.avgRating !== 4.5) throw new Error("avgRating=" + sum.avgRating);
    if (sum.fiveStarStreak !== 1) throw new Error("streak=" + sum.fiveStarStreak);
  });

  await R.step("dashboard renders the real total + recent tips", async () => {
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("heading", { level: 1 }).filter({ hasText: "£7.00" }).waitFor({ timeout: 8000 });
    await page.getByText("Sarah M.").first().waitFor({ timeout: 8000 });
    await page.getByText("Tom R.").first().waitFor({ timeout: 8000 });
  });

  await R.step("'Customer love' quote shows the real message", async () => {
    await page.getByText(/Thank you so much for the careful delivery!/).first().waitFor({ timeout: 8000 });
    await page.getByText(/Sarah M\., Alfama/).waitFor({ timeout: 8000 });
  });

  await ctx.close();
  return R.summary("P6 dashboard");
}

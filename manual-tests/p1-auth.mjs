// P1 — Authentication: signup, session (/me), logout-protects-dashboard, login,
// duplicate-email rejection.
import { BASE, API, reporter, uniqueEmail, writeTestPng, signupDriver } from "./lib.mjs";

export async function run(browser) {
  const R = reporter();
  const png = writeTestPng();
  const ctx = await browser.newContext();
  const email = uniqueEmail("mt_p1");
  const password = "supersecret";

  let page;
  await R.step("signup creates account and lands on dashboard", async () => {
    page = await signupDriver(ctx, { email, name: "P1 Driver", photo: png });
  });

  await R.step("GET /me returns the signed-in driver", async () => {
    // /me returns the public DriverShape (no email — that's account-level).
    const me = await page.evaluate(
      (a) => fetch(a + "/me", { credentials: "include" }).then((r) => r.json()),
      API,
    );
    if (me.name !== "P1 Driver" || !me.id) throw new Error("me=" + JSON.stringify(me));
  });

  await R.step("logout protects the dashboard (redirects to /login)", async () => {
    await page.evaluate(
      (a) => fetch(a + "/auth/logout", { method: "POST", credentials: "include" }),
      API,
    );
    await page.goto(BASE + "/dashboard", { waitUntil: "networkidle" });
    await page.waitForURL(/\/login$/, { timeout: 10000 });
  });

  await R.step("login with valid credentials returns to dashboard", async () => {
    await page.goto(BASE + "/login", { waitUntil: "networkidle" });
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole("button", { name: /Log in/i }).click();
    await page.waitForURL(/\/dashboard$/, { timeout: 15000 });
  });

  await R.step("duplicate email signup is rejected (stays on /signup)", async () => {
    const p2 = await ctx.newPage();
    await p2.goto(BASE + "/signup", { waitUntil: "networkidle" });
    await p2.setInputFiles('input[type="file"]', png);
    await p2.getByPlaceholder("Jane Doe").fill("Dup");
    await p2.getByPlaceholder("you@example.com").fill(email);
    await p2.getByPlaceholder("+44 7700 900000").fill("+44 7700 900000");
    await p2.getByPlaceholder("At least 8 characters").fill(password);
    await p2.getByRole("button", { name: /Create account/i }).click();
    await p2.waitForTimeout(2500);
    if (/\/dashboard$/.test(p2.url())) throw new Error("duplicate signup succeeded");
    await p2.close();
  });

  await ctx.close();
  return R.summary("P1 auth");
}

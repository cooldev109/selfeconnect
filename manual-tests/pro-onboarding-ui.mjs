// Guided professional onboarding (M1.5) — browser. A new professional sees a
// setup checklist with a progress count on their Account page; once every step
// is done, the checklist disappears.
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";

const WEB = process.env.BASE_URL || process.env.WEB_URL || "http://localhost:3200";
const DB = process.env.DATABASE_URL || "postgresql://tips:tips_local_dev@localhost:5432/selfeconnect_dev";
const sql = (q) => execFileSync("psql", [DB, "-tAc", q], { encoding: "utf8" }).trim();
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

export async function run(sharedBrowser) {
  const browser = sharedBrowser || (await chromium.launch());
  let pass = 0, fail = 0;
  const fails = [];
  const ok = (l, c, d = "") => {
    if (c) { pass++; console.log(`  \x1b[32m✓\x1b[0m ${l}`); }
    else { fail++; fails.push(l + (d ? ` — ${d}` : "")); console.log(`  \x1b[31m✗\x1b[0m ${l}${d ? ` — ${d}` : ""}`); }
  };
  console.log("\n── Guided professional onboarding ──");
  const EMAIL = `onbd_${Date.now()}@example.com`;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  const checklist = () => page.getByTestId("onboarding-checklist");

  try {
    // Sign up a professional (the form requires a photo + trade, so those two
    // steps land already done).
    await page.goto(`${WEB}/signup`, { waitUntil: "networkidle" });
    await page.fill('input[placeholder="Jane Doe"]', "Onboard Pro");
    await page.fill('input[placeholder="you@example.com"]', EMAIL);
    await page.fill('input[placeholder="+44 7700 900000"]', "+44 7700 900123");
    await page.fill('input[placeholder="At least 8 characters"]', "TestPass123!");
    await page.setInputFiles('input[type="file"]', { name: "a.png", mimeType: "image/png", buffer: PNG });
    await page.fill('input[placeholder*="M1 1AE"]', "RG1 8EQ");
    await page.getByText("Plumber", { exact: true }).first().click();
    await page.getByRole("button", { name: /Create account/i }).click();
    await page.waitForURL(/\/(home|jobs|dashboard)/, { timeout: 20000 });
    const id = sql(`select id from "Driver" where email='${EMAIL}';`);
    ok("professional account created", id.length > 0);

    // The Account page shows the checklist with progress and outstanding steps.
    await page.goto(`${WEB}/account`, { waitUntil: "networkidle" });
    await checklist().waitFor({ state: "visible" });
    ok("Account page shows the onboarding checklist", await checklist().isVisible());
    ok("checklist shows a progress count (2 of 5 done)", await page.getByText("2 of 5 done").isVisible());
    ok("outstanding step: Go live", await page.getByText("Go live").first().isVisible());
    ok("outstanding step: Connect payouts", await page.getByText("Connect payouts").first().isVisible());
    ok("has a progress bar", await checklist().getByRole("progressbar").isVisible());

    // Completing everything makes the checklist go away.
    sql(`update "Driver" set bio='Two decades of tidy, guaranteed plumbing.', "isActive"=true, "stripeOnboarded"=true where id='${id}';`);
    await page.reload({ waitUntil: "networkidle" });
    await checklist().waitFor({ state: "detached", timeout: 8000 }).catch(() => {});
    ok("checklist disappears once fully set up", (await checklist().count()) === 0);
  } catch (e) {
    ok("no unexpected error", false, (e?.message || String(e)).split("\n")[0]);
  } finally {
    sql(`delete from "Driver" where email='${EMAIL}';`);
    await ctx.close();
    if (!sharedBrowser) await browser.close();
  }
  console.log(`\n  Pro onboarding E2E: ${pass}/${pass + fail} passed`);
  if (fails.length) console.log("  Failures:\n   - " + fails.join("\n   - "));
  return { name: "pro-onboarding-ui", pass, fail, fails, passed: pass, total: pass + fail };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

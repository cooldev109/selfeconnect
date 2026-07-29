// P3 — Billing: activate subscription (mock), connect payouts, cancel.
// Drives the on-brand account-page buttons and asserts the resulting badges.
import { BASE, reporter, uniqueEmail, writeTestPng, signupDriver, activateSubscription, connectPayouts } from "./lib.mjs";

export async function run(browser) {
  const R = reporter();
  const png = writeTestPng();
  const ctx = await browser.newContext();
  const page = await signupDriver(ctx, {
    email: uniqueEmail("mt_p3"),
    name: "P3 Driver",
    photo: png,
  });

  await R.step("account starts Inactive with 'Activate subscription'", async () => {
    await page.goto(BASE + "/account", { waitUntil: "networkidle" });
    await page.getByText("Inactive").first().waitFor({ timeout: 8000 });
    await page.getByRole("button", { name: /Activate subscription/i }).waitFor({ timeout: 8000 });
  });

  await R.step("activate subscription -> Active + 'Manage subscription'", async () => {
    await activateSubscription(page);
    await page.getByRole("button", { name: /Manage subscription/i }).waitFor({ timeout: 8000 });
  });

  await R.step("connect payouts -> 'Ready'", async () => {
    await connectPayouts(page);
  });

  await R.step("cancel subscription -> back to Inactive", async () => {
    await page.getByRole("button", { name: /Cancel subscription/i }).click();
    await page.getByRole("button", { name: /Yes, cancel/i }).click(); // confirm dialog
    await page.goto(BASE + "/account", { waitUntil: "networkidle" });
    await page.getByText("Inactive").first().waitFor({ timeout: 10000 });
  });

  await ctx.close();
  return R.summary("P3 billing");
}

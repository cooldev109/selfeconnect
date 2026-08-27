#!/usr/bin/env node
// Guided professional onboarding (M1.5) — browser. A new professional sees a
// setup checklist with a progress count on their dashboard; once every step is
// done, the checklist disappears.
//
//   node manual-tests/pro-onboarding-ui.mjs        # dev :3100

import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";

const WEB = process.env.WEB_URL ?? "http://localhost:3100";
const DB = "postgresql://tips:tips_local_dev@localhost:5432/selfeconnect_dev";
const sql = (q) => execFileSync("psql", [DB, "-tAc", q], { encoding: "utf8" }).trim();
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const EMAIL = `onbd_${Date.now()}@example.com`;

let pass = 0, fail = 0;
const ok = (n, c) => { c ? pass++ : fail++; console.log(`  ${c ? "\x1b[32m✓" : "\x1b[31m✗"}\x1b[0m ${n}`); };

const browser = await chromium.launch();
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

  // The dashboard shows the checklist with progress and outstanding steps.
  await page.goto(`${WEB}/dashboard`, { waitUntil: "networkidle" });
  await checklist().waitFor({ state: "visible" });
  ok("dashboard shows the onboarding checklist", await checklist().isVisible());
  ok("checklist shows a progress count (2 of 5 done)", await page.getByText("2 of 5 done").isVisible());
  ok("outstanding step: Go live", await page.getByText("Go live").first().isVisible());
  ok("outstanding step: Connect payouts", await page.getByText("Connect payouts").first().isVisible());
  ok("has a progress bar", await checklist().getByRole("progressbar").isVisible());

  // Completing everything makes the checklist go away.
  sql(`update "Driver" set bio='Two decades of tidy, guaranteed plumbing.', "isActive"=true, "stripeOnboarded"=true where id='${id}';`);
  await page.reload({ waitUntil: "networkidle" });
  // Give the account/me queries a beat to resolve before asserting absence.
  await page.getByText("Payments & tips").first().waitFor({ state: "visible" }).catch(() => {});
  await page.waitForTimeout(800);
  ok("checklist disappears once fully set up", (await checklist().count()) === 0);
} catch (e) {
  ok(`no exception (${(e?.message || e).toString().split("\n")[0]})`, false);
} finally {
  sql(`delete from "Driver" where email='${EMAIL}';`);
  await browser.close();
}

console.log(`\n==== pro-onboarding-ui: ${pass}/${pass + fail} passed ====`);
process.exit(fail ? 1 : 0);

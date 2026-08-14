#!/usr/bin/env node
// Job-first signup (M1.3) — a LOGGED-OUT visitor posts a job end-to-end.
//
// Walks the public /post-a-job wizard, creates the account inline at the final
// step (name + email + password, no phone), posts, and lands on the dashboard.
// Verifies via the DB that the account (null phone) and job were both created.
//
//   node manual-tests/post-a-job-guest.mjs        # dev :3100

import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";

const WEB = process.env.WEB_URL ?? "http://localhost:3100";
const DB = "postgresql://tips:tips_local_dev@localhost:5432/selfeconnect_dev";
const sql = (q) => execFileSync("psql", [DB, "-tAc", q], { encoding: "utf8" }).trim();
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const EMAIL = `guest_${Date.now()}@example.com`;

let pass = 0, fail = 0;
const ok = (n, c) => { c ? pass++ : fail++; console.log(`  ${c ? "\x1b[32m✓" : "\x1b[31m✗"}\x1b[0m ${n}`); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 850 } });
const page = await ctx.newPage();
page.setDefaultTimeout(30000);

try {
  // Land on the public wizard with NO session at all.
  await page.goto(`${WEB}/post-a-job`, { waitUntil: "networkidle" });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("What service do you need?").waitFor({ state: "visible" });
  ok("logged-out visitor reaches the wizard (no login wall)", true);

  // Step 1 — service + title.
  await page.getByRole("button", { name: /Select a service/ }).click();
  await page.getByPlaceholder(/Search services/).fill("Plumb");
  await page.getByText("Plumber", { exact: true }).click();
  await page.fill('input[placeholder="e.g. Office cleaner needed"]', "Fix a leaking kitchen tap");
  await page.getByRole("button", { name: /Next/i }).click();

  // Step 2 — description + photo.
  await page.getByText("Describe the job").waitFor({ state: "visible" });
  await page.fill("textarea", "The mixer tap under the kitchen sink drips constantly and needs replacing.");
  await page.setInputFiles('input[type="file"]', { name: "tap.png", mimeType: "image/png", buffer: PNG });
  await page.locator('img[alt="Job photo"]').first().waitFor({ state: "visible" });
  await page.getByRole("button", { name: /^Next/i }).click();

  // Step 3 — postcode + timing.
  await page.getByText("Where is the job?").waitFor({ state: "visible" });
  await page.fill('input[placeholder*="M1 1AE"]', "RG1 8EQ");
  await page.getByRole("button", { name: "As soon as possible" }).click();
  await page.getByRole("button", { name: /^Next/i }).click();

  // Step 4 — Finish carries the inline account fields for a guest.
  await page.getByText("Create your free account to post").waitFor({ state: "visible" });
  ok("finish step asks a guest to create an account inline", true);

  // With consent ticked but the account empty, posting is still blocked on the
  // account fields — a guest can't post without creating one.
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /^Post job/i }).click();
  ok(
    "post is blocked until the account is filled",
    await page.getByText("Please enter your name").isVisible(),
  );

  await page.fill('input[placeholder="Jane Doe"]', "Guest Poster");
  await page.fill('input[placeholder="you@example.com"]', EMAIL);
  await page.fill('input[placeholder="At least 8 characters"]', "TestPass123!");
  await page.getByRole("button", { name: /^Post job/i }).click();

  // Lands on the dashboard as a signed-in customer.
  await page.waitForURL(/\/customer(\/|$)/, { timeout: 20000 });
  ok("guest is signed in and lands on the dashboard", /\/customer(\/|$)/.test(page.url()));

  const custId = sql(`select id from "Customer" where email='${EMAIL}';`);
  ok("account was created", custId.length > 0);
  ok("account has no phone (low-friction)", sql(`select phone is null from "Customer" where email='${EMAIL}';`) === "t");
  const row = sql(
    `select coalesce(array_length(photos,1),0) || '|' || coalesce(timing,'') || '|' || title from "Job" where "customerId"='${custId}' order by "createdAt" desc limit 1;`,
  );
  const [photoCount, timing, title] = row.split("|");
  ok("the job was posted for the new account", title === "Fix a leaking kitchen tap");
  ok("job carries the uploaded photo", Number(photoCount) === 1);
  ok("job carries the timing phrase", timing === "As soon as possible");
} catch (e) {
  ok(`no exception (${(e?.message || e).toString().split("\n")[0]})`, false);
} finally {
  sql(`delete from "Customer" where email='${EMAIL}';`);
  await browser.close();
}

console.log(`\n==== post-a-job-guest: ${pass}/${pass + fail} passed ====`);
process.exit(fail ? 1 : 0);

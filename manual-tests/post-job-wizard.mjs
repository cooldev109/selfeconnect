#!/usr/bin/env node
// Post-a-Job wizard (M1.2) — end-to-end browser walk of the guided flow.
//
// Signs up a customer, then steps through the four-step wizard (Service →
// Details + photo → Location + timing → Finish + consent) and posts. Verifies
// via the DB that the job was created carrying the photo and timing phrase.
//
//   node manual-tests/post-job-wizard.mjs        # dev :3100

import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";

const WEB = process.env.WEB_URL ?? "http://localhost:3100";
const DB = "postgresql://tips:tips_local_dev@localhost:5432/selfeconnect_dev";
const sql = (q) => execFileSync("psql", [DB, "-tAc", q], { encoding: "utf8" }).trim();
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const EMAIL = `wizard_${Date.now()}@example.com`;

let pass = 0, fail = 0;
const ok = (n, c) => { c ? pass++ : fail++; console.log(`  ${c ? "\x1b[32m✓" : "\x1b[31m✗"}\x1b[0m ${n}`); };

const browser = await chromium.launch();
// A narrow viewport — the wizard is mobile-first, so test how a phone sees it.
const ctx = await browser.newContext({ viewport: { width: 390, height: 850 } });
const page = await ctx.newPage();
// Vite dev compiles routes on first hit; give cold navigations room.
page.setDefaultTimeout(30000);

try {
  // --- sign up a customer ---
  // Vite dev compiles the route on first hit; a reload serves a warm, already
  // hydrated page, so the submit fires the API call rather than a pre-hydration
  // native form GET.
  await page.goto(`${WEB}/customer/signup`, { waitUntil: "networkidle" });
  await page.reload({ waitUntil: "networkidle" });
  const nameField = page.locator('input[placeholder="Jane Doe"]');
  await nameField.waitFor({ state: "visible" });
  await nameField.fill("Wizard Test");
  await page.fill('input[placeholder="you@example.com"]', EMAIL);
  await page.fill('input[placeholder="+44 7700 900000"]', "+44 7700 900123");
  await page.fill('input[placeholder="At least 8 characters"]', "TestPass123!");
  const signupBtn = page.getByRole("button", { name: /Create free account/i });
  await signupBtn.waitFor({ state: "visible" });
  const [signupRes] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/customer/auth/signup") && r.request().method() === "POST",
      { timeout: 20000 },
    ),
    signupBtn.click(),
  ]);
  ok("signup API returns 201", signupRes.status() === 201);
  await page.waitForURL(/\/customer(\/|$)/, { timeout: 20000 });
  const custId = sql(`select id from "Customer" where email='${EMAIL}';`);
  ok("customer account created", custId.length > 0);

  // --- open the wizard from the dashboard (in-app nav, like a real user) ---
  await page.getByRole("button", { name: /Post a job/i }).first().click();
  await page.waitForURL(/\/customer\/jobs\/new/, { timeout: 20000 });
  const step1Heading = page.getByText("What service do you need?");
  await step1Heading.waitFor({ state: "visible" });
  ok("wizard starts on step 1 (Service)", await step1Heading.isVisible());

  // Step 1 — pick a service + title. Next should be blocked until both are set.
  await page.getByRole("button", { name: /Next/i }).click();
  ok("step 1 blocks Next until a service is chosen", await page.getByText("Choose a service category").isVisible());
  await page.getByRole("button", { name: /Select a service/ }).click();
  await page.getByPlaceholder(/Search services/).fill("Plumb");
  await page.getByText("Plumber", { exact: true }).click();
  await page.fill('input[placeholder="e.g. Office cleaner needed"]', "Fix a leaking kitchen tap");
  await page.getByRole("button", { name: /Next/i }).click();

  // Step 2 — description + a photo.
  ok("advanced to step 2 (Details)", await page.getByText("Describe the job").isVisible());
  await page.fill('textarea', "The mixer tap under the kitchen sink drips constantly and needs replacing.");
  await page.setInputFiles('input[type="file"]', { name: "tap.png", mimeType: "image/png", buffer: PNG });
  // Wait for the uploaded thumbnail (an <img>) to appear.
  await page.locator('img[alt="Job photo"]').first().waitFor({ state: "visible", timeout: 15000 });
  ok("photo uploads and shows a thumbnail", (await page.locator('img[alt="Job photo"]').count()) === 1);
  await page.getByRole("button", { name: /^Next/i }).click();

  // Step 3 — postcode + timing chip.
  ok("advanced to step 3 (Location)", await page.getByText("Where is the job?").isVisible());
  await page.fill('input[placeholder*="M1 1AE"]', "RG1 8EQ");
  await page.getByRole("button", { name: "As soon as possible" }).click();
  await page.getByRole("button", { name: /^Next/i }).click();

  // Step 4 — consent + post. Posting is blocked until consent is ticked.
  ok("advanced to step 4 (Finish)", await page.getByText(/How many professionals may contact you/).isVisible());
  await page.getByRole("button", { name: /^Post job/i }).click();
  ok("post is blocked until consent is ticked", await page.getByText("Please tick this to post your job.").isVisible());
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /^Post job/i }).click();

  // Back on the dashboard, and the job exists with photo + timing.
  await page.waitForURL(/\/customer(\/|$)/, { timeout: 20000 });
  const row = sql(
    `select coalesce(array_length(photos,1),0) || '|' || coalesce(timing,'') || '|' || title from "Job" where "customerId"='${custId}' order by "createdAt" desc limit 1;`,
  );
  const [photoCount, timing, title] = row.split("|");
  ok("job was created for this customer", title === "Fix a leaking kitchen tap");
  ok("job carries the uploaded photo", Number(photoCount) === 1);
  ok("job carries the timing phrase", timing === "As soon as possible");
} catch (e) {
  ok(`no exception (${(e?.message || e).toString().split("\n")[0]})`, false);
} finally {
  // Cleanup — cascades remove the Job rows.
  sql(`delete from "Customer" where email='${EMAIL}';`);
  await browser.close();
}

console.log(`\n==== post-job-wizard: ${pass}/${pass + fail} passed ====`);
process.exit(fail ? 1 : 0);

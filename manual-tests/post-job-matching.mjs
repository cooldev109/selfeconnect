#!/usr/bin/env node
// Job matching (M1.4) — the in-app half of "notify professionals". A customer's
// new job must surface on the board of a matching professional. Seeds a
// plumbing job via the API, signs up a plumber in range, and checks the job
// shows on their "Find work" board and that they can unlock the contact.
//
//   node manual-tests/post-job-matching.mjs        # dev :3100 / api :4100

import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";

const WEB = process.env.WEB_URL ?? "http://localhost:3100";
const API = process.env.API_URL ?? "http://localhost:4100/api/v1";
const DB = "postgresql://tips:tips_local_dev@localhost:5432/selfeconnect_dev";
const sql = (q) => execFileSync("psql", [DB, "-tAc", q], { encoding: "utf8" }).trim();
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const STAMP = Date.now();
const CUST = `match_cust_${STAMP}@example.com`;
const PRO = `match_pro_${STAMP}@example.com`;
const JOB_TITLE = `Fix a leaking tap ${STAMP}`;

let pass = 0, fail = 0;
const ok = (n, c) => { c ? pass++ : fail++; console.log(`  ${c ? "\x1b[32m✓" : "\x1b[31m✗"}\x1b[0m ${n}`); };

// Tiny API helper (JSON), keeps its own cookie.
async function api(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return {
    status: res.status,
    ok: res.ok,
    body: text ? JSON.parse(text) : null,
    cookie: (res.headers.get("set-cookie") ?? "").split(";")[0],
  };
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await ctx.newPage();
page.setDefaultTimeout(30000);

try {
  // Seed a plumbing job at RG1 8EQ via the API.
  const cust = await api("/customer/auth/signup", {
    method: "POST",
    body: { name: "Match Cust", email: CUST, password: "TestPass123!" },
  });
  ok("seed customer created", cust.ok);
  const job = await api("/jobs", {
    method: "POST",
    cookie: cust.cookie,
    body: {
      categorySlug: "plumber",
      title: JOB_TITLE,
      description: "The mixer tap under the kitchen sink drips constantly and needs replacing.",
      postcode: "RG1 8EQ",
      contactConsent: true,
    },
  });
  ok("seed job posted", job.ok && !!job.body?.id);

  // A matching plumber signs up (same area) and is activated.
  await page.goto(`${WEB}/signup`, { waitUntil: "networkidle" });
  await page.fill('input[placeholder="Jane Doe"]', "Match Pro");
  await page.fill('input[placeholder="you@example.com"]', PRO);
  await page.fill('input[placeholder="+44 7700 900000"]', "+44 7700 900123");
  await page.fill('input[placeholder="At least 8 characters"]', "TestPass123!");
  await page.setInputFiles('input[type="file"]', { name: "a.png", mimeType: "image/png", buffer: PNG });
  await page.fill('input[placeholder*="M1 1AE"]', "RG1 8EQ");
  await page.getByText("Plumber", { exact: true }).first().click();
  await page.getByRole("button", { name: /Create account/i }).click();
  await page.waitForURL(/\/(jobs|dashboard)/, { timeout: 20000 });
  const proId = sql(`select id from "Driver" where email='${PRO}';`);
  ok("matching pro account created", proId.length > 0);
  sql(`update "Driver" set "isActive"=true where id='${proId}';`);

  // The board shows the seeded job, in the right trade.
  await page.goto(`${WEB}/jobs`, { waitUntil: "networkidle" });
  const card = page.locator("section, div").filter({ hasText: JOB_TITLE }).first();
  await card.waitFor({ state: "visible" });
  ok("job appears on the matching pro's board", await page.getByText(JOB_TITLE).first().isVisible());
  ok("board shows the job's trade", await page.getByText("Plumber").first().isVisible());

  // An active pro can unlock the contact.
  const unlockBtn = page.getByRole("button", { name: /Unlock contact/i }).first();
  ok("active pro sees an Unlock action", await unlockBtn.isVisible());
  await unlockBtn.click();
  // After unlocking, the customer's email is revealed on the card.
  await page.getByText(CUST).first().waitFor({ state: "visible" });
  ok("unlocking reveals the customer's contact", await page.getByText(CUST).first().isVisible());
} catch (e) {
  ok(`no exception (${(e?.message || e).toString().split("\n")[0]})`, false);
} finally {
  sql(`delete from "Driver" where email='${PRO}';`);
  sql(`delete from "Customer" where email='${CUST}';`);
  await browser.close();
}

console.log(`\n==== post-job-matching: ${pass}/${pass + fail} passed ====`);
process.exit(fail ? 1 : 0);

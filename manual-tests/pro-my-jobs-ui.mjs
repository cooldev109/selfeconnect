#!/usr/bin/env node
// Staged My Jobs — professional (M1.6). A pro who unlocked a job (and was then
// hired) sees it in their "My jobs" pipeline with the customer contact and a
// "They hired you" badge.
//
//   node manual-tests/pro-my-jobs-ui.mjs        # dev :3100 / api :4100

import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";

const WEB = process.env.WEB_URL ?? "http://localhost:3100";
const API = process.env.API_URL ?? "http://localhost:4100/api/v1";
const DB = "postgresql://tips:tips_local_dev@localhost:5432/selfeconnect_dev";
const sql = (q) => execFileSync("psql", [DB, "-tAc", q], { encoding: "utf8" }).trim();
const STAMP = Date.now();
const CUST = `pmj_cust_${STAMP}@example.com`;
const PRO = `pmj_pro_${STAMP}@example.com`;
const PASS = "TestPass123!";
const TITLE = `Fix a tap ${STAMP}`;

let pass = 0, fail = 0;
const ok = (n, c) => { c ? pass++ : fail++; console.log(`  ${c ? "\x1b[32m✓" : "\x1b[31m✗"}\x1b[0m ${n}`); };

async function api(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { ok: res.ok, body: text ? JSON.parse(text) : null, cookie: (res.headers.get("set-cookie") ?? "").split(";")[0] };
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1000, height: 1100 } });
const page = await ctx.newPage();
page.setDefaultTimeout(30000);

try {
  // Seed: customer + job; pro unlocks it; customer hires the pro.
  const cust = await api("/customer/auth/signup", { method: "POST", body: { name: "PMJ Cust", email: CUST, password: PASS } });
  const job = await api("/jobs", {
    method: "POST",
    cookie: cust.cookie,
    body: { categorySlug: "plumber", title: TITLE, description: "The mixer tap drips constantly and needs replacing.", postcode: "RG1 8EQ", contactConsent: true },
  });
  const pro = await api("/auth/signup", { method: "POST", body: { name: "PMJ Pro", email: PRO, password: PASS, postcode: "RG1 8EQ", categorySlugs: ["plumber"] } });
  ok("seed customer + job + pro created", cust.ok && job.ok && pro.ok);
  const proId = sql(`select id from "Driver" where email='${PRO}';`);
  const proPublicId = sql(`select "publicId" from "Driver" where email='${PRO}';`);
  sql(`update "Driver" set "isActive"=true where id='${proId}';`);
  const unlock = await api(`/pro/jobs/${job.body.id}/unlock`, { method: "POST", cookie: pro.cookie });
  ok("pro unlocks the job", unlock.ok);
  const hire = await api(`/jobs/${job.body.id}`, { method: "PATCH", cookie: cust.cookie, body: { status: "hired", hiredDriverPublicId: proPublicId } });
  ok("customer hires the pro", hire.ok);

  // Log in as the pro and open My jobs.
  await page.goto(`${WEB}/login`, { waitUntil: "networkidle" });
  await page.reload({ waitUntil: "networkidle" });
  await page.fill('input[placeholder="you@example.com"]', PRO);
  await page.fill('input[placeholder="Your password"]', PASS);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/auth/login") && r.request().method() === "POST"),
    page.getByRole("button", { name: /^Log in/i }).click(),
  ]);
  await page.waitForURL(/\/(jobs|dashboard)/, { timeout: 20000 });

  await page.goto(`${WEB}/my-jobs`, { waitUntil: "networkidle" });
  await page.getByText(TITLE).first().waitFor({ state: "visible" });
  ok("job appears in the pro's My jobs pipeline", await page.getByText(TITLE).first().isVisible());
  ok("shows a 'They hired you' badge", await page.getByText(/They hired you/i).first().isVisible());
  ok("shows the customer contact email", await page.getByText(CUST).first().isVisible());
  ok("Active tab counts 1", await page.getByRole("tab", { name: /Active \(1\)/ }).isVisible());
} catch (e) {
  ok(`no exception (${(e?.message || e).toString().split("\n")[0]})`, false);
} finally {
  sql(`delete from "Driver" where email='${PRO}';`);
  sql(`delete from "Customer" where email='${CUST}';`);
  await browser.close();
}

console.log(`\n==== pro-my-jobs-ui: ${pass}/${pass + fail} passed ====`);
process.exit(fail ? 1 : 0);

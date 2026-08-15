#!/usr/bin/env node
// Optional platform payment (M2.5) — browser. A customer pays the hired pro for
// a job through the platform; in dev the Stripe gateway is mocked, so it settles
// immediately and the job reads "Paid on SelfeConnect".
//
//   node manual-tests/job-payments-ui.mjs        # dev :3100 / api :4100

import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";

const WEB = process.env.WEB_URL ?? "http://localhost:3100";
const API = process.env.API_URL ?? "http://localhost:4100/api/v1";
const DB = "postgresql://tips:tips_local_dev@localhost:5432/selfeconnect_dev";
const sql = (q) => execFileSync("psql", [DB, "-tAc", q], { encoding: "utf8" }).trim();
const S = Date.now();
const CUST = `pay_cust_${S}@example.com`;
const PRO = `pay_pro_${S}@example.com`;
const PASS = "TestPass123!";
const TITLE = `Payable tap ${S}`;

let pass = 0, fail = 0;
const ok = (n, c) => { c ? pass++ : fail++; console.log(`  ${c ? "\x1b[32m✓" : "\x1b[31m✗"}\x1b[0m ${n}`); };

async function api(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await res.text();
  return { ok: res.ok, body: t ? JSON.parse(t) : null, cookie: (res.headers.get("set-cookie") ?? "").split(";")[0] };
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1000, height: 1100 } });
const page = await ctx.newPage();
page.setDefaultTimeout(30000);

try {
  // Seed: customer + job; pro who's hired and can take payments.
  const cust = await api("/customer/auth/signup", { method: "POST", body: { name: "Pay Cust", email: CUST, password: PASS } });
  const job = await api("/jobs", { method: "POST", cookie: cust.cookie, body: { categorySlug: "plumber", title: TITLE, description: "The mixer tap drips constantly and needs replacing.", postcode: "RG1 8EQ", contactConsent: true } });
  const pro = await api("/auth/signup", { method: "POST", body: { name: "Pay Pro", company: "Pay Pro Ltd", email: PRO, password: PASS, postcode: "RG1 8EQ", categorySlugs: ["plumber"] } });
  ok("seed customer + job + pro", cust.ok && job.ok && pro.ok);
  sql(`update "Driver" set "isActive"=true, "stripeAccountId"='acct_test_${S}', "stripeOnboarded"=true where email='${PRO}';`);
  await api(`/jobs/${job.body.id}`, { method: "PATCH", cookie: cust.cookie, body: { status: "hired", hiredDriverPublicId: sql(`select "publicId" from "Driver" where email='${PRO}';`) } });

  // Customer logs in and pays.
  await page.goto(`${WEB}/customer/login`, { waitUntil: "networkidle" });
  await page.reload({ waitUntil: "networkidle" });
  await page.fill('input[placeholder="you@example.com"]', CUST);
  await page.fill('input[placeholder="Your password"]', PASS);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/customer/auth/login") && r.request().method() === "POST"),
    page.getByRole("button", { name: /^Log in/i }).click(),
  ]);
  await page.waitForURL(/\/customer(\/|$)/, { timeout: 20000 });
  await page.getByText(TITLE).first().waitFor({ state: "visible" });

  await page.getByRole("button", { name: /Pay through SelfeConnect/i }).click();
  ok("pay panel opens", await page.getByText(/100% goes to them/i).isVisible());
  await page.getByPlaceholder("Amount").fill("120");
  await page.getByRole("button", { name: /^Pay$/ }).click();

  // Mock gateway settles immediately → job reads paid.
  await page.getByText(/Paid on SelfeConnect/i).first().waitFor({ state: "visible", timeout: 15000 });
  ok("job now shows Paid on SelfeConnect", await page.getByText(/Paid on SelfeConnect/i).first().isVisible());
  const row = sql(`select type||'|'||status||'|'||amount from "Tip" where "jobId"='${job.body.id}';`);
  ok("DB records a succeeded £120 job payment", row === "payment|succeeded|12000", `db=${row}`);
} catch (e) {
  ok(`no exception (${(e?.message || e).toString().split("\n")[0]})`, false);
} finally {
  sql(`delete from "Driver" where email='${PRO}';`);
  sql(`delete from "Customer" where email='${CUST}';`);
  await browser.close();
}

console.log(`\n==== job-payments-ui: ${pass}/${pass + fail} passed ====`);
process.exit(fail ? 1 : 0);

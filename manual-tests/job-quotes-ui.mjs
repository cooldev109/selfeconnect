#!/usr/bin/env node
// Quotes (M2.1) — browser. A professional sends a quote from the job board; the
// customer sees it on their job (price + pitch) and hires the pro from it.
//
//   node manual-tests/job-quotes-ui.mjs        # dev :3100 / api :4100

import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";

const WEB = process.env.WEB_URL ?? "http://localhost:3100";
const API = process.env.API_URL ?? "http://localhost:4100/api/v1";
const DB = "postgresql://tips:tips_local_dev@localhost:5432/selfeconnect_dev";
const sql = (q) => execFileSync("psql", [DB, "-tAc", q], { encoding: "utf8" }).trim();
const S = Date.now();
const CUST = `q_cust_${S}@example.com`;
const PRO = `q_pro_${S}@example.com`;
const PASS = "TestPass123!";
const TITLE = `Leaking tap ${S}`;

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
async function login(page, path, email, apiPath) {
  await page.goto(`${WEB}${path}`, { waitUntil: "networkidle" });
  await page.reload({ waitUntil: "networkidle" });
  await page.fill('input[placeholder="you@example.com"]', email);
  await page.fill('input[placeholder="Your password"]', PASS);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes(apiPath) && r.request().method() === "POST"),
    page.getByRole("button", { name: /^Log in/i }).click(),
  ]);
}

const browser = await chromium.launch();
try {
  // Seed customer + job + active pro.
  const cust = await api("/customer/auth/signup", { method: "POST", body: { name: "Q Cust", email: CUST, password: PASS } });
  const job = await api("/jobs", { method: "POST", cookie: cust.cookie, body: { categorySlug: "plumber", title: TITLE, description: "The mixer tap drips constantly and needs replacing.", postcode: "RG1 8EQ", contactConsent: true } });
  const pro = await api("/auth/signup", { method: "POST", body: { name: "Q Pro", email: PRO, password: PASS, postcode: "RG1 8EQ", categorySlugs: ["plumber"] } });
  ok("seed customer + job + pro", cust.ok && job.ok && pro.ok);
  sql(`update "Driver" set "isActive"=true where email='${PRO}';`);

  // --- PRO: send a quote from the board ---
  const proCtx = await browser.newContext({ viewport: { width: 1000, height: 1100 } });
  const pp = await proCtx.newPage(); pp.setDefaultTimeout(30000);
  await login(pp, "/login", PRO, "/auth/login");
  await pp.waitForURL(/\/(jobs|dashboard)/, { timeout: 20000 });
  await pp.goto(`${WEB}/jobs`, { waitUntil: "networkidle" });
  await pp.getByText(TITLE).first().waitFor({ state: "visible" });
  await pp.getByRole("button", { name: /Send a quote/i }).first().click();
  await pp.locator('input[placeholder="Your price (optional)"]').fill("120");
  await pp.locator("textarea").fill("Can do it this Thursday — parts and labour included.");
  await pp.getByRole("button", { name: /^Send quote/i }).click();
  await pp.getByText(/Your quote/i).first().waitFor({ state: "visible" });
  const proBody = await pp.locator("body").innerText();
  ok("pro sees their submitted quote (£120) on the board", proBody.includes("£120"));
  ok("quoting revealed the customer contact", proBody.includes(CUST));
  await proCtx.close();

  // --- CUSTOMER: see the quote and hire from it ---
  const custCtx = await browser.newContext({ viewport: { width: 1000, height: 1100 } });
  const cp = await custCtx.newPage(); cp.setDefaultTimeout(30000);
  await login(cp, "/customer/login", CUST, "/customer/auth/login");
  await cp.waitForURL(/\/customer(\/|$)/, { timeout: 20000 });
  await cp.getByText(TITLE).first().waitFor({ state: "visible" });
  // The quotes list loads asynchronously — wait for it before asserting.
  await cp.getByText(/quote received/i).first().waitFor({ state: "visible" });
  ok("customer sees a quote received", await cp.getByText(/1 quote received/i).isVisible());
  ok("quote shows the price (£120)", await cp.getByText(/£120/).first().isVisible());
  ok("quote shows the pitch", await cp.getByText(/parts and labour included/i).isVisible());
  await cp.getByRole("button", { name: /^Hire/i }).first().click();
  await cp.getByRole("button", { name: /Start work/i }).waitFor({ state: "visible" });
  ok("hiring from the quote moves the job to Hired", await cp.getByRole("button", { name: /Start work/i }).isVisible());
  ok("DB: pro is recorded as hired", sql(`select "hiredDriverId" is not null from "Job" where title='${TITLE}';`) === "t");
  await custCtx.close();
} catch (e) {
  ok(`no exception (${(e?.message || e).toString().split("\n")[0]})`, false);
} finally {
  sql(`delete from "Driver" where email='${PRO}';`);
  sql(`delete from "Customer" where email='${CUST}';`);
  await browser.close();
}

console.log(`\n==== job-quotes-ui: ${pass}/${pass + fail} passed ====`);
process.exit(fail ? 1 : 0);

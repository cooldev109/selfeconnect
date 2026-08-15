#!/usr/bin/env node
// Notification centre (M2.3) — browser. A pro quotes and messages a customer's
// job; the customer's bell shows the unread count and, once opened, the
// notifications, then the badge clears.
//
//   node manual-tests/notifications-ui.mjs        # dev :3100 / api :4100

import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";

const WEB = process.env.WEB_URL ?? "http://localhost:3100";
const API = process.env.API_URL ?? "http://localhost:4100/api/v1";
const DB = "postgresql://tips:tips_local_dev@localhost:5432/selfeconnect_dev";
const sql = (q) => execFileSync("psql", [DB, "-tAc", q], { encoding: "utf8" }).trim();
const S = Date.now();
const CUST = `notif_cust_${S}@example.com`;
const PRO = `notif_pro_${S}@example.com`;
const PASS = "TestPass123!";
const TITLE = `Notify tap ${S}`;

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
  // Seed: customer + job; active pro who quotes and messages.
  const cust = await api("/customer/auth/signup", { method: "POST", body: { name: "Notif Cust", email: CUST, password: PASS } });
  const job = await api("/jobs", { method: "POST", cookie: cust.cookie, body: { categorySlug: "plumber", title: TITLE, description: "The mixer tap drips constantly and needs replacing.", postcode: "RG1 8EQ", contactConsent: true } });
  const pro = await api("/auth/signup", { method: "POST", body: { name: "Notif Pro", company: "Notif Pro Ltd", email: PRO, password: PASS, postcode: "RG1 8EQ", categorySlugs: ["plumber"] } });
  ok("seed customer + job + pro", cust.ok && job.ok && pro.ok);
  sql(`update "Driver" set "isActive"=true where email='${PRO}';`);
  await api(`/pro/jobs/${job.body.id}/quote`, { method: "POST", cookie: pro.cookie, body: { amount: 12000, message: "Can do Thursday." } });
  await api(`/pro/jobs/${job.body.id}/messages`, { method: "POST", cookie: pro.cookie, body: { body: "Hi! Are you free Thursday?" } });

  // Log in as the customer.
  await page.goto(`${WEB}/customer/login`, { waitUntil: "networkidle" });
  await page.reload({ waitUntil: "networkidle" });
  await page.fill('input[placeholder="you@example.com"]', CUST);
  await page.fill('input[placeholder="Your password"]', PASS);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/customer/auth/login") && r.request().method() === "POST"),
    page.getByRole("button", { name: /^Log in/i }).click(),
  ]);
  await page.waitForURL(/\/customer(\/|$)/, { timeout: 20000 });

  // The bell shows an unread count (2: a quote + a message).
  const bell = page.getByRole("button", { name: /Notifications \(\d+ unread\)/ });
  await bell.waitFor({ state: "visible" });
  ok("bell shows an unread badge", await bell.isVisible());

  // Open it — the notifications are listed.
  await bell.click();
  await page.getByText(/New quote from Notif Pro/i).waitFor({ state: "visible" });
  ok("dropdown shows the new-quote notification", await page.getByText(/New quote from Notif Pro/i).isVisible());
  ok("dropdown shows the new-message notification", await page.getByText(/New message from Notif Pro/i).isVisible());

  // Opening marks them read — the unread badge clears.
  await page.getByRole("button", { name: /Notifications$/ }).waitFor({ state: "visible", timeout: 10000 });
  ok("unread badge clears after opening", await page.getByRole("button", { name: /Notifications$/ }).isVisible());
  ok("DB: notifications marked read", sql(`select count(*) from "Notification" n join "Customer" c on c.id=n."customerId" where c.email='${CUST}' and n."readAt" is null;`) === "0");
} catch (e) {
  ok(`no exception (${(e?.message || e).toString().split("\n")[0]})`, false);
} finally {
  sql(`delete from "Driver" where email='${PRO}';`);
  sql(`delete from "Customer" where email='${CUST}';`);
  await browser.close();
}

console.log(`\n==== notifications-ui: ${pass}/${pass + fail} passed ====`);
process.exit(fail ? 1 : 0);

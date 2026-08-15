#!/usr/bin/env node
// In-job chat (M2.2) — browser. A pro and a customer exchange messages about a
// job in two separate sessions; polling delivers each side's message to the
// other without a manual refresh.
//
//   node manual-tests/job-chat-ui.mjs        # dev :3100 / api :4100

import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";

const WEB = process.env.WEB_URL ?? "http://localhost:3100";
const API = process.env.API_URL ?? "http://localhost:4100/api/v1";
const DB = "postgresql://tips:tips_local_dev@localhost:5432/selfeconnect_dev";
const sql = (q) => execFileSync("psql", [DB, "-tAc", q], { encoding: "utf8" }).trim();
const S = Date.now();
const CUST = `chat_cust_${S}@example.com`;
const PRO = `chat_pro_${S}@example.com`;
const PASS = "TestPass123!";
const TITLE = `Chatty tap ${S}`;

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
  // Seed: customer + job; active pro who quotes (→ engaged).
  const cust = await api("/customer/auth/signup", { method: "POST", body: { name: "Chat Cust", email: CUST, password: PASS } });
  const job = await api("/jobs", { method: "POST", cookie: cust.cookie, body: { categorySlug: "plumber", title: TITLE, description: "The mixer tap drips constantly and needs replacing.", postcode: "RG1 8EQ", contactConsent: true } });
  const pro = await api("/auth/signup", { method: "POST", body: { name: "Chat Pro", email: PRO, password: PASS, postcode: "RG1 8EQ", categorySlugs: ["plumber"] } });
  ok("seed customer + job + pro", cust.ok && job.ok && pro.ok);
  sql(`update "Driver" set "isActive"=true where email='${PRO}';`);
  await api(`/pro/jobs/${job.body.id}/quote`, { method: "POST", cookie: pro.cookie, body: { amount: 12000, message: "Can do Thursday." } });

  // --- PRO opens the thread and sends the first message ---
  const proCtx = await browser.newContext({ viewport: { width: 1000, height: 1100 } });
  const pp = await proCtx.newPage(); pp.setDefaultTimeout(30000);
  await login(pp, "/login", PRO, "/auth/login");
  await pp.waitForURL(/\/(jobs|dashboard)/, { timeout: 20000 });
  await pp.goto(`${WEB}/my-jobs`, { waitUntil: "networkidle" });
  await pp.getByText(TITLE).first().waitFor({ state: "visible" });
  await pp.getByRole("button", { name: /Message customer/i }).first().click();
  await pp.getByPlaceholder("Message the customer…").fill("Hi! I can sort the tap on Thursday.");
  await pp.getByRole("button", { name: /Send message/i }).click();
  await pp.getByText(/sort the tap on Thursday/i).waitFor({ state: "visible" });
  ok("pro sends a message and sees it in the thread", true);

  // --- CUSTOMER opens that thread, reads it, and replies ---
  const custCtx = await browser.newContext({ viewport: { width: 1000, height: 1100 } });
  const cp = await custCtx.newPage(); cp.setDefaultTimeout(30000);
  await login(cp, "/customer/login", CUST, "/customer/auth/login");
  await cp.waitForURL(/\/customer(\/|$)/, { timeout: 20000 });
  await cp.getByText(TITLE).first().waitFor({ state: "visible" });
  await cp.getByText("Messages").first().waitFor({ state: "visible" });
  ok("customer sees a Messages section", true);
  // Open the thread with the pro (the chip shows the pro's name).
  await cp.getByRole("button", { name: /Chat Pro/ }).first().click();
  await cp.getByText(/sort the tap on Thursday/i).waitFor({ state: "visible" });
  ok("customer reads the pro's message", true);
  await cp.getByPlaceholder("Message the professional…").fill("Great — Thursday morning works for me.");
  await cp.getByRole("button", { name: /Send message/i }).click();
  await cp.getByText(/Thursday morning works/i).waitFor({ state: "visible" });
  ok("customer sends a reply", true);

  // --- Back on the PRO session, polling delivers the reply ---
  await pp.getByText(/Thursday morning works/i).waitFor({ state: "visible", timeout: 15000 });
  ok("pro receives the reply via polling (no refresh)", true);

  ok("DB: thread has 2 messages", sql(`select count(*) from "Message" where "jobId"='${job.body.id}';`) === "2");
  await proCtx.close();
  await custCtx.close();
} catch (e) {
  ok(`no exception (${(e?.message || e).toString().split("\n")[0]})`, false);
} finally {
  sql(`delete from "Driver" where email='${PRO}';`);
  sql(`delete from "Customer" where email='${CUST}';`);
  await browser.close();
}

console.log(`\n==== job-chat-ui: ${pass}/${pass + fail} passed ====`);
process.exit(fail ? 1 : 0);

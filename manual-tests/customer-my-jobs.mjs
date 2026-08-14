#!/usr/bin/env node
// Staged My Jobs — customer (M1.6). A customer walks one job through its
// lifecycle from the dashboard (Open → Hired → In progress → Completed) and the
// staged tabs + status badges track it.
//
//   node manual-tests/customer-my-jobs.mjs        # dev :3100 / api :4100

import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";

const WEB = process.env.WEB_URL ?? "http://localhost:3100";
const API = process.env.API_URL ?? "http://localhost:4100/api/v1";
const DB = "postgresql://tips:tips_local_dev@localhost:5432/selfeconnect_dev";
const sql = (q) => execFileSync("psql", [DB, "-tAc", q], { encoding: "utf8" }).trim();
const EMAIL = `cmj_${Date.now()}@example.com`;
const PASS = "TestPass123!";
const TITLE = `Leaking tap ${Date.now()}`;

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
const card = () => page.locator("div").filter({ hasText: TITLE }).last();

try {
  // Seed a customer + an open job via the API.
  const cust = await api("/customer/auth/signup", { method: "POST", body: { name: "CMJ Cust", email: EMAIL, password: PASS } });
  ok("seed customer created", cust.ok);
  const job = await api("/jobs", {
    method: "POST",
    cookie: cust.cookie,
    body: { categorySlug: "plumber", title: TITLE, description: "The mixer tap drips constantly and needs replacing.", postcode: "RG1 8EQ", contactConsent: true },
  });
  ok("seed job posted (open)", job.ok);

  // Log in as the customer in the browser.
  await page.goto(`${WEB}/customer/login`, { waitUntil: "networkidle" });
  await page.reload({ waitUntil: "networkidle" });
  await page.fill('input[placeholder="you@example.com"]', EMAIL);
  await page.fill('input[placeholder="Your password"]', PASS);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/customer/auth/login") && r.request().method() === "POST"),
    page.getByRole("button", { name: /^Log in/i }).click(),
  ]);
  await page.waitForURL(/\/customer(\/|$)/, { timeout: 20000 });

  // Active tab shows the open job.
  await page.getByText(TITLE).first().waitFor({ state: "visible" });
  ok("job shows under Active as Open", await page.getByText("Open").first().isVisible());
  ok("Active tab counts 1", await page.getByRole("tab", { name: /Active \(1\)/ }).isVisible());

  // Open → Hired (off-platform / just mark hired). "Start work" only exists in
  // the hired state, so its appearance is proof the transition landed.
  await page.getByRole("button", { name: /I've found my professional/i }).click();
  await page.getByRole("button", { name: /Just mark this job as hired/i }).click();
  const startWork = page.getByRole("button", { name: /Start work/i });
  await startWork.waitFor({ state: "visible" });
  ok("job is now Hired (Start work available, still Active)", await startWork.isVisible());
  ok("Active tab still counts 1 while hired", await page.getByRole("tab", { name: /Active \(1\)/ }).isVisible());

  // Hired → In progress.
  await startWork.click();
  await page.getByText("In progress").first().waitFor({ state: "visible" });
  ok("job moves to In progress", await page.getByText("In progress").first().isVisible());

  // In progress → Completed (leaves the Active tab).
  await page.getByRole("button", { name: /Mark complete/i }).click();
  await page.getByRole("tab", { name: /Completed \(1\)/ }).waitFor({ state: "visible" });
  ok("Completed tab now counts 1", await page.getByRole("tab", { name: /Completed \(1\)/ }).isVisible());
  ok("Active tab back to 0", await page.getByRole("tab", { name: /Active \(0\)/ }).isVisible());

  // The completed job lives under the Completed tab.
  await page.getByRole("tab", { name: /Completed/ }).click();
  await page.getByText(TITLE).first().waitFor({ state: "visible" });
  ok("completed job shows under the Completed tab", await page.getByText("Completed").first().isVisible());

  // Backend agrees.
  const dbStatus = sql(`select status from "Job" where title='${TITLE}';`);
  ok("job status is 'completed' in the DB", dbStatus === "completed", `db=${dbStatus}`);
} catch (e) {
  ok(`no exception (${(e?.message || e).toString().split("\n")[0]})`, false);
} finally {
  sql(`delete from "Customer" where email='${EMAIL}';`);
  await browser.close();
}

console.log(`\n==== customer-my-jobs: ${pass}/${pass + fail} passed ====`);
process.exit(fail ? 1 : 0);

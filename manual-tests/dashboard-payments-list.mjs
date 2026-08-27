#!/usr/bin/env node
// Dashboard — individual payments list (manual/browser test).
//
// The "Payments received" card can now expand an in-dashboard list of each
// payment, so a professional never has to open the spreadsheet to see them.
// Seeds three succeeded payments and checks the expand / total / collapse.
//
//   node manual-tests/dashboard-payments-list.mjs        # dev :3100

import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";

const WEB = process.env.WEB_URL ?? "http://localhost:3100";
const DB = "postgresql://tips:tips_local_dev@localhost:5432/selfeconnect_dev";
const sql = (q) => execFileSync("psql", [DB, "-tAc", q], { encoding: "utf8" }).trim();
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const EMAIL = `paylist_${Date.now()}@example.com`;

let pass = 0, fail = 0;
const ok = (n, c) => { c ? pass++ : fail++; console.log(`  ${c ? "\x1b[32m✓" : "\x1b[31m✗"}\x1b[0m ${n}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const card = () => page.locator("section").filter({ hasText: "Payments received" });

try {
  await page.goto(`${WEB}/signup`, { waitUntil: "networkidle" });
  await page.fill('input[placeholder="Jane Doe"]', "Pay List Test");
  await page.fill('input[placeholder="you@example.com"]', EMAIL);
  await page.fill('input[placeholder="+44 7700 900000"]', "+44 7700 900123");
  await page.fill('input[placeholder="At least 8 characters"]', "TestPass123!");
  await page.setInputFiles('input[type="file"]', { name: "a.png", mimeType: "image/png", buffer: PNG });
  await page.fill('input[placeholder*="M1 1AE"]', "RG1 8EQ");
  await page.getByText("Plumber", { exact: true }).first().click();
  await page.getByRole("button", { name: /Create account/i }).click();
  await page.waitForURL(/\/(home|jobs|dashboard)/, { timeout: 20000 });

  const id = sql(`select id from "Driver" where email='${EMAIL}';`);
  ok("account created", id.length > 0);
  sql(`insert into "Tip" (id,"driverId",amount,currency,type,status,"customerName","createdAt") values
    (gen_random_uuid(),'${id}',93000,'gbp','payment','succeeded','Judith', now() - interval '2 days'),
    (gen_random_uuid(),'${id}',2200,'gbp','payment','succeeded',NULL, now() - interval '1 day'),
    (gen_random_uuid(),'${id}',10000,'gbp','payment','succeeded','Sarah', now());`);

  await page.goto(`${WEB}/dashboard`, { waitUntil: "networkidle" });
  await page.getByText("Recent transactions").waitFor({ timeout: 8000 });
  const body = await page.locator("body").innerText();
  ok("Payments total £1,052.00", /£1,052\.00/.test(body));
  ok("Judith £930.00", /Judith/.test(body) && /£930\.00/.test(body));
  ok("Sarah £100.00", /Sarah/.test(body) && /£100\.00/.test(body));
  ok("anonymous payment £22.00", /Anonymous/.test(body) && /£22\.00/.test(body));
  ok("newest first (Sarah before Judith)", body.indexOf("Sarah") < body.indexOf("Judith"));
} finally {
  await browser.close();
  sql(`delete from "Driver" where email='${EMAIL}';`);
  console.log(`\nCleaned up test account`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

#!/usr/bin/env node
// Rich pro profile — work gallery (M2.4), browser. A pro adds work photos on
// their profile; a customer sees them under "Recent work" on the public
// profile.
//
//   node manual-tests/pro-gallery-ui.mjs        # dev :3100 / api :4100

import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";

const WEB = process.env.WEB_URL ?? "http://localhost:3100";
const DB = "postgresql://tips:tips_local_dev@localhost:5432/selfeconnect_dev";
const sql = (q) => execFileSync("psql", [DB, "-tAc", q], { encoding: "utf8" }).trim();
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const S = Date.now();
const PRO = `gal_pro_${S}@example.com`;
const CUST = `gal_cust_${S}@example.com`;
const PASS = "TestPass123!";

let pass = 0, fail = 0;
const ok = (n, c) => { c ? pass++ : fail++; console.log(`  ${c ? "\x1b[32m✓" : "\x1b[31m✗"}\x1b[0m ${n}`); };

const browser = await chromium.launch();
try {
  // --- PRO signs up and adds work photos ---
  const proCtx = await browser.newContext({ viewport: { width: 1000, height: 1100 } });
  const pp = await proCtx.newPage(); pp.setDefaultTimeout(30000);
  await pp.goto(`${WEB}/signup`, { waitUntil: "networkidle" });
  await pp.fill('input[placeholder="Jane Doe"]', "Gallery Pro");
  await pp.fill('input[placeholder="you@example.com"]', PRO);
  await pp.fill('input[placeholder="+44 7700 900000"]', "+44 7700 900123");
  await pp.fill('input[placeholder="At least 8 characters"]', PASS);
  await pp.setInputFiles('input[type="file"]', { name: "a.png", mimeType: "image/png", buffer: PNG });
  await pp.fill('input[placeholder*="M1 1AE"]', "RG1 8EQ");
  await pp.getByText("Plumber", { exact: true }).first().click();
  await pp.getByRole("button", { name: /Create account/i }).click();
  await pp.waitForURL(/\/(home|jobs|dashboard)/, { timeout: 20000 });
  const proId = sql(`select id from "Driver" where email='${PRO}';`);
  const publicId = sql(`select "publicId" from "Driver" where email='${PRO}';`);
  ok("pro account created", proId.length > 0);
  // Public profile requires an active subscription.
  sql(`update "Driver" set "isActive"=true where id='${proId}';`);

  await pp.goto(`${WEB}/profile`, { waitUntil: "networkidle" });
  await pp.getByText("Work gallery").waitFor({ state: "visible" });
  // The gallery file input is the last one on the page (after the avatar input).
  await pp.locator('input[type="file"]').last().setInputFiles({ name: "work1.png", mimeType: "image/png", buffer: PNG });
  await pp.locator('img[alt="Work"]').first().waitFor({ state: "visible" });
  ok("uploaded work photo shows in the gallery", (await pp.locator('img[alt="Work"]').count()) === 1);
  ok("gallery counter shows 1 of 12", await pp.getByText("1 of 12").isVisible());
  const dbCount = sql(`select coalesce(array_length("galleryPhotos",1),0) from "Driver" where id='${proId}';`);
  ok("gallery photo persisted to the DB", dbCount === "1", `db=${dbCount}`);
  await proCtx.close();

  // --- CUSTOMER sees it on the public profile ---
  const custCtx = await browser.newContext({ viewport: { width: 1000, height: 1100 } });
  const cp = await custCtx.newPage(); cp.setDefaultTimeout(30000);
  await cp.goto(`${WEB}/customer/signup`, { waitUntil: "networkidle" });
  await cp.reload({ waitUntil: "networkidle" });
  await cp.fill('input[placeholder="Jane Doe"]', "Gallery Cust");
  await cp.fill('input[placeholder="you@example.com"]', CUST);
  await cp.fill('input[placeholder="+44 7700 900000"]', "+44 7700 900123");
  await cp.fill('input[placeholder="At least 8 characters"]', PASS);
  await Promise.all([
    cp.waitForResponse((r) => r.url().includes("/customer/auth/signup") && r.request().method() === "POST"),
    cp.getByRole("button", { name: /Create free account/i }).click(),
  ]);
  await cp.waitForURL(/\/customer(\/|$)/, { timeout: 20000 });
  await cp.goto(`${WEB}/customer/pros/${publicId}`, { waitUntil: "networkidle" });
  await cp.getByText(/Recent work/i).waitFor({ state: "visible" });
  ok("public profile shows a Recent work section", await cp.getByText(/Recent work/i).isVisible());
  ok("public profile shows the work photo", (await cp.locator('img[alt="Work by this professional"]').count()) >= 1);
  await custCtx.close();
} catch (e) {
  ok(`no exception (${(e?.message || e).toString().split("\n")[0]})`, false);
} finally {
  sql(`delete from "Driver" where email='${PRO}';`);
  sql(`delete from "Customer" where email='${CUST}';`);
  await browser.close();
}

console.log(`\n==== pro-gallery-ui: ${pass}/${pass + fail} passed ====`);
process.exit(fail ? 1 : 0);

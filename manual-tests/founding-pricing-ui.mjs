#!/usr/bin/env node
// Founding-member pricing — manual (browser) test.
//
// Drives a real Chromium against the dev deployment and checks what a
// professional actually sees: the homepage pricing band, the signup panel, and
// the badge on their own account page after signing up.
//
//   node manual-tests/founding-pricing-ui.mjs

import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";

// Smallest valid PNG — the signup form requires a profile photo.
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const WEB = process.env.WEB_URL ?? "http://localhost:3100";
const DB = "postgresql://tips:tips_local_dev@localhost:5432/selfeconnect_dev";
const TS = Date.now();
const EMAIL = `founding_ui_${TS}@example.com`;

const sql = (q) => execFileSync("psql", [DB, "-tAc", q], { encoding: "utf8" }).trim();

let pass = 0;
let fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) {
    pass++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    fail++;
    console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  // ── Homepage pricing band ─────────────────────────────────────────
  console.log("\nHomepage");
  await page.goto(`${WEB}/`, { waitUntil: "networkidle" });

  const band = page.locator("#pricing");
  await band.scrollIntoViewIfNeeded();
  const bandText = await band.innerText();

  ok("pricing band shows £5.49", bandText.includes("£5.49"), bandText.slice(0, 120));
  ok("founding rate is labelled", /founding member rate/i.test(bandText));
  ok("standard rate is disclosed", bandText.includes("£9.49"));
  ok(
    "the promise is spelled out",
    /keep this price for as long as they stay subscribed/i.test(bandText),
  );
  ok(
    "no places counter while plenty remain",
    !/places left/i.test(bandText),
    bandText.replace(/\n/g, " | "),
  );
  ok("stale £9.49-only copy is gone", !/^£9\.49/m.test(bandText));

  const proCard = page.locator("text=I am a professional").first();
  await proCard.scrollIntoViewIfNeeded();
  const cardText = await proCard.locator("xpath=ancestor::*[self::div][3]").innerText();
  ok("professional card quotes £5.49", cardText.includes("£5.49"), cardText.slice(0, 160));

  await page.screenshot({ path: "/tmp/founding-ui-pricing.png", fullPage: false });

  // ── Signup page ───────────────────────────────────────────────────
  console.log("\nSignup");
  await page.goto(`${WEB}/signup`, { waitUntil: "networkidle" });
  const signupText = await page.locator("form").innerText();

  ok("submit button quotes £5.49", signupText.includes("Create account — £5.49/month"), signupText.slice(-400));
  ok("founding notice is present", /joining as a founding member/i.test(signupText));
  ok("notice discloses the later rate", signupText.includes("£9.49"));

  // ── Sign up, then check the account page ──────────────────────────
  console.log("\nAccount page after signing up");
  // Fields are matched on their placeholders — the labels are rendered by a
  // wrapper, so there is no htmlFor/id pair to target.
  await page.fill('input[placeholder="Jane Doe"]', "Founding UI Test");
  await page.fill('input[placeholder="you@example.com"]', EMAIL);
  await page.fill('input[placeholder="+44 7700 900000"]', "+44 7700 900123");
  await page.fill('input[placeholder="At least 8 characters"]', "TestPass123!");
  // A profile photo is mandatory, so give it a real (1x1) PNG.
  await page.setInputFiles('input[type="file"]', {
    name: "avatar.png",
    mimeType: "image/png",
    buffer: PNG_1PX,
  });
  await page.fill('input[placeholder*="M1 1AE"]', "RG1 8EQ");

  // Trade picker — pick Plumber from the multi-select.
  const trade = page.getByText("Plumber", { exact: true }).first();
  if (await trade.isVisible().catch(() => false)) await trade.click();

  await page.getByRole("button", { name: /Create account/i }).click();
  await page.waitForURL(/\/(dashboard|account|onboarding)/, { timeout: 20000 }).catch(() => {});

  const row = sql(`select id from "Driver" where email = '${EMAIL}';`);
  ok("account was created", row.length > 0);

  await page.goto(`${WEB}/account`, { waitUntil: "networkidle" });
  const accText = await page.locator("main, body").first().innerText();
  ok("account page shows £5.49/month", accText.includes("£5.49/month"), accText.slice(0, 200));

  // The badge only appears once a founding place has been claimed, which
  // happens when checkout starts — so it is correctly absent before that.
  ok(
    "no founding badge before checkout",
    !/founding member/i.test(accText),
    "badge shown too early",
  );

  await page.screenshot({ path: "/tmp/founding-ui-account.png", fullPage: false });

  // Claim the place the way the app does, then re-check.
  sql(`update "Driver" set "foundingMember" = true where email = '${EMAIL}';`);
  await page.reload({ waitUntil: "networkidle" });
  const accText2 = await page.locator("main, body").first().innerText();
  ok("founding badge appears once the place is claimed", /founding member/i.test(accText2));
  ok("…and the price is still £5.49/month", accText2.includes("£5.49/month"));
} finally {
  await browser.close();
  sql(`delete from "Driver" where email = '${EMAIL}';`);
  const left = sql(`select count(*) from "Driver" where email = '${EMAIL}';`);
  console.log(`\nCleaned up test account (rows left: ${left})`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

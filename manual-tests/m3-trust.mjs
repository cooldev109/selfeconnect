// M3 (Trust & control) browser E2E. Drives the real UI at BASE (default the
// dev proxy :3200) with Playwright: the professional verification centre, the
// admin review queue, verified badges on the public profile, and the
// review-integrity report/hide flow. Accounts are created via the API and their
// session cookies injected into browser contexts (domain=localhost is
// port-agnostic, so a cookie minted on :4100 is valid at :3200).
import { chromium } from "@playwright/test";
import {
  req,
  sql,
  signupPro,
  signupCustomer,
  makeAdmin,
  delDriver,
  delCustomer,
} from "./api/_lib.mjs";

const BASE = process.env.BASE_URL || "http://localhost:3200";
const cookieVal = (setCookie, name) => {
  const m = new RegExp(`${name}=([^;]+)`).exec(setCookie);
  return m ? m[1] : "";
};

async function ctxFor(browser, cookieHeader, name) {
  const ctx = await browser.newContext();
  await ctx.addCookies([
    { name, value: cookieVal(cookieHeader, name), domain: "localhost", path: "/" },
  ]);
  return ctx;
}

export async function run(sharedBrowser) {
  const browser = sharedBrowser || (await chromium.launch());
  let pass = 0, fail = 0;
  const fails = [];
  const ok = (label, cond, detail = "") => {
    if (cond) { pass++; console.log(`  \x1b[32m✓\x1b[0m ${label}`); }
    else { fail++; fails.push(label + (detail ? ` — ${detail}` : "")); console.log(`  \x1b[31m✗\x1b[0m ${label}${detail ? ` — ${detail}` : ""}`); }
  };

  console.log("\n── M3 Trust & control (browser E2E) ──");
  const drivers = [], customers = [];
  try {
    const pro = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(pro.email);
    sql(`update "Driver" set "isActive"=true where id='${pro.id}';`);
    const admin = await makeAdmin();
    drivers.push(admin.email);
    const cust = await signupCustomer();
    customers.push(cust.email);

    // ---------- PRO: verification centre ----------
    const proCtx = await ctxFor(browser, pro.cookie, "tv_session");
    const proPage = await proCtx.newPage();
    await proPage.goto(`${BASE}/verify`, { waitUntil: "networkidle" });
    ok("pro verification page loads", await proPage.getByText("Verification & badges").first().isVisible());

    // Phone: send code, read the dev code shown in test mode, verify.
    await proPage.getByPlaceholder("+44 7700 900000").fill("+44 7700 900321");
    await proPage.getByRole("button", { name: "Send code" }).click();
    await proPage.getByText("Test mode — your code is").waitFor({ timeout: 8000 });
    const codeText = await proPage.locator("span.font-mono.font-bold").first().innerText();
    const code = codeText.trim();
    ok("phone dev code is shown in test mode", /^\d{6}$/.test(code), code);
    await proPage.getByPlaceholder("6-digit code").fill(code);
    await proPage.getByRole("button", { name: "Verify" }).click();
    await proPage.waitForTimeout(1200);
    ok("phone verifies in the UI (badge shows)", await proPage.getByText("Phone verified").first().isVisible());

    // Identity: upload a PDF and submit for review.
    const idCard = proPage.locator("div").filter({ hasText: /^Identity/ }).first();
    await proPage.locator('input[type="file"]').first().setInputFiles({
      name: "id.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 selfeconnect e2e id"),
    });
    await proPage.getByRole("button", { name: "Submit for review" }).first().click();
    await proPage.waitForTimeout(1200);
    ok("identity submission shows 'In review'", await proPage.getByText("In review").first().isVisible());
    await proCtx.close();

    // ---------- ADMIN: review queue ----------
    const adminCtx = await ctxFor(browser, admin.cookie, "tv_session");
    const adminPage = await adminCtx.newPage();
    await adminPage.goto(`${BASE}/admin/verifications`, { waitUntil: "networkidle" });
    ok("admin sees the pending submission (pro's email)", await adminPage.getByText(pro.email).first().isVisible());
    await adminPage.getByRole("button", { name: "Approve" }).first().click();
    await adminPage.waitForTimeout(1200);
    // Verify server-side it actually approved.
    const status = sql(`select status from "Verification" where "driverId"='${pro.id}' and type='identity';`);
    ok("admin approve marks identity verified", status === "verified", status);
    await adminCtx.close();

    // ---------- PUBLIC: badge on the profile ----------
    const custCtx = await ctxFor(browser, cust.cookie, "sc_customer");
    const custPage = await custCtx.newPage();
    await custPage.goto(`${BASE}/customer/pros/${pro.publicId}`, { waitUntil: "networkidle" });
    ok("public profile shows the Verified Pro badge", await custPage.getByText("Verified Pro").first().isVisible());

    // ---------- REVIEW INTEGRITY ----------
    // Customer leaves a review (API), then the pro reports it in the UI.
    const rv = await req("/reviews", { method: "POST", cookie: cust.cookie, body: { driverPublicId: pro.publicId, rating: 1, comment: "e2e fake review" } });
    const reviewId = rv.body?.id;
    ok("customer review created for the report flow", rv.ok && !!reviewId, `HTTP ${rv.status}`);
    await custCtx.close();

    const proCtx2 = await ctxFor(browser, pro.cookie, "tv_session");
    const proPage2 = await proCtx2.newPage();
    await proPage2.goto(`${BASE}/reviews`, { waitUntil: "networkidle" });
    ok("pro sees the review on My reviews", await proPage2.getByText("e2e fake review").first().isVisible());
    await proPage2.locator('button[title="Report this review"]').first().click();
    await proPage2.getByPlaceholder("What's wrong with this review?").fill("Fake review from a competitor");
    await proPage2.getByRole("button", { name: "Report review" }).click();
    await proPage2.getByText("Report received").waitFor({ timeout: 8000 });
    ok("pro report flow completes in the UI", true);
    ok("report is recorded server-side", sql(`select "reportCount" from "Review" where id='${reviewId}';`) === "1");
    await proCtx2.close();

    // Admin hides the reported review; it leaves the public profile.
    const adminCtx2 = await ctxFor(browser, admin.cookie, "tv_session");
    const adminPage2 = await adminCtx2.newPage();
    await adminPage2.goto(`${BASE}/admin/reviews`, { waitUntil: "networkidle" });
    ok("reported review shows a report badge in admin", await adminPage2.getByText(/1 report/).first().isVisible());
    await adminPage2.locator('button[title="Hide from public profile"]').first().click();
    await adminPage2.waitForTimeout(1200);
    ok("review is hidden server-side", sql(`select ("hiddenAt" is not null) from "Review" where id='${reviewId}';`) === "t");
    await adminCtx2.close();
  } catch (e) {
    ok("no unexpected error", false, (e?.message || String(e)).split("\n")[0]);
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
    if (!sharedBrowser) await browser.close();
  }
  console.log(`\n  M3 E2E: ${pass}/${pass + fail} passed`);
  if (fails.length) console.log("  Failures:\n   - " + fails.join("\n   - "));
  // Return both shapes so either runner (api pass/fail, e2e passed/total) totals.
  return { name: "m3-trust", pass, fail, fails, passed: pass, total: pass + fail };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

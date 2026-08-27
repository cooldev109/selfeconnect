// Ruan feedback batch (2026-08-19) browser E2E: chat message timestamps,
// professional editing a sent quote, and the customer's "View profile" links
// from the quote + chat. Drives the real UI; accounts seeded via the API.
import { chromium } from "@playwright/test";
import {
  req,
  sql,
  signupPro,
  signupCustomer,
  delDriver,
  delCustomer,
} from "./api/_lib.mjs";

const BASE = process.env.BASE_URL || "http://localhost:3200";
const cookieVal = (sc, name) => {
  const m = new RegExp(`${name}=([^;]+)`).exec(sc);
  return m ? m[1] : "";
};
async function ctxFor(browser, cookieHeader, name) {
  const ctx = await browser.newContext();
  await ctx.addCookies([{ name, value: cookieVal(cookieHeader, name), domain: "localhost", path: "/" }]);
  return ctx;
}

export async function run(sharedBrowser) {
  const browser = sharedBrowser || (await chromium.launch());
  let pass = 0, fail = 0;
  const fails = [];
  const ok = (l, c, d = "") => {
    if (c) { pass++; console.log(`  \x1b[32m✓\x1b[0m ${l}`); }
    else { fail++; fails.push(l + (d ? ` — ${d}` : "")); console.log(`  \x1b[31m✗\x1b[0m ${l}${d ? ` — ${d}` : ""}`); }
  };
  console.log("\n── Ruan feedback: chat time · edit quote · profile links ──");
  const drivers = [], customers = [];
  try {
    const pro = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(pro.email);
    sql(`update "Driver" set "isActive"=true where id='${pro.id}';`);
    const cust = await signupCustomer();
    customers.push(cust.email);
    const job = await req("/jobs", { method: "POST", cookie: cust.cookie, body: { categorySlug: "plumber", title: "Feedback test job", description: "need a plumber for the feedback test", postcode: "RG1 8EQ", contactConsent: true } });
    const jobId = job.body.id;
    await req(`/pro/jobs/${jobId}/quote`, { method: "POST", cookie: pro.cookie, body: { amount: 5000, message: "I can do this job well" } });
    await req(`/pro/jobs/${jobId}/messages`, { method: "POST", cookie: pro.cookie, body: { body: "Hello, when suits you?" } });

    // ---- #2 Professional edits their quote ----
    const proCtx = await ctxFor(browser, pro.cookie, "tv_session");
    const proPage = await proCtx.newPage();
    await proPage.goto(`${BASE}/jobs`, { waitUntil: "networkidle" });
    ok("pro sees their existing quote on the board", await proPage.getByText(/Your quote/).first().isVisible());
    await proPage.getByRole("button", { name: "Edit" }).first().click();
    await proPage.getByPlaceholder("Your price (optional)").fill("95");
    await proPage.getByRole("button", { name: "Update quote" }).click();
    await proPage.waitForTimeout(1400);
    ok("editing updates the quote to £95 server-side", sql(`select amount from "Quote" where "jobId"='${jobId}';`) === "9500");

    // ---- #5 checklist moved to Account (not the Payments tab) ----
    await proPage.goto(`${BASE}/account`, { waitUntil: "networkidle" });
    ok("'Finish setting up' checklist is on the Account page", await proPage.getByText(/Finish setting up/i).first().isVisible());
    await proPage.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    ok("checklist is NOT on the Payments & tips dashboard", !(await proPage.getByText(/Finish setting up/i).first().isVisible().catch(() => false)));
    // ---- #6 individual payments are listed on the dashboard (no spreadsheet needed) ----
    // The old "View payments" toggle is gone; the "Recent transactions" table is
    // always visible, so a pro sees each payment/tip without any extra click.
    ok("'Recent transactions' list is present on the dashboard", await proPage.getByText(/Recent transactions/i).first().isVisible());
    await proCtx.close();

    // ---- #3 profile link on the quote + #1 chat timestamp ----
    // Quotes + chat now live on the dedicated job detail page (opened from the
    // clickable My-jobs summary rows).
    const custCtx = await ctxFor(browser, cust.cookie, "sc_customer");
    const custPage = await custCtx.newPage();
    await custPage.goto(`${BASE}/customer/jobs/${jobId}`, { waitUntil: "networkidle" });
    const profileLink = custPage.getByRole("link", { name: /View profile/ }).first();
    ok("quote shows a 'View profile' link", await profileLink.isVisible());
    const href = await profileLink.getAttribute("href");
    ok("the profile link points to that professional", (href || "").includes(pro.publicId), href || "(none)");

    // open the chat thread → message + timestamp
    await custPage.getByRole("button", { name: /MT Pro/ }).first().click().catch(() => {});
    await custPage.waitForTimeout(900);
    ok("the chat message shows in the thread", await custPage.getByText("Hello, when suits you?").first().isVisible());
    const hasTime = await custPage.locator("text=/\\b\\d{1,2}:\\d{2}\\b/").first().isVisible().catch(() => false);
    ok("the chat message shows a time", hasTime);

    // #15 — the review form opens right under the hero, above the gallery.
    sql(`update "Driver" set "galleryPhotos"=ARRAY['https://x/a.webp']::text[] where id='${pro.id}'`);
    await custPage.goto(`${BASE}/customer/pros/${pro.publicId}`, { waitUntil: "networkidle" });
    await custPage.getByRole("button", { name: /Write a review/ }).first().click();
    await custPage.waitForTimeout(500);
    const pos = await custPage.evaluate(() => {
      const svc = [...document.querySelectorAll("*")].find((e) => e.childNodes.length === 1 && e.textContent?.trim() === "How was the service?");
      const g = [...document.querySelectorAll("h2")].find((e) => e.textContent?.includes("Recent work"));
      return { f: svc ? Math.round(svc.getBoundingClientRect().top) : null, g: g ? Math.round(g.getBoundingClientRect().top) : null };
    });
    ok("review form opens above the gallery, not below it (#15)", pos.f != null && pos.g != null && pos.f < pos.g, JSON.stringify(pos));
    await custCtx.close();
  } catch (e) {
    ok("no unexpected error", false, (e?.message || String(e)).split("\n")[0]);
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
    if (!sharedBrowser) await browser.close();
  }
  console.log(`\n  Ruan feedback E2E: ${pass}/${pass + fail} passed`);
  if (fails.length) console.log("  Failures:\n   - " + fails.join("\n   - "));
  return { name: "ruan-feedback", pass, fail, fails, passed: pass, total: pass + fail };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

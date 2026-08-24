// Ruan feedback #19/#20 browser E2E: confirming "Mark complete" opens the
// review page for the hired pro; "Cancel" and "Mark complete" both ask for
// confirmation first.
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

export async function run(sharedBrowser) {
  const browser = sharedBrowser || (await chromium.launch());
  let pass = 0, fail = 0;
  const fails = [];
  const ok = (l, c, d = "") => {
    if (c) { pass++; console.log(`  \x1b[32m✓\x1b[0m ${l}`); }
    else { fail++; fails.push(l + (d ? ` — ${d}` : "")); console.log(`  \x1b[31m✗\x1b[0m ${l}${d ? ` — ${d}` : ""}`); }
  };
  console.log("\n── Job actions: complete → review, confirmations ──");
  const drivers = [], customers = [];
  try {
    const pro = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(pro.email);
    sql(`update "Driver" set "isActive"=true where id='${pro.id}';`);
    const cust = await signupCustomer();
    customers.push(cust.email);

    // A hired job (ready to be completed), and an open job (to cancel).
    const hired = await req("/jobs", { method: "POST", cookie: cust.cookie, body: { categorySlug: "plumber", title: "Fix the tap", description: "A dripping tap to be fixed", postcode: "RG1 8EQ", contactConsent: true } });
    sql(`update "Job" set status='hired', "hiredDriverId"='${pro.id}' where id='${hired.body.id}';`);
    await req("/jobs", { method: "POST", cookie: cust.cookie, body: { categorySlug: "plumber", title: "Paint a fence", description: "A fence that needs painting", postcode: "RG1 8EQ", contactConsent: true } });

    const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
    await ctx.addCookies([{ name: "sc_customer", value: cookieVal(cust.cookie, "sc_customer"), domain: "localhost", path: "/" }]);
    const p = await ctx.newPage();
    await p.goto(`${BASE}/customer`, { waitUntil: "networkidle" });

    // Jobs are now compact summary rows that open a dedicated detail page.
    await p.getByText("Fix the tap").first().click();
    await p.waitForURL(/\/customer\/jobs\//, { timeout: 10000 });
    ok("a job row opens its detail page", /\/customer\/jobs\//.test(p.url()), p.url());

    // #20 — "Mark complete" asks for confirmation first.
    await p.getByRole("button", { name: /Mark complete/ }).first().click();
    await p.getByText(/Are you sure the job is completed\?/).waitFor({ timeout: 6000 });
    ok("'Mark complete' shows a confirmation (#20)", true);
    ok("job is still 'hired' before confirming", sql(`select status from "Job" where id='${hired.body.id}';`) === "hired");

    // #19 — confirming completes the job AND opens the review page.
    await p.getByRole("button", { name: /Yes, it's complete/ }).click();
    await p.waitForTimeout(1500);
    ok("job is now completed", sql(`select status from "Job" where id='${hired.body.id}';`) === "completed");
    ok("customer is taken to the review page (#19)", p.url().includes(`/customer/pros/${pro.publicId}`), p.url());
    ok("the review form is open", await p.getByText(/How was the service\?/).first().isVisible());

    // #20 — "Cancel" asks for confirmation too (on the open job's detail page).
    await p.goto(`${BASE}/customer`, { waitUntil: "networkidle" });
    await p.getByText("Paint a fence").first().click();
    await p.waitForURL(/\/customer\/jobs\//, { timeout: 10000 });
    await p.getByRole("button", { name: /^Cancel$/ }).first().click();
    ok("'Cancel' shows a confirmation (#20)", await p.getByText(/Are you sure you want to cancel this job\?/).first().isVisible());
    await ctx.close();
  } catch (e) {
    ok("no unexpected error", false, (e?.message || String(e)).split("\n")[0]);
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
    if (!sharedBrowser) await browser.close();
  }
  console.log(`\n  Job actions E2E: ${pass}/${pass + fail} passed`);
  if (fails.length) console.log("  Failures:\n   - " + fails.join("\n   - "));
  return { name: "job-actions", pass, fail, fails, passed: pass, total: pass + fail };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

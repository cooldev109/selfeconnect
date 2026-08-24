// Customer job detail page (clickable summary rows → dedicated job page).
// A customer's My-jobs list shows compact rows with status badges + a quote
// count; clicking one opens /customer/jobs/{id}, where quotes are compared and
// the pro is hired. Covers the new navigation + the reused JobWorkspace.
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
  console.log("\n── Customer job detail page ──");
  const drivers = [], customers = [];
  try {
    const cust = await signupCustomer();
    customers.push(cust.email);
    const job = await req("/jobs", { method: "POST", cookie: cust.cookie, body: { categorySlug: "plumber", title: "Detail page tap", description: "A tap that drips and needs a new washer.", postcode: "RG1 8EQ", contactConsent: true } });

    // An engaged pro who submits a quote (£80) on the open job.
    const pro = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(pro.email);
    sql(`update "Driver" set "isActive"=true where id='${pro.id}';`);
    await req(`/pro/jobs/${job.body.id}/quote`, { method: "POST", cookie: pro.cookie, body: { amount: 8000, message: "Can do this week. £80 all in." } });

    const ctx = await browser.newContext({ viewport: { width: 1000, height: 1100 } });
    await ctx.addCookies([{ name: "sc_customer", value: cookieVal(cust.cookie, "sc_customer"), domain: "localhost", path: "/" }]);
    const p = await ctx.newPage();
    p.setDefaultTimeout(30000);

    // The list shows a compact row: an "Open" status badge + a quote count.
    await p.goto(`${BASE}/customer`, { waitUntil: "networkidle" });
    await p.getByText("Detail page tap").first().waitFor({ state: "visible" });
    ok("job row shows the Open status badge", await p.getByText("Open").first().isVisible());
    ok("job row shows a quote count", await p.getByText(/1 quote/).first().isVisible());

    // Clicking the row opens the dedicated job page.
    await p.getByText("Detail page tap").first().click();
    await p.waitForURL(/\/customer\/jobs\//, { timeout: 10000 });
    ok("clicking a job row opens its detail page", /\/customer\/jobs\//.test(p.url()), p.url());

    // The detail page carries the full workspace: the quote + a Hire button.
    const hireBtn = p.getByRole("button", { name: /^Hire$/ }).first();
    await hireBtn.waitFor({ state: "visible" });
    ok("a Hire button is available", true);
    ok("the quote message is shown on the detail page", await p.getByText(/Can do this week/).first().isVisible());
    ok("the quote amount (£80) is shown", await p.getByText(/£80/).first().isVisible());

    // Hiring from the detail page moves the job to Hired.
    await hireBtn.click();
    await p.getByRole("button", { name: /Start work/i }).waitFor({ state: "visible" });
    ok("hiring on the detail page works (Start work appears)", true);
    ok("job is 'hired' in the DB", sql(`select status from "Job" where id='${job.body.id}';`) === "hired");

    await ctx.close();
  } catch (e) {
    ok("no unexpected error", false, (e?.message || String(e)).split("\n")[0]);
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
    if (!sharedBrowser) await browser.close();
  }
  console.log(`\n  Customer job detail E2E: ${pass}/${pass + fail} passed`);
  if (fails.length) console.log("  Failures:\n   - " + fails.join("\n   - "));
  return { name: "customer-job-detail", pass, fail, fails, passed: pass, total: pass + fail };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

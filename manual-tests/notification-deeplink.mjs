// Notification deep-links (M1). Clicking a notification takes the user to the
// related content — a customer to the job detail, a professional to that job's
// conversation on My jobs — instead of dropping them on the dashboard.
import { chromium } from "@playwright/test";
import { req, sql, signupPro, signupCustomer, delDriver, delCustomer } from "./api/_lib.mjs";

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
  console.log("\n── Notification deep-links ──");
  const drivers = [], customers = [];
  try {
    const cust = await signupCustomer();
    customers.push(cust.email);
    const pro = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(pro.email);
    sql(`update "Driver" set "isActive"=true where id='${pro.id}'`);

    const job = await req("/jobs", { method: "POST", cookie: cust.cookie, body: { categorySlug: "plumber", title: "Deeplink tap job", description: "A tap that drips constantly and needs a new washer fitted.", postcode: "RG1 8EQ", contactConsent: true } });
    const jobId = job.body.id;
    // A quote unlocks the job so it shows in the pro's My jobs.
    await req(`/pro/jobs/${jobId}/quote`, { method: "POST", cookie: pro.cookie, body: { amount: 9000, message: "Can do it." } });

    // One notification per side, each carrying the job as its deep-link target.
    sql(`insert into "Notification" (id,"customerId",kind,title,"jobId","createdAt") values (gen_random_uuid(),'${cust.id}','quote','A quote arrived on your job','${jobId}',now())`);
    sql(`insert into "Notification" (id,"driverId",kind,title,"jobId","createdAt") values (gen_random_uuid(),'${pro.id}','message','Customer replied to you','${jobId}',now())`);

    // --- CUSTOMER: notification → job detail ---
    const cc = await browser.newContext({ viewport: { width: 1000, height: 900 } });
    await cc.addCookies([{ name: "sc_customer", value: cookieVal(cust.cookie, "sc_customer"), domain: "localhost", path: "/" }]);
    const cp = await cc.newPage(); cp.setDefaultTimeout(30000);
    await cp.goto(`${BASE}/customer`, { waitUntil: "networkidle" });
    await cp.getByRole("button", { name: /Notifications/ }).first().click();
    await cp.getByText("A quote arrived on your job").first().waitFor({ state: "visible" });
    await cp.getByText("A quote arrived on your job").first().click();
    await cp.waitForURL(new RegExp(`/customer/jobs/${jobId}`), { timeout: 10000 }).catch(() => {});
    ok("customer notification opens the related job detail", new RegExp(`/customer/jobs/${jobId}`).test(cp.url()), cp.url());
    await cc.close();

    // --- PRO: notification → My jobs, that job's conversation open ---
    const pc = await browser.newContext({ viewport: { width: 1000, height: 1000 } });
    await pc.addCookies([{ name: "tv_session", value: cookieVal(pro.cookie, "tv_session"), domain: "localhost", path: "/" }]);
    const pp = await pc.newPage(); pp.setDefaultTimeout(30000);
    await pp.goto(`${BASE}/home`, { waitUntil: "networkidle" });
    await pp.getByRole("button", { name: /Notifications/ }).first().click();
    await pp.getByText("Customer replied to you").first().waitFor({ state: "visible" });
    await pp.getByText("Customer replied to you").first().click();
    await pp.waitForURL(/\/my-jobs\?job=/, { timeout: 10000 }).catch(() => {});
    ok("pro notification opens My jobs focused on the job", /\/my-jobs\?job=/.test(pp.url()), pp.url());
    ok("the focused job's conversation opens", await pp.getByRole("button", { name: /Hide messages/ }).first().isVisible().catch(() => false));
    await pc.close();
  } catch (e) {
    ok("no unexpected error", false, (e?.message || String(e)).split("\n")[0]);
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
    if (!sharedBrowser) await browser.close();
  }
  console.log(`\n  Notification deep-link E2E: ${pass}/${pass + fail} passed`);
  if (fails.length) console.log("  Failures:\n   - " + fails.join("\n   - "));
  return { name: "notification-deeplink", pass, fail, fails, passed: pass, total: pass + fail };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

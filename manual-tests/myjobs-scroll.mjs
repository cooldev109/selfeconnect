// "View job" (and job notifications) deep-link to My jobs with ?job=<id>. The
// matching card is highlighted AND the page auto-scrolls to it, so it's on
// screen immediately instead of the pro having to scroll down to find it.
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
  console.log("\n── My jobs: auto-scroll to a deep-linked job ──");
  const drivers = [], customers = [];
  try {
    const cust = await signupCustomer();
    customers.push(cust.email);
    const pro = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(pro.email);
    sql(`update "Driver" set "isActive"=true where id='${pro.id}';`);

    // Engage several jobs so the My-jobs list is taller than the viewport. The
    // first-created job ends up at the bottom (list is newest-activity first).
    const ids = [];
    for (let i = 1; i <= 6; i++) {
      const j = await req("/jobs", { method: "POST", cookie: cust.cookie, body: { categorySlug: "plumber", title: `Scroll job ${i}`, description: "A plumbing job used to fill the My-jobs list so the target sits below the fold.", postcode: "RG1 8EQ", contactConsent: true } });
      ids.push(j.body.id);
      await req(`/pro/jobs/${j.body.id}/quote`, { method: "POST", cookie: pro.cookie, body: { amount: 9000 + i, message: "Available." } });
    }
    const bottomId = ids[0]; // first-created → oldest activity → bottom of list

    const ctx = await browser.newContext({ viewport: { width: 1000, height: 620 } });
    await ctx.addCookies([{ name: "tv_session", value: cookieVal(pro.cookie, "tv_session"), domain: "localhost", path: "/" }]);
    const pp = await ctx.newPage(); pp.setDefaultTimeout(30000);

    // Control: without a deep link, the page stays at the top.
    await pp.goto(`${BASE}/my-jobs`, { waitUntil: "networkidle" });
    await pp.getByText("Scroll job 6").first().waitFor({ state: "visible" });
    await pp.waitForTimeout(500);
    ok("without a deep link the page stays at the top", (await pp.evaluate(() => window.scrollY)) < 50, `scrollY=${await pp.evaluate(() => window.scrollY)}`);

    // Deep link to the bottom job → the page should auto-scroll to it.
    await pp.goto(`${BASE}/my-jobs?job=${bottomId}`, { waitUntil: "networkidle" });
    await pp.getByText("Scroll job 1").first().waitFor({ state: "attached" });
    await pp.waitForTimeout(1000); // allow the deferred auto-scroll to run
    const scrollY = await pp.evaluate(() => window.scrollY);
    ok("the page auto-scrolled down to the deep-linked job", scrollY > 100, `scrollY=${scrollY}`);
    const box = await pp.getByText("Scroll job 1").first().boundingBox();
    const vh = await pp.evaluate(() => window.innerHeight);
    ok("the deep-linked job card is on screen (within the viewport)", !!box && box.y >= 0 && box.y <= vh, JSON.stringify({ y: box && Math.round(box.y), vh }));

    await ctx.close();
  } catch (e) {
    ok("no unexpected error", false, (e?.message || String(e)).split("\n")[0]);
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
    if (!sharedBrowser) await browser.close();
  }
  console.log(`\n  My jobs auto-scroll E2E: ${pass}/${pass + fail} passed`);
  if (fails.length) console.log("  Failures:\n   - " + fails.join("\n   - "));
  return { name: "myjobs-scroll", pass, fail, fails, passed: pass, total: pass + fail };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

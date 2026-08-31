// Find work board (pro) — Ruan feedback: newest jobs first + a "Not interested"
// dismiss with confirmation that hides the job from this pro's board only.
import { chromium } from "@playwright/test";
import { signupPro, signupCustomer, req, sql, delDriver, delCustomer } from "./api/_lib.mjs";

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
  console.log("\n── Find work board (newest-first + not interested) ──");
  const drivers = [], customers = [];
  try {
    const pro = await signupPro({ name: "FW Pro", categorySlugs: ["plumber"] });
    drivers.push(pro.email);
    sql(`update "Driver" set "isActive"=true, "stripeOnboarded"=true where id='${pro.id}';`);
    const drv = JSON.parse(sql(`select json_build_object('lat',latitude,'lng',longitude) from "Driver" where id='${pro.id}';`));

    const cust = await signupCustomer();
    customers.push(cust.email);
    const S = Date.now();
    const near = `Near older ${S}`, far = `Far newer ${S}`;
    const mk = (title) => req("/jobs", { method: "POST", cookie: cust.cookie, body: { categorySlug: "plumber", title, description: "Find work board test job.", postcode: "RG1 8EQ", contactConsent: true } });
    const jNear = await mk(near);
    const jFar = await mk(far);
    // near = distance 0, older; far = ~7 miles away, newest.
    sql(`update "Job" set latitude=${drv.lat}, longitude=${drv.lng}, "createdAt"=now() - interval '2 hours' where id='${jNear.body.id}';`);
    sql(`update "Job" set latitude=${drv.lat + 0.1}, longitude=${drv.lng}, "createdAt"=now() where id='${jFar.body.id}';`);

    // API: the board is newest-first even when a nearer job is older.
    const board = await req("/pro/jobs?radius=25", { cookie: pro.cookie });
    const order = (board.body || []).map((j) => j.title).filter((t) => t === near || t === far);
    ok("board is newest-first (far-but-newer above near-but-older)", order[0] === far && order[1] === near, order.join(" | "));

    const ctx = await browser.newContext({ viewport: { width: 1100, height: 1100 } });
    await ctx.addCookies([{ name: "tv_session", value: cookieVal(pro.cookie, "tv_session"), domain: "localhost", path: "/" }]);
    const p = await ctx.newPage();
    p.setDefaultTimeout(30000);
    await p.goto(`${BASE}/jobs`, { waitUntil: "networkidle" });
    await p.getByText(far).first().waitFor({ state: "visible" });
    ok("both jobs show on the board", await p.getByText(near).first().isVisible() && await p.getByText(far).first().isVisible());

    // "Not interested" on the far job → confirmation → removed.
    const card = p.locator("div").filter({ hasText: far }).filter({ has: p.getByRole("button", { name: /Not interested/ }) }).last();
    await card.getByRole("button", { name: /Not interested/ }).click();
    await p.getByText(/Are you sure you're not interested/i).waitFor({ state: "visible" });
    ok("a confirmation dialog is shown", true);
    await p.getByRole("button", { name: /Yes, not interested/i }).click();
    await p.waitForTimeout(1200);
    ok("the dismissed job leaves the board", !(await p.getByText(far).first().isVisible().catch(() => false)));
    ok("the other job stays on the board", await p.getByText(near).first().isVisible());

    await p.reload({ waitUntil: "networkidle" });
    await p.getByText(near).first().waitFor({ state: "visible" });
    ok("the dismissal persists after reload", !(await p.getByText(far).first().isVisible().catch(() => false)));
    ok("a JobDismissal row is recorded", sql(`select count(*) from "JobDismissal" jd join "Job" j on j.id=jd."jobId" where j.title='${far}'`) === "1");

    await ctx.close();
  } catch (e) {
    ok("no unexpected error", false, (e?.message || String(e)).split("\n")[0]);
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
    if (!sharedBrowser) await browser.close();
  }
  console.log(`\n  Find work E2E: ${pass}/${pass + fail} passed`);
  if (fails.length) console.log("  Failures:\n   - " + fails.join("\n   - "));
  return { name: "pro-find-work", pass, fail, fails, passed: pass, total: pass + fail };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

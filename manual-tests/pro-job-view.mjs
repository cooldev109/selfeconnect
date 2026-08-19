// Ruan feedback #8/#9/#10 browser E2E: a customer's job photos + full details
// reach the professional on both the Find Work board and My Jobs, and the
// status reads "Quoted" only when the pro actually quoted (not on unlock-only).
import { chromium } from "@playwright/test";
import {
  API,
  req,
  sql,
  signupPro,
  signupCustomer,
  delDriver,
  delCustomer,
  PNG_64,
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
  console.log("\n── Pro job view: photos · full details · quoted-vs-contacted ──");
  const drivers = [], customers = [];
  try {
    const proA = await signupPro({ categorySlugs: ["plumber"] });
    const proB = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(proA.email, proB.email);
    sql(`update "Driver" set "isActive"=true where id in ('${proA.id}','${proB.id}')`);
    const cust = await signupCustomer();
    customers.push(cust.email);

    // Customer posts a job WITH a photo attached.
    const form = new FormData();
    form.append("file", new Blob([PNG_64], { type: "image/png" }), "job.png");
    const up = await (await fetch(`${API}/jobs/photo`, { method: "POST", body: form })).json();
    ok("job photo uploads", typeof up.url === "string" && up.url.length > 0, JSON.stringify(up));
    const job = await req("/jobs", { method: "POST", cookie: cust.cookie, body: { categorySlug: "plumber", title: "Sofa removal", description: "Need to remove a sofa and a bed from the second floor.", postcode: "RG1 8EQ", contactConsent: true, photos: [up.url] } });
    const jobId = job.body.id;

    await req(`/pro/jobs/${jobId}/quote`, { method: "POST", cookie: proA.cookie, body: { amount: 8000, message: "I can do this" } });
    await req(`/pro/jobs/${jobId}/unlock`, { method: "POST", cookie: proB.cookie });

    // #8/#10 — the pro job shape carries photos + description.
    const board = await req(`/pro/jobs?radius=100`, { cookie: proA.cookie });
    const bjob = (board.body ?? []).find((j) => j.id === jobId);
    ok("pro job shape carries the customer's photos (#8)", Array.isArray(bjob?.photos) && bjob.photos.length === 1, JSON.stringify(bjob?.photos));
    ok("pro job shape carries the full description (#10)", (bjob?.description ?? "").includes("remove a sofa"));

    // proA (quoted): photo on Find Work; description + photo + "Quoted" on My Jobs.
    const aCtx = await ctxFor(browser, proA.cookie, "tv_session");
    const aPage = await aCtx.newPage();
    await aPage.goto(`${BASE}/jobs`, { waitUntil: "networkidle" });
    ok("Find Work shows the job photo (#8)", await aPage.locator('img[alt="Job photo"]').first().isVisible());
    await aPage.goto(`${BASE}/my-jobs`, { waitUntil: "networkidle" });
    ok("My Jobs shows the full description (#10)", await aPage.getByText(/remove a sofa and a bed/).first().isVisible());
    ok("My Jobs shows the job photo (#10)", await aPage.locator('img[alt="Job photo"]').first().isVisible());
    ok("My Jobs reads 'Quoted' for a pro who quoted (#9)", await aPage.getByText("Quoted").first().isVisible());
    await aCtx.close();

    // proB (unlock only): My Jobs reads "Contacted", not "Quoted".
    const bCtx = await ctxFor(browser, proB.cookie, "tv_session");
    const bPage = await bCtx.newPage();
    await bPage.goto(`${BASE}/my-jobs`, { waitUntil: "networkidle" });
    ok("My Jobs reads 'Contacted' for unlock-only (#9)", await bPage.getByText("Contacted").first().isVisible());
    ok("unlock-only does NOT read 'Quoted' (#9)", !(await bPage.getByText("Quoted").first().isVisible().catch(() => false)));
    await bCtx.close();
  } catch (e) {
    ok("no unexpected error", false, (e?.message || String(e)).split("\n")[0]);
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
    if (!sharedBrowser) await browser.close();
  }
  console.log(`\n  Pro job view E2E: ${pass}/${pass + fail} passed`);
  if (fails.length) console.log("  Failures:\n   - " + fails.join("\n   - "));
  return { name: "pro-job-view", pass, fail, fails, passed: pass, total: pass + fail };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

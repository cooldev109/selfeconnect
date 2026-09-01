// In-app "Message" from a professional's profile (M2). A customer messages a
// pro directly from their profile; it starts an on-platform conversation
// (private to that pro, off the public board) that the pro sees in My jobs.
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
  console.log("\n── In-app Message from a profile ──");
  const drivers = [], customers = [];
  try {
    const pro = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(pro.email);
    sql(`update "Driver" set "isActive"=true, "stripeOnboarded"=true, phone='+447700900123' where id='${pro.id}'`);
    const cust = await signupCustomer();
    customers.push(cust.email);

    const ctx = await browser.newContext({ viewport: { width: 1000, height: 1000 } });
    await ctx.addCookies([{ name: "sc_customer", value: cookieVal(cust.cookie, "sc_customer"), domain: "localhost", path: "/" }]);
    const p = await ctx.newPage(); p.setDefaultTimeout(30000);

    await p.goto(`${BASE}/customer/pros/${pro.publicId}`, { waitUntil: "networkidle" });
    await p.getByRole("button", { name: /^Message$/ }).waitFor({ state: "visible" });
    ok("profile shows an in-app Message button", true);
    await p.getByRole("button", { name: /^Message$/ }).click();
    await p.getByText(/Start a conversation right here/).waitFor({ state: "visible" });
    ok("Message opens a compose box (not an SMS/copy action)", true);
    await p.locator("textarea").fill("Hi, are you free next Tuesday to move a sofa?");
    await p.getByRole("button", { name: /Send message/ }).click();
    await p.waitForURL(/\/customer\/jobs\//, { timeout: 10000 });
    ok("sending opens the in-app conversation", /\/customer\/jobs\//.test(p.url()), p.url());
    await p.waitForTimeout(600);
    ok("the message is shown in the conversation", await p.getByText(/free next Tuesday/).first().isVisible().catch(() => false));
    await ctx.close();

    // The pro sees it in My jobs, and it's NOT on the public board.
    const mine = await req("/pro/jobs/mine", { cookie: pro.cookie });
    const enquiry = (mine.body || []).find((j) => /Enquiry/.test(j.title || ""));
    ok("the enquiry reaches the pro's My jobs", !!enquiry);
    const board = await req("/pro/jobs?radius=100", { cookie: pro.cookie });
    ok("the enquiry stays off the public job board", !(board.body || []).some((j) => enquiry && j.id === enquiry.id));
    if (enquiry) {
      const msgs = await req(`/pro/jobs/${enquiry.id}/messages`, { cookie: pro.cookie });
      ok("the pro can read the customer's message", (msgs.body || []).some((m) => /free next Tuesday/.test(m.body || "")));
    }
  } catch (e) {
    ok("no unexpected error", false, (e?.message || String(e)).split("\n")[0]);
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
    if (!sharedBrowser) await browser.close();
  }
  console.log(`\n  Profile in-app message E2E: ${pass}/${pass + fail} passed`);
  if (fails.length) console.log("  Failures:\n   - " + fails.join("\n   - "));
  return { name: "profile-message", pass, fail, fails, passed: pass, total: pass + fail };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

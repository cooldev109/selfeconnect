// Messages inbox (M2). Every conversation for a user in one place. A pro and a
// customer exchange messages on a job; each sees the thread in their inbox and
// can reply from there.
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
  console.log("\n── Messages inbox ──");
  const drivers = [], customers = [];
  try {
    const cust = await signupCustomer();
    customers.push(cust.email);
    const pro = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(pro.email);
    sql(`update "Driver" set "isActive"=true where id='${pro.id}'`);
    const job = await req("/jobs", { method: "POST", cookie: cust.cookie, body: { categorySlug: "plumber", title: "Inbox leaking tap", description: "The kitchen mixer tap drips constantly and needs a new washer.", postcode: "RG1 8EQ", contactConsent: true } });
    // The pro quotes (engages) and opens the conversation.
    await req(`/pro/jobs/${job.body.id}/quote`, { method: "POST", cookie: pro.cookie, body: { amount: 9000, message: "Happy to help." } });
    await req(`/pro/jobs/${job.body.id}/messages`, { method: "POST", cookie: pro.cookie, body: { body: "Hi! I can come Thursday morning." } });

    // --- PRO inbox: sees the thread and replies ---
    const pc = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    await pc.addCookies([{ name: "tv_session", value: cookieVal(pro.cookie, "tv_session"), domain: "localhost", path: "/" }]);
    const pp = await pc.newPage(); pp.setDefaultTimeout(30000);
    await pp.goto(`${BASE}/messages`, { waitUntil: "networkidle" });
    await pp.getByText("Conversations").first().waitFor({ state: "visible" });
    ok("pro inbox lists the conversation", await pp.getByText("Inbox leaking tap").first().isVisible());
    await pp.getByText("Inbox leaking tap").first().click();
    ok("pro sees the sent message in the thread", await pp.getByText("Hi! I can come Thursday morning.").first().isVisible());
    ok("pro thread has a 'View job' button", await pp.getByRole("link", { name: /View job/ }).isVisible());
    await pp.getByPlaceholder(/Message the customer/).fill("Great, see you then.");
    await pp.getByPlaceholder(/Message the customer/).press("Enter");
    await pp.getByText("Great, see you then.").first().waitFor({ state: "visible" });
    ok("pro can send from the inbox", true);
    await pc.close();

    // --- CUSTOMER inbox: sees both messages and replies ---
    const cc = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    await cc.addCookies([{ name: "sc_customer", value: cookieVal(cust.cookie, "sc_customer"), domain: "localhost", path: "/" }]);
    const cp = await cc.newPage(); cp.setDefaultTimeout(30000);
    await cp.goto(`${BASE}/customer/messages`, { waitUntil: "networkidle" });
    await cp.getByText("Conversations").first().waitFor({ state: "visible" });
    ok("customer inbox lists the conversation", await cp.getByText("Inbox leaking tap").first().isVisible());
    await cp.getByText("Inbox leaking tap").first().click();
    ok("customer sees the pro's messages", await cp.getByText("Great, see you then.").first().isVisible());
    ok("customer thread has a 'View profile' button", await cp.getByRole("link", { name: /View profile/ }).isVisible());
    await cp.getByPlaceholder(/Message the professional/).fill("Perfect, thank you!");
    await cp.getByPlaceholder(/Message the professional/).press("Enter");
    await cp.getByText("Perfect, thank you!").first().waitFor({ state: "visible" });
    ok("customer can reply from the inbox", true);
    await cc.close();

    // The reply reached the pro's thread server-side.
    const proMsgs = await req(`/pro/jobs/${job.body.id}/messages`, { cookie: pro.cookie });
    ok("the customer's reply is in the DB thread", (proMsgs.body || []).some((m) => /Perfect, thank you/.test(m.body || "")));
  } catch (e) {
    ok("no unexpected error", false, (e?.message || String(e)).split("\n")[0]);
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
    if (!sharedBrowser) await browser.close();
  }
  console.log(`\n  Messages inbox E2E: ${pass}/${pass + fail} passed`);
  if (fails.length) console.log("  Failures:\n   - " + fails.join("\n   - "));
  return { name: "messages-inbox", pass, fail, fails, passed: pass, total: pass + fail };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

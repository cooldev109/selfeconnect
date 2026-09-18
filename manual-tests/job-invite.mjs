// Invite professionals to a job (customer-initiated outreach) — browser flow.
// On a job with nobody in touch, the customer sees an "Invite professionals"
// prompt, picks a skilled pro, sends a first message, and the conversation
// opens right there — the pro is now engaged on the job.
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
  console.log("\n── Invite professionals to a job ──");
  const drivers = [], customers = [];
  try {
    const cust = await signupCustomer();
    customers.push(cust.email);
    const job = await req("/jobs", { method: "POST", cookie: cust.cookie, body: { categorySlug: "plumber", title: "Invite boiler job", description: "The boiler needs a service and a small repair to the pressure valve.", postcode: "RG1 8EQ", contactConsent: true } });
    const jobId = job.body.id;

    // A skilled candidate with a unique company name (to target its row).
    const CO = `InviteCo ${Date.now()}`;
    const candidate = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(candidate.email);
    sql(`update "Driver" set "isActive"=true, company='${CO}' where id='${candidate.id}';`);

    const ctx = await browser.newContext({ viewport: { width: 1000, height: 1100 } });
    await ctx.addCookies([{ name: "sc_customer", value: cookieVal(cust.cookie, "sc_customer"), domain: "localhost", path: "/" }]);
    const p = await ctx.newPage();
    p.setDefaultTimeout(30000);

    await p.goto(`${BASE}/customer/jobs/${jobId}`, { waitUntil: "networkidle" });
    await p.getByText("Invite boiler job").first().waitFor({ state: "visible" });

    // With nobody in touch, the page nudges the customer to invite pros.
    ok("shows the 'No professionals in touch yet' prompt", await p.getByText(/No professionals in touch yet/i).isVisible());

    // Open the invite panel (the prompt's button).
    await p.getByRole("button", { name: /Invite professionals/i }).first().click();
    const card = p.locator("div.rounded-lg.border", { hasText: CO }).first();
    await card.waitFor({ state: "visible" });
    ok("the candidate pro is listed in the invite panel", await card.isVisible());

    // Compose to the candidate — the message is prefilled.
    await card.getByRole("button", { name: /Message/ }).click();
    const box = p.locator("textarea");
    await box.first().waitFor({ state: "visible" });
    const prefill = await p.evaluate(() =>
      [...document.querySelectorAll("textarea")].some((el) => /are you available/i.test(el.value)),
    );
    ok("the invite message is prefilled", prefill);

    // Send the invite.
    await card.getByRole("button", { name: /Send invite/i }).click();

    // The conversation opens in the Messages section with the sent message.
    await p.getByText(/Invite boiler job/).first().waitFor({ state: "visible" });
    await p.getByPlaceholder(/Message the professional/).waitFor({ state: "visible", timeout: 10000 });
    ok("the conversation opens after inviting", await p.getByPlaceholder(/Message the professional/).isVisible());
    await p.getByText(/are you available/i).first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    ok("the invite message shows in the thread", await p.getByText(/are you available/i).first().isVisible().catch(() => false));

    // Server-side: the pro is now engaged, and the customer's thread lists them.
    const threads = await req(`/jobs/${jobId}/threads`, { cookie: cust.cookie });
    ok("the invited pro now has a thread on the job", (threads.body ?? []).some((t) => t.publicId === candidate.publicId), JSON.stringify((threads.body ?? []).map((t) => t.publicId)));
    const proMsgs = await req(`/pro/jobs/${jobId}/messages`, { cookie: candidate.cookie });
    ok("the invited pro can read the customer's message", proMsgs.ok && (proMsgs.body ?? []).some((m) => m.fromCustomer), `HTTP ${proMsgs.status}`);

    await ctx.close();
  } catch (e) {
    ok("no unexpected error", false, (e?.message || String(e)).split("\n")[0]);
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
    if (!sharedBrowser) await browser.close();
  }
  console.log(`\n  Invite professionals E2E: ${pass}/${pass + fail} passed`);
  if (fails.length) console.log("  Failures:\n   - " + fails.join("\n   - "));
  return { name: "job-invite", pass, fail, fails, passed: pass, total: pass + fail };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

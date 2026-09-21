// In-job chat (M2.2) — browser. A pro and a customer exchange messages about a
// job from their Messages inboxes in two separate sessions; polling delivers
// each side's message to the other without a manual refresh.
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";

const WEB = process.env.BASE_URL || process.env.WEB_URL || "http://localhost:3200";
const API = process.env.API_URL || "http://localhost:4100/api/v1";
const DB = process.env.DATABASE_URL || "postgresql://tips:tips_local_dev@localhost:5432/selfeconnect_dev";
const sql = (q) => execFileSync("psql", [DB, "-tAc", q], { encoding: "utf8" }).trim();
const PASS = "TestPass123!";

async function api(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await res.text();
  return { ok: res.ok, body: t ? JSON.parse(t) : null, cookie: (res.headers.get("set-cookie") ?? "").split(";")[0] };
}
async function login(page, path, email, apiPath) {
  await page.goto(`${WEB}${path}`, { waitUntil: "networkidle" });
  await page.reload({ waitUntil: "networkidle" });
  await page.fill('input[placeholder="you@example.com"]', email);
  await page.fill('input[placeholder="Your password"]', PASS);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes(apiPath) && r.request().method() === "POST"),
    page.getByRole("button", { name: /^Log in/i }).click(),
  ]);
}

export async function run(sharedBrowser) {
  const browser = sharedBrowser || (await chromium.launch());
  let pass = 0, fail = 0;
  const fails = [];
  const ok = (l, c, d = "") => {
    if (c) { pass++; console.log(`  \x1b[32m✓\x1b[0m ${l}`); }
    else { fail++; fails.push(l + (d ? ` — ${d}` : "")); console.log(`  \x1b[31m✗\x1b[0m ${l}${d ? ` — ${d}` : ""}`); }
  };
  console.log("\n── In-job chat via the inbox ──");
  const S = Date.now();
  const CUST = `chat_cust_${S}@example.com`;
  const PRO = `chat_pro_${S}@example.com`;
  const TITLE = `Chatty tap ${S}`;
  let proCtx, custCtx;

  try {
    // Seed: customer + job; active pro who quotes (→ engaged).
    const cust = await api("/customer/auth/signup", { method: "POST", body: { name: "Chat Cust", email: CUST, password: PASS } });
    const job = await api("/jobs", { method: "POST", cookie: cust.cookie, body: { categorySlug: "plumber", title: TITLE, description: "The mixer tap drips constantly and needs replacing.", postcode: "RG1 8EQ", contactConsent: true } });
    const pro = await api("/auth/signup", { method: "POST", body: { name: "Chat Pro", email: PRO, password: PASS, postcode: "RG1 8EQ", categorySlugs: ["plumber"] } });
    ok("seed customer + job + pro", cust.ok && job.ok && pro.ok);
    sql(`update "Driver" set "isActive"=true where email='${PRO}';`);
    await api(`/pro/jobs/${job.body.id}/quote`, { method: "POST", cookie: pro.cookie, body: { amount: 12000, message: "Can do Thursday." } });

    // --- PRO opens the thread from My jobs → inbox and sends the first message ---
    proCtx = await browser.newContext({ viewport: { width: 1000, height: 1100 } });
    const pp = await proCtx.newPage(); pp.setDefaultTimeout(30000);
    await login(pp, "/login", PRO, "/auth/login");
    await pp.waitForURL(/\/(home|jobs|dashboard)/, { timeout: 20000 });
    await pp.goto(`${WEB}/my-jobs`, { waitUntil: "networkidle" });
    await pp.getByText(TITLE).first().waitFor({ state: "visible" });
    // "Message customer" jumps to the Messages inbox with this job's thread open.
    await pp.getByRole("link", { name: /Message customer/i }).first().click();
    await pp.waitForURL(/\/messages\?job=/, { timeout: 10000 });
    await pp.getByPlaceholder("Message the customer…").fill("Hi! I can sort the tap on Thursday.");
    await pp.getByRole("button", { name: /Send message/i }).click();
    await pp.getByText(/sort the tap on Thursday/i).last().waitFor({ state: "visible" });
    ok("pro sends a message from the inbox", true);

    // --- CUSTOMER opens that thread in their inbox, reads it, and replies ---
    custCtx = await browser.newContext({ viewport: { width: 1000, height: 1100 } });
    const cp = await custCtx.newPage(); cp.setDefaultTimeout(30000);
    await login(cp, "/customer/login", CUST, "/customer/auth/login");
    await cp.waitForURL(/\/customer(\/|$)/, { timeout: 20000 });
    await cp.goto(`${WEB}/customer/messages`, { waitUntil: "networkidle" });
    await cp.getByText("Chat Pro").first().waitFor({ state: "visible" });
    ok("customer inbox lists the conversation", true);
    await cp.getByText("Chat Pro").first().click();
    await cp.getByText(/sort the tap on Thursday/i).last().waitFor({ state: "visible" });
    ok("customer reads the pro's message in the inbox", true);
    await cp.getByPlaceholder("Message the professional…").fill("Great — Thursday morning works for me.");
    await cp.getByRole("button", { name: /Send message/i }).click();
    await cp.getByText(/Thursday morning works/i).last().waitFor({ state: "visible" });
    ok("customer sends a reply from the inbox", true);

    // --- Back on the PRO session, polling delivers the reply ---
    await pp.getByText(/Thursday morning works/i).last().waitFor({ state: "visible", timeout: 15000 });
    ok("pro receives the reply via polling (no refresh)", true);

    ok("DB: thread has 2 messages", sql(`select count(*) from "Message" where "jobId"='${job.body.id}';`) === "2");
  } catch (e) {
    ok("no unexpected error", false, (e?.message || String(e)).split("\n")[0]);
  } finally {
    if (proCtx) await proCtx.close();
    if (custCtx) await custCtx.close();
    sql(`delete from "Driver" where email='${PRO}';`);
    sql(`delete from "Customer" where email='${CUST}';`);
    if (!sharedBrowser) await browser.close();
  }
  console.log(`\n  In-job chat E2E: ${pass}/${pass + fail} passed`);
  if (fails.length) console.log("  Failures:\n   - " + fails.join("\n   - "));
  return { name: "job-chat-ui", pass, fail, fails, passed: pass, total: pass + fail };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

// Thorough regression test for ALL of Raul's feedback, run against the LIVE
// site. Every page is checked for actual render (no error boundary, no JS
// errors) plus the specific content/behaviour Raul asked for.
//
//   cd manual-tests && SK=sk_test_... DATABASE_URL=postgresql://... node feedback.mjs
//
// SK + DATABASE_URL are required for the real-card payment + change-password
// + cleanup steps.
import { chromium } from "@playwright/test";
import { BASE, API, reporter, uniqueEmail, writeTestPng, signupDriver, sql } from "./lib.mjs";

const SK = process.env.SK;
const ACC = "V6Q7A"; // an onboarded (accepting) driver for payment/tip-UI tests
const R = reporter();
const png = writeTestPng();
const b = await chromium.launch();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const IGNORE = /older API|payment method types are not activated|Failed to load resource|favicon|net::ERR|status of 4|status of 5/i;
function track(page) {
  const e = [];
  page.on("pageerror", (x) => e.push("JS: " + x.message));
  page.on("console", (m) => { if (m.type() === "error" && !IGNORE.test(m.text())) e.push("console: " + m.text().slice(0, 140)); });
  return e;
}
async function render(page, errs) {
  await page.waitForTimeout(600);
  const body = await page.locator("body").innerText().catch(() => "");
  if (/didn't load|went wrong on our end/i.test(body)) throw new Error("ERROR BOUNDARY shown");
  if (errs.length) throw new Error(errs[0]);
  return body.toLowerCase();
}
const has = (t, ...subs) => subs.every((s) => t.includes(s.toLowerCase()));
const lacks = (t, ...subs) => subs.every((s) => !t.includes(s.toLowerCase()));

// ============ LANDING ============
const ctx = await b.newContext();
const p = await ctx.newPage();
const pe = track(p);

await R.step("[rebrand] SelfeConnect everywhere, no TipVan, £5.49 not £9.99", async () => {
  pe.length = 0; await p.goto(BASE + "/", { waitUntil: "networkidle" });
  const t = await render(p, pe);
  if (!has(t, "selfeconnect")) throw new Error("brand missing");
  if (!lacks(t, "tipvan", "£9.99")) throw new Error("old brand/price present");
  if (!has(t, "£5.49/month")) throw new Error("£5.49 missing");
});
await R.step("[hero copy] new headline + paragraphs", async () => {
  const t = await p.locator("body").innerText().then((x) => x.toLowerCase());
  if (!has(t, "get recognised and rewarded")) throw new Error("headline");
  if (!has(t, "join a community built for self-employed professionals")) throw new Error("para 1");
  if (!has(t, "give your customers a simple way to rate your service")) throw new Error("para 2");
  if (!has(t, "no app. no account. no commission")) throw new Error("para 3");
});
await R.step("[nav] 'Log in' (not 'Professional Log in') + 'Join as a professional'", async () => {
  await p.getByRole("link", { name: /^Log in$/ }).waitFor({ timeout: 5000 });
  await p.getByRole("link", { name: "Join as a professional" }).waitFor({ timeout: 5000 });
  const t = await p.locator("header").first().innerText();
  if (/Professional Log in/i.test(t)) throw new Error("'Professional Log in' still present");
});
await R.step("[footer menu] About / How it works / Contact us", async () => {
  await p.getByRole("link", { name: "About SelfeConnect" }).waitFor({ timeout: 5000 });
  await p.getByRole("link", { name: "Contact us" }).waitFor({ timeout: 5000 });
});
await R.step("[how it works] new step copy + payout wording + professionals image", async () => {
  const t = await p.locator("body").innerText().then((x) => x.toLowerCase());
  if (!has(t, "print the qr code label and hand it to your customer")) throw new Error("step 2 copy");
  if (!has(t, "the money is paid directly into your account")) throw new Error("payout wording");
  if (has(t, "the money lands in your account")) throw new Error("old payout wording present");
  if (!(await p.locator('#how-it-works img[alt*="professionals" i]').count())) throw new Error("new image missing");
});
await R.step("[FAQ] updated commission answer", async () => {
  await p.getByText(/Is there really no commission/i).click();
  await p.getByText(/standard payment processing fees charged by our payment partner/i).waitFor({ timeout: 5000 });
});

// ============ MOBILE NAVBAR ============
await R.step("[mobile navbar] fits at 360px (Join button not cut off)", async () => {
  const mp = await (await b.newContext({ viewport: { width: 360, height: 720 }, isMobile: true })).newPage();
  await mp.goto(BASE + "/", { waitUntil: "networkidle" });
  const box = await mp.getByRole("link", { name: /^Join$/ }).boundingBox();
  if (!box || box.x + box.width > 360) throw new Error("navbar overflows on mobile");
  await mp.close();
});

// ============ LEGAL ============
await R.step("[terms] official 10-section Terms & Conditions, £5.49, 27 June 2026", async () => {
  pe.length = 0; await p.goto(BASE + "/terms", { waitUntil: "networkidle" });
  const t = await render(p, pe);
  if (!has(t, "terms & conditions", "professional accounts & subscriptions", "£5.49 per month", "acceptable use", "intellectual property", "last updated: 27 june 2026")) throw new Error("terms content missing");
});
await R.step("[privacy] official 10-section Privacy Policy, 27 June 2026", async () => {
  pe.length = 0; await p.goto(BASE + "/privacy", { waitUntil: "networkidle" });
  const t = await render(p, pe);
  if (!has(t, "who we are", "information we collect", "cookies & analytics", "data retention", "last updated: 27 june 2026", "support@selfeconnect.com")) throw new Error("privacy content missing");
});
await R.step("[about/contact] render with content", async () => {
  pe.length = 0; await p.goto(BASE + "/about", { waitUntil: "networkidle" });
  if (!has(await render(p, pe), "self-employed professionals")) throw new Error("about");
  pe.length = 0; await p.goto(BASE + "/contact", { waitUntil: "networkidle" });
  if (!has(await render(p, pe), "support@selfeconnect.com")) throw new Error("contact");
});

// ============ LOGIN / SIGNUP ============
await R.step("[login] testimonial removed; 'For professionals, by professionals' kept; forgot=mailto", async () => {
  pe.length = 0; await p.goto(BASE + "/login", { waitUntil: "networkidle" });
  const t = await render(p, pe);
  if (!lacks(t, "marco", "£180", "manchester")) throw new Error("testimonial still present");
  if (!has(t, "for professionals, by professionals")) throw new Error("tagline missing");
  const href = await p.getByText(/Forgot password/i).getAttribute("href");
  if (!/mailto:support@selfeconnect/.test(href || "")) throw new Error("forgot not mailto");
});
await R.step("[signup] 'Join 3,200+' removed; rest kept", async () => {
  pe.length = 0; await p.goto(BASE + "/signup", { waitUntil: "networkidle" });
  const t = await render(p, pe);
  if (!lacks(t, "3,200")) throw new Error("count still present");
  if (!has(t, "set up once. get rated & tipped")) throw new Error("other copy missing");
});

// ============ TIP PAGE (customer) ============
await R.step("[tip page] no EN/PT toggle; heading visible; NO deliveries; presets/stars work", async () => {
  pe.length = 0; await p.goto(`${BASE}/tip/${ACC}`, { waitUntil: "networkidle" });
  const t = await render(p, pe);
  if ((await p.getByRole("button", { name: "PT", exact: true }).count()) || (await p.getByRole("button", { name: "EN", exact: true }).count())) throw new Error("EN/PT toggle still present");
  if (has(t, "deliveries")) throw new Error("'deliveries' counter still present");
  const heading = p.getByRole("heading", { name: /Say thanks to/i });
  await heading.waitFor({ timeout: 6000 });
  if (!(await heading.isVisible())) throw new Error("heading not visible");
  await p.getByText("Generous").click();
  await p.getByRole("button", { name: /Send tip · £5\.00/ }).waitFor({ timeout: 6000 });
  await p.getByRole("button", { name: "5 stars" }).click();
});
await R.step("[payment modal mobile] wallet element mounts + Pay button reachable, no JS errors", async () => {
  const mctx = await b.newContext({ viewport: { width: 390, height: 720 }, isMobile: true });
  const mp = await mctx.newPage(); const me = track(mp);
  await mp.goto(`${BASE}/tip/${ACC}`, { waitUntil: "networkidle" });
  await mp.getByText("Most popular").click();
  await mp.getByRole("button", { name: /Send tip/i }).click();
  const pay = mp.getByRole("button", { name: /Pay · £2\.00/ });
  await pay.waitFor({ timeout: 25000 }); await mp.waitForTimeout(1500);
  const box = await pay.boundingBox();
  if (!box || box.y + box.height > 720) throw new Error("Pay button off-screen on mobile");
  if (me.length) throw new Error("payment modal JS error: " + me[0]);
  await mctx.close();
  // clean any pending tip created
  sql(`DELETE FROM "Tip" t USING "Driver" d WHERE t."driverId"=d.id AND d."publicId"='${ACC}' AND t.status='pending';`);
});

// ============ PROFESSIONAL (authed) ============
const actx = await b.newContext();
const email = uniqueEmail("mt_fb");
const ap = await signupDriver(actx, { email, name: "Feedback Test", photo: png });
const ae = track(ap);
await R.step("[dashboard] renders real content after signup (crash fix)", async () => {
  ae.length = 0; await ap.goto(BASE + "/dashboard", { waitUntil: "networkidle" });
  const t = await render(ap, ae);
  if (!has(t, "you've earned in tips") && !has(t, "finish setup")) throw new Error("dashboard content missing");
});
await R.step("[profile] 'Hand it to customers' pro tip + image; back-to-dashboard + logo link", async () => {
  ae.length = 0; await ap.goto(BASE + "/profile", { waitUntil: "networkidle" });
  const t = await render(ap, ae);
  if (!has(t, "hand it to customers", "where to show your qr")) throw new Error("pro tip copy");
  if (has(t, "eye-level on the van door")) throw new Error("old van copy present");
  await ap.getByRole("link", { name: /Dashboard/i }).first().waitFor({ timeout: 5000 });
});
await R.step("[account] back link + change password works end-to-end", async () => {
  ae.length = 0; await ap.goto(BASE + "/account", { waitUntil: "networkidle" });
  await render(ap, ae);
  await ap.getByRole("link", { name: /Back to dashboard/i }).waitFor({ timeout: 5000 });
  // wrong current -> error
  await ap.locator('input[autocomplete="current-password"]').fill("wrongpass");
  await ap.locator('input[autocomplete="new-password"]').fill("newsecret123");
  await ap.getByRole("button", { name: /Update password/i }).click();
  await ap.getByText(/Current password is incorrect/i).waitFor({ timeout: 8000 });
  // correct -> success, then login with the new password
  await ap.locator('input[autocomplete="current-password"]').fill("supersecret");
  await ap.locator('input[autocomplete="new-password"]').fill("newsecret123");
  await ap.getByRole("button", { name: /Update password/i }).click();
  await ap.getByText(/Password updated/i).waitFor({ timeout: 8000 });
  await ap.evaluate((a) => fetch(a + "/auth/logout", { method: "POST", credentials: "include" }), API);
  await ap.goto(BASE + "/login", { waitUntil: "networkidle" });
  await ap.locator('input[type="email"]').fill(email);
  await ap.locator('input[type="password"]').fill("newsecret123");
  await ap.getByRole("button", { name: /Log in/i }).click();
  await ap.waitForURL(/\/dashboard$/, { timeout: 12000 });
});

// ============ REAL PAYMENT PIPELINE ============
await R.step("[payment] real card 4242 -> succeeded -> webhook -> cleanup", async () => {
  if (!SK) throw new Error("SK env not set");
  const tip = await fetch(`${API}/drivers/${ACC}/tips`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount: 200, rating: 5, customerName: "FB Pipeline" }) }).then((r) => r.json());
  if (tip.mock !== false || !tip.paymentIntentId) throw new Error("create: " + JSON.stringify(tip));
  const auth = "Basic " + Buffer.from(SK + ":").toString("base64");
  const conf = await fetch(`https://api.stripe.com/v1/payment_intents/${tip.paymentIntentId}/confirm`, { method: "POST", headers: { Authorization: auth, "content-type": "application/x-www-form-urlencoded" }, body: "payment_method=pm_card_visa" }).then((r) => r.json());
  if (conf.status !== "succeeded") throw new Error("confirm: " + conf.status);
  let ok = false;
  for (let i = 0; i < 15; i++) { if (sql(`SELECT status FROM "Tip" WHERE "stripePaymentIntentId"='${tip.paymentIntentId}';`) === "succeeded") { ok = true; break; } await sleep(1500); }
  sql(`DELETE FROM "Tip" WHERE "stripePaymentIntentId"='${tip.paymentIntentId}';`);
  if (!ok) throw new Error("webhook did not mark succeeded");
});

await b.close();
sql(`DELETE FROM "Driver" WHERE email LIKE 'mt_fb%';`);
const s = R.summary("RAUL FEEDBACK regression");
process.exit(s.passed === s.total ? 0 : 1);

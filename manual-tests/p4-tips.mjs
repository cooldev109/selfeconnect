// P4 — Tips: an accepting driver can be tipped (success page); a driver that
// hasn't activated/onboarded shows the "not accepting tips" error.
import { BASE, API, reporter, uniqueEmail, writeTestPng, signupDriver } from "./lib.mjs";

async function makeAccepting(ctx, png, email) {
  const page = await signupDriver(ctx, { email, name: "P4 Driver", photo: png });
  await page.goto(BASE + "/account", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Activate subscription/i }).click();
  await page.waitForURL(/\/account$/, { timeout: 20000 });
  await page.getByRole("button", { name: /Connect payouts/i }).click();
  await page.waitForURL(/\/account$/, { timeout: 20000 });
  await page.getByText(/Ready/).first().waitFor({ timeout: 10000 });
  const me = await page.evaluate(
    (a) => fetch(a + "/me", { credentials: "include" }).then((r) => r.json()),
    API,
  );
  return me.id;
}

export async function run(browser) {
  const R = reporter();
  const png = writeTestPng();

  const ctxA = await browser.newContext();
  const idA = await makeAccepting(ctxA, png, uniqueEmail("mt_p4a"));

  const ctxB = await browser.newContext();
  const pB = await signupDriver(ctxB, { email: uniqueEmail("mt_p4b"), name: "P4 NoAccept", photo: png });
  const idB = (await pB.evaluate(
    (a) => fetch(a + "/me", { credentials: "include" }).then((r) => r.json()),
    API,
  )).id;

  await R.step("customer tips an accepting driver -> success page (£5.00)", async () => {
    const cust = await browser.newContext();
    const cp = await cust.newPage();
    await cp.goto(`${BASE}/tip/${idA}`, { waitUntil: "networkidle" });
    await cp.getByText("Generous").click(); // £5 preset
    // Wait for React state to commit (pay bar reflects £5.00) before clicking.
    await cp.getByRole("button", { name: /Send tip · £5\.00/ }).waitFor({ timeout: 8000 });
    await cp.getByRole("button", { name: "5 stars" }).click();
    // Synchronize on the actual POST so we don't race the SPA navigation.
    const [resp] = await Promise.all([
      cp.waitForResponse((r) => r.url().includes(`/drivers/${idA}/tips`), { timeout: 20000 }),
      cp.getByRole("button", { name: /Send tip/i }).click(),
    ]);
    if (resp.status() !== 201) throw new Error("tip POST " + resp.status());
    const payload = await resp.json();
    if (payload.amount !== 500) throw new Error("amount=" + payload.amount);
    await cp.waitForURL(new RegExp(`/tip/${idA}/success$`), { timeout: 20000 });
    // URL changes before React commits the route — wait for the success view.
    await cp.getByRole("heading", { name: /Thank you/i }).waitFor({ timeout: 10000 });
    const body = await cp.locator("body").innerText();
    if (!/£5\.00/.test(body)) {
      throw new Error("success body: " + body.replace(/\s+/g, " ").slice(0, 140));
    }
    await cust.close();
  });

  await R.step("customer tipping a non-accepting driver -> error", async () => {
    const cust = await browser.newContext();
    const cp = await cust.newPage();
    await cp.goto(`${BASE}/tip/${idB}`, { waitUntil: "networkidle" });
    await cp.getByText("Most popular").click(); // £2 preset
    await cp.getByRole("button", { name: /Send tip/i }).click();
    await cp.getByText(/isn't accepting tips/i).waitFor({ timeout: 10000 });
    await cust.close();
  });

  await ctxA.close();
  await ctxB.close();
  return R.summary("P4 tips");
}

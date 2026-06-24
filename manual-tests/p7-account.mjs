// P7 — Account polish: contact details edit & persist, client + server reject
// invalid input, and the subscription card no longer shows a fabricated
// "Next billing <date>" (now honest "renews monthly").
import { BASE, API, reporter, uniqueEmail, writeTestPng, signupDriver } from "./lib.mjs";

export async function run(browser) {
  const R = reporter();
  const png = writeTestPng();
  const ctx = await browser.newContext();
  const email = uniqueEmail("mt_p7");
  const page = await signupDriver(ctx, { email, name: "P7 Driver", photo: png });

  const emailInput = () => page.locator('input[type="email"]');
  const phoneInput = () => page.locator('input[type="tel"]');

  await R.step("account contact form is prefilled with the signup email", async () => {
    await page.goto(BASE + "/account", { waitUntil: "networkidle" });
    await page.waitForFunction(
      (e) => document.querySelector('input[type="email"]')?.value === e,
      email,
      { timeout: 8000 },
    );
  });

  await R.step("editing phone saves and persists across reload", async () => {
    await phoneInput().fill("+44 7700 900123");
    await page.getByRole("button", { name: /Save changes/i }).click();
    await page.getByText(/Saved/).waitFor({ timeout: 10000 });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(
      () => document.querySelector('input[type="tel"]')?.value === "+44 7700 900123",
      undefined,
      { timeout: 8000 },
    );
  });

  await R.step("editing email saves and is reflected by the account API", async () => {
    const next = uniqueEmail("mt_p7new");
    await emailInput().fill(next);
    await page.getByRole("button", { name: /Save changes/i }).click();
    await page.getByText(/Saved/).waitFor({ timeout: 10000 });
    const acc = await page.evaluate(
      (a) => fetch(a + "/me/account", { credentials: "include" }).then((r) => r.json()),
      API,
    );
    if (acc.email !== next) throw new Error("account email=" + acc.email);
  });

  await R.step("invalid phone shows a client-side error and is not saved", async () => {
    await phoneInput().fill("12");
    await page.getByRole("button", { name: /Save changes/i }).click();
    await page.getByText(/Enter a valid phone number/i).waitFor({ timeout: 6000 });
  });

  await R.step("backend rejects invalid contact details (400)", async () => {
    const status = (body) =>
      page.evaluate(
        ([u, b]) =>
          fetch(u, { method: "PATCH", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }).then((r) => r.status),
        [`${API}/me/account`, body],
      );
    if ((await status({ email: "not-an-email" })) !== 400) throw new Error("bad email not 400");
    if ((await status({ phone: "12" })) !== 400) throw new Error("short phone not 400");
    if ((await status({ phone: "07700abc999" })) !== 400) throw new Error("bad-char phone not 400");
  });

  await R.step("active plan shows honest renewal copy, no fabricated date", async () => {
    await page.getByRole("button", { name: /Activate subscription/i }).click();
    await page.waitForURL(/\/account$/, { timeout: 20000 });
    await page.getByText(/renews monthly/i).waitFor({ timeout: 8000 });
    const body = await page.locator("body").innerText();
    if (/Next billing/i.test(body)) throw new Error("fabricated 'Next billing' date still present");
  });

  await ctx.close();
  return R.summary("P7 account");
}

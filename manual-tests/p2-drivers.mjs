// P2 — Driver profile: signup photo persisted, profile edit saves & persists,
// public driver lookup (GET /drivers/:publicId) + tip page hero.
import { BASE, API, reporter, uniqueEmail, writeTestPng, signupDriver } from "./lib.mjs";

export async function run(browser) {
  const R = reporter();
  const png = writeTestPng();
  const ctx = await browser.newContext();
  const email = uniqueEmail("mt_p2");

  const page = await signupDriver(ctx, { email, name: "P2 Driver", photo: png });
  const me = await page.evaluate(
    (a) => fetch(a + "/me", { credentials: "include" }).then((r) => r.json()),
    API,
  );
  const publicId = me.id;

  await R.step("uploaded profile photo is persisted (photoUrl set)", async () => {
    if (!me.photoUrl) throw new Error("photoUrl missing");
  });

  await R.step("profile edit saves and persists across reload", async () => {
    await page.goto(BASE + "/profile", { waitUntil: "networkidle" });
    const company = "Acme " + Date.now();
    const field = page.getByLabel("Company name");
    await field.fill(company);
    await page.getByRole("button", { name: /^Save$/ }).click();
    await page.getByText(/Saved/).waitFor({ timeout: 10000 });
    await page.reload({ waitUntil: "networkidle" });
    const after = await page.getByLabel("Company name").inputValue();
    if (after !== company) throw new Error(`persisted="${after}"`);
  });

  await R.step("public driver lookup returns the public shape", async () => {
    const pub = await page.evaluate(
      (u) => fetch(u).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
      `${API}/drivers/${publicId}`,
    );
    if (pub.id !== publicId || !pub.name) throw new Error("bad public shape");
  });

  await R.step("tip page hero renders the driver's name", async () => {
    const cust = await ctx.browser().newContext();
    const cp = await cust.newPage();
    await cp.goto(`${BASE}/tip/${publicId}`, { waitUntil: "networkidle" });
    await cp.getByRole("heading", { name: me.name }).first().waitFor({ timeout: 10000 });
    await cust.close();
  });

  await ctx.close();
  return R.summary("P2 drivers");
}

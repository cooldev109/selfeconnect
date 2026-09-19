// Dashboard top app bar. On desktop both dashboards carry a sticky header with
// the page context and the global actions: a Messages shortcut, the
// notifications bell, and an account menu (Account + Log out).
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
  console.log("\n── Dashboard top app bar ──");
  const drivers = [], customers = [];
  try {
    // --- Professional side ---
    const pro = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(pro.email);
    sql(`update "Driver" set "isActive"=true where id='${pro.id}';`);

    const pc = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await pc.addCookies([{ name: "tv_session", value: cookieVal(pro.cookie, "tv_session"), domain: "localhost", path: "/" }]);
    const pp = await pc.newPage(); pp.setDefaultTimeout(30000);
    await pp.goto(`${BASE}/home`, { waitUntil: "networkidle" });

    const hdr = pp.locator("header");
    await hdr.waitFor({ state: "visible" });
    ok("desktop app bar shows the page context", await hdr.getByText(/Good (morning|afternoon|evening)/i).first().isVisible());
    ok("app bar has a Messages shortcut", await hdr.getByRole("link", { name: "Messages" }).isVisible());
    ok("app bar has a notifications bell", await hdr.getByRole("button", { name: /Notifications/ }).isVisible());
    const menuBtn = hdr.getByRole("button", { name: /Account menu/ });
    ok("app bar has an account menu", await menuBtn.isVisible());

    await menuBtn.click();
    ok("account menu opens with an Account link", await hdr.getByRole("link", { name: "Account" }).isVisible());
    ok("account menu offers Log out", await hdr.getByRole("button", { name: "Log out" }).isVisible());
    await pp.keyboard.press("Escape").catch(() => {});
    await pp.mouse.click(600, 400); // close the menu (outside click)

    await hdr.getByRole("link", { name: "Messages" }).click();
    await pp.waitForURL(/\/messages$/, { timeout: 10000 }).catch(() => {});
    ok("the Messages shortcut opens the inbox", /\/messages$/.test(pp.url()), pp.url());
    await pc.close();

    // --- Customer side ---
    const cust = await signupCustomer();
    customers.push(cust.email);
    const cc = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await cc.addCookies([{ name: "sc_customer", value: cookieVal(cust.cookie, "sc_customer"), domain: "localhost", path: "/" }]);
    const cp = await cc.newPage(); cp.setDefaultTimeout(30000);
    await cp.goto(`${BASE}/customer`, { waitUntil: "networkidle" });
    const chdr = cp.locator("header");
    await chdr.waitFor({ state: "visible" });
    ok("customer dashboard also has the app bar (bell + account)", (await chdr.getByRole("button", { name: /Notifications/ }).isVisible()) && (await chdr.getByRole("button", { name: /Account menu/ }).isVisible()));
    ok("customer app bar Messages shortcut points at the customer inbox", (await chdr.getByRole("link", { name: "Messages" }).getAttribute("href")) === "/customer/messages");
    await cc.close();
  } catch (e) {
    ok("no unexpected error", false, (e?.message || String(e)).split("\n")[0]);
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
    if (!sharedBrowser) await browser.close();
  }
  console.log(`\n  Top app bar E2E: ${pass}/${pass + fail} passed`);
  if (fails.length) console.log("  Failures:\n   - " + fails.join("\n   - "));
  return { name: "topbar", pass, fail, fails, passed: pass, total: pass + fail };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

// Cross-cutting auth boundaries: every guarded endpoint must reject the wrong
// caller. Professional endpoints reject anonymous + customer sessions; customer
// endpoints reject anonymous + professional sessions; admin rejects non-admins.
import { req, reporter, signupPro, signupCustomer, delDriver, delCustomer } from "./_lib.mjs";

export async function run() {
  const { ok, done } = reporter();
  console.log("\n── Auth boundaries ──");
  const drivers = [], customers = [];
  try {
    const pro = await signupPro();          drivers.push(pro.email);
    const cust = await signupCustomer();    customers.push(cust.email);
    const P = pro.cookie, C = cust.cookie;
    const rejects = (s) => s === 401 || s === 403;

    // Professional-only endpoints (AuthGuard): anon + customer must be rejected.
    const proOnly = [
      ["GET", "/me"],
      ["GET", "/me/account"],
      ["GET", "/me/tips"],
      ["GET", "/me/reviews"],
      ["POST", "/connect/onboard"],
      ["POST", "/subscription/checkout"],
      ["GET", "/pro/jobs"],
    ];
    for (const [method, path] of proOnly) {
      ok(`${path} rejects anonymous`, rejects((await req(path, { method })).status));
      ok(`${path} rejects a customer session`, rejects((await req(path, { method, cookie: C })).status));
      // Sanity: the professional session is accepted (not an auth rejection).
      ok(`${path} accepts the professional`, !rejects((await req(path, { method, cookie: P })).status));
    }

    // Customer-only endpoints (CustomerAuthGuard): anon + professional rejected.
    const custOnly = [
      ["GET", "/customer/auth/me"],
      ["GET", "/jobs/mine"],
      ["POST", "/jobs"],
      ["POST", "/reviews"],
    ];
    for (const [method, path] of custOnly) {
      ok(`${path} rejects anonymous`, rejects((await req(path, { method })).status));
      ok(`${path} rejects a professional session`, rejects((await req(path, { method, cookie: P })).status));
    }

    // Admin endpoints: a normal professional is forbidden, a customer too.
    for (const path of ["/admin/overview", "/admin/drivers", "/admin/transactions"]) {
      ok(`${path} rejects anonymous`, rejects((await req(path)).status));
      ok(`${path} rejects a normal professional`, rejects((await req(path, { cookie: P })).status));
      ok(`${path} rejects a customer`, rejects((await req(path, { cookie: C })).status));
    }

    // A customer session must not be accepted as a professional and vice-versa
    // (the two cookies are distinct — cross-use is meaningless, not privileged).
    ok("customer cookie can't read professional /me", rejects((await req("/me", { cookie: C })).status));
    ok("professional cookie can't read customer /me", rejects((await req("/customer/auth/me", { cookie: P })).status));
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
  }
  return done("auth-boundaries");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => { console.log(`\n${r.pass} passed, ${r.fail} failed`); process.exit(r.fail ? 1 : 0); });
}

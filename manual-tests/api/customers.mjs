// Customer authentication + account.
import { req, reporter, uniqEmail, delCustomer } from "./_lib.mjs";

export async function run() {
  const { ok, done } = reporter();
  console.log("\n── Customer auth ──");
  const created = [];
  try {
    // Signup
    const email = uniqEmail("cust");
    const s = await req("/customer/auth/signup", {
      method: "POST",
      body: { name: "Casey Customer", email, password: "TestPass123!", phone: "+44 7700 900111" },
    });
    created.push(email);
    ok("signup returns 2xx + sets a session cookie", s.ok && !!s.cookie, `HTTP ${s.status}`);
    ok("signup echoes no password hash", !JSON.stringify(s.body ?? {}).toLowerCase().includes("hash"));

    // Duplicate email
    const dup = await req("/customer/auth/signup", {
      method: "POST",
      body: { name: "Dupe", email, password: "TestPass123!", phone: "+44 7700 900112" },
    });
    ok("duplicate email is rejected (409)", dup.status === 409, `HTTP ${dup.status}`);

    // Validation: bad phone, short password, bad email
    const badPhone = await req("/customer/auth/signup", {
      method: "POST",
      body: { name: "X", email: uniqEmail("cust"), password: "TestPass123!", phone: "abc" },
    });
    ok("invalid phone rejected (400)", badPhone.status === 400, `HTTP ${badPhone.status}`);
    const shortPw = await req("/customer/auth/signup", {
      method: "POST",
      body: { name: "X", email: uniqEmail("cust"), password: "short", phone: "+44 7700 900000" },
    });
    ok("short password rejected (400)", shortPw.status === 400, `HTTP ${shortPw.status}`);

    // /me requires the customer session
    const anonMe = await req("/customer/auth/me");
    ok("GET /customer/auth/me needs a session (401)", anonMe.status === 401, `HTTP ${anonMe.status}`);
    const me = await req("/customer/auth/me", { cookie: s.cookie });
    ok("GET /customer/auth/me returns the signed-in customer", me.ok && me.body?.customer?.email === email, JSON.stringify(me.body));

    // Login: wrong password, then right
    const wrong = await req("/customer/auth/login", { method: "POST", body: { email, password: "nope" } });
    ok("login with wrong password rejected (401)", wrong.status === 401, `HTTP ${wrong.status}`);
    const login = await req("/customer/auth/login", { method: "POST", body: { email, password: "TestPass123!" } });
    ok("login with correct password returns a session", login.ok && !!login.cookie, `HTTP ${login.status}`);

    // Patch profile
    const patch = await req("/customer/auth/me", { method: "PATCH", cookie: login.cookie, body: { name: "Casey Renamed", phone: "+44 7700 900999" } });
    ok("PATCH /customer/auth/me updates the profile", patch.ok, `HTTP ${patch.status}`);
    const after = await req("/customer/auth/me", { cookie: login.cookie });
    ok("profile change persisted", after.body?.customer?.name === "Casey Renamed", JSON.stringify(after.body));

    // Change password (currentPassword + newPassword), then old password fails
    const chpw = await req("/customer/auth/me", { method: "PATCH", cookie: login.cookie, body: { currentPassword: "TestPass123!", newPassword: "NewPass456!" } });
    ok("password change accepted", chpw.ok, `HTTP ${chpw.status} ${JSON.stringify(chpw.body)}`);
    const oldPw = await req("/customer/auth/login", { method: "POST", body: { email, password: "TestPass123!" } });
    ok("old password no longer works after change", oldPw.status === 401, `HTTP ${oldPw.status}`);
    const newPw = await req("/customer/auth/login", { method: "POST", body: { email, password: "NewPass456!" } });
    ok("new password works", newPw.ok, `HTTP ${newPw.status}`);

    // Logout clears the session
    const lo = await req("/customer/auth/logout", { method: "POST", cookie: newPw.cookie });
    ok("logout returns 2xx", lo.ok, `HTTP ${lo.status}`);
  } finally {
    for (const e of created) delCustomer(e);
  }
  return done("customers");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => { console.log(`\n${r.pass} passed, ${r.fail} failed`); process.exit(r.fail ? 1 : 0); });
}

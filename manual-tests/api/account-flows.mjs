// Transactional account flows: forgot/reset password, email verification, and
// one-click unsubscribe. Happy paths use the token the mock mailer logs.
import { req, sql, reporter, signupPro, delDriver, lastMailLinkFor, apiLogLineCount } from "./_lib.mjs";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function run() {
  const { ok, done } = reporter();
  console.log("\n── Account flows (email) ──");
  const drivers = [];
  try {
    // Signup fires a verification email; capture the token from the log.
    const before = apiLogLineCount();
    const pro = await signupPro();
    drivers.push(pro.email);
    await wait(400); // let the fire-and-forget mail log flush
    const verifyToken = lastMailLinkFor("verify-email", before);
    ok("a verification email is issued on signup", !!verifyToken, "no verify link logged");

    if (verifyToken) {
      const bad = await req("/auth/verify-email", { method: "POST", body: { token: "not-a-real-token" } });
      ok("verify-email rejects a bogus token (400)", bad.status === 400, `HTTP ${bad.status}`);
      const v = await req("/auth/verify-email", { method: "POST", body: { token: verifyToken } });
      ok("verify-email accepts the real token (2xx)", v.ok, `HTTP ${v.status} ${JSON.stringify(v.body)}`);
      const verified = sql(`select "emailVerifiedAt" is not null from "Driver" where id='${pro.id}';`);
      ok("account is now marked email-verified", verified === "t", `emailVerifiedAt set = ${verified}`);
      const replay = await req("/auth/verify-email", { method: "POST", body: { token: verifyToken } });
      ok("a used verify token cannot be replayed (400)", replay.status === 400, `HTTP ${replay.status}`);
    }

    // Forgot password — always returns ok (no account disclosure).
    const unknown = await req("/auth/forgot-password", { method: "POST", body: { email: "definitely-not-here@example.com", kind: "professional" } });
    ok("forgot-password never discloses whether an account exists (2xx)", unknown.ok, `HTTP ${unknown.status}`);

    const beforeReset = apiLogLineCount();
    const fp = await req("/auth/forgot-password", { method: "POST", body: { email: pro.email, kind: "professional" } });
    ok("forgot-password for a real account returns ok", fp.ok, `HTTP ${fp.status}`);
    await wait(400);
    const resetToken = lastMailLinkFor("reset-password", beforeReset);
    ok("a reset email is issued for the real account", !!resetToken, "no reset link logged");

    if (resetToken) {
      const badReset = await req("/auth/reset-password", { method: "POST", body: { token: "nope", password: "NewSecret123!" } });
      ok("reset-password rejects a bogus token (400)", badReset.status === 400, `HTTP ${badReset.status}`);
      const r = await req("/auth/reset-password", { method: "POST", body: { token: resetToken, password: "NewSecret123!" } });
      ok("reset-password accepts the real token (2xx)", r.ok, `HTTP ${r.status} ${JSON.stringify(r.body)}`);
      const oldLogin = await req("/auth/login", { method: "POST", body: { email: pro.email, password: "TestPass123!" } });
      ok("old password no longer works after reset", oldLogin.status === 401, `HTTP ${oldLogin.status}`);
      const newLogin = await req("/auth/login", { method: "POST", body: { email: pro.email, password: "NewSecret123!" } });
      ok("new password works after reset", newLogin.ok, `HTTP ${newLogin.status}`);
      const replayReset = await req("/auth/reset-password", { method: "POST", body: { token: resetToken, password: "Another123!" } });
      ok("a used reset token cannot be replayed (400)", replayReset.status === 400, `HTTP ${replayReset.status}`);
    }

    // One-click unsubscribe using the stable token stored at signup.
    const unsubToken = sql(`select "unsubscribeToken" from "Driver" where id='${pro.id}';`);
    ok("signup issued an unsubscribe token", !!unsubToken && unsubToken !== "", unsubToken);
    const badUnsub = await req("/unsubscribe", { method: "POST", body: { token: "not-real" } });
    ok("unsubscribe rejects a bogus token (400)", badUnsub.status === 400, `HTTP ${badUnsub.status}`);
    const unsub = await req("/unsubscribe", { method: "POST", body: { token: unsubToken } });
    ok("unsubscribe with the real token succeeds (2xx)", unsub.ok, `HTTP ${unsub.status} ${JSON.stringify(unsub.body)}`);
    const notify = sql(`select "notifyNewJobs" from "Driver" where id='${pro.id}';`);
    ok("unsubscribe turns off new-job notifications", notify === "f", `notifyNewJobs = ${notify}`);
  } finally {
    for (const e of drivers) delDriver(e);
  }
  return done("account-flows");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => { console.log(`\n${r.pass} passed, ${r.fail} failed`); process.exit(r.fail ? 1 : 0); });
}

// Professional payout access: the Stripe-dashboard login link endpoint that
// backs the "View earnings & payouts" button.
import { req, sql, reporter, signupPro, delDriver } from "./_lib.mjs";

export async function run() {
  const { ok, done } = reporter();
  console.log("\n── Payouts (Stripe dashboard link) ──");
  const drivers = [];
  try {
    const pro = await signupPro();
    drivers.push(pro.email);

    ok("dashboard link needs a session (401)", (await req("/connect/dashboard", { method: "POST" })).status === 401);

    // Before a Connect account exists, there's nothing to link to.
    const noAcct = await req("/connect/dashboard", { method: "POST", cookie: pro.cookie });
    ok("no Connect account → 404 no_connect_account", noAcct.status === 404, `HTTP ${noAcct.status} ${JSON.stringify(noAcct.body)}`);

    // Once onboarded, it returns a one-time Stripe dashboard URL.
    sql(`update "Driver" set "stripeAccountId"='acct_mock', "stripeOnboarded"=true where id='${pro.id}';`);
    const link = await req("/connect/dashboard", { method: "POST", cookie: pro.cookie });
    ok("onboarded → returns a Stripe dashboard url", link.ok && typeof link.body?.url === "string" && /stripe/.test(link.body.url), `HTTP ${link.status} ${JSON.stringify(link.body)}`);

    // A customer session can't reach it.
    const custReject = await req("/connect/dashboard", { method: "POST", cookie: "sc_customer=bogus" });
    ok("a non-professional session is rejected", custReject.status === 401 || custReject.status === 403, `HTTP ${custReject.status}`);
  } finally {
    for (const e of drivers) delDriver(e);
  }
  return done("payouts");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => { console.log(`\n${r.pass} passed, ${r.fail} failed`); process.exit(r.fail ? 1 : 0); });
}

// Ruan feedback #17: admin-granted complimentary (free launch) access with an
// expiry. An admin grants N months; the pro is active + sees the expiry; when
// it lapses they drop back to inactive and must subscribe.
import {
  req,
  sql,
  reporter,
  signupPro,
  makeAdmin,
  delDriver,
} from "./_lib.mjs";

export async function run() {
  const { ok, done } = reporter();
  console.log("\n── Complimentary access (M3.17) ──");
  const drivers = [];
  try {
    const admin = await makeAdmin();
    drivers.push(admin.email);
    const pro = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(pro.email);

    // A fresh pro is inactive.
    const acc0 = await req("/me/account", { cookie: pro.cookie });
    ok("new pro starts inactive, not complimentary", acc0.body?.isActive === false && acc0.body?.complimentary === false);

    // Non-admin can't grant.
    const forb = await req(`/admin/subscriptions/${pro.publicId}/complimentary`, { method: "POST", cookie: pro.cookie, body: { months: 6 } });
    ok("non-admin can't grant complimentary access (403)", forb.status === 403, `HTTP ${forb.status}`);

    // Admin grants 6 months.
    const grant = await req(`/admin/subscriptions/${pro.publicId}/complimentary`, { method: "POST", cookie: admin.cookie, body: { months: 6 } });
    ok("admin grants 6 months complimentary", grant.ok && !!grant.body?.complimentaryUntil, `HTTP ${grant.status} ${JSON.stringify(grant.body)}`);

    // The pro is now active + sees the complimentary status + expiry.
    const acc1 = await req("/me/account", { cookie: pro.cookie });
    ok("pro is now active", acc1.body?.isActive === true);
    ok("pro sees complimentary + expiry date", acc1.body?.complimentary === true && !!acc1.body?.complimentaryUntil, JSON.stringify({ c: acc1.body?.complimentary, u: acc1.body?.complimentaryUntil }));
    // ~6 months out.
    const months = (new Date(acc1.body.complimentaryUntil).getTime() - Date.now()) / (30 * 24 * 3600 * 1000);
    ok("expiry is roughly 6 months out", months > 5 && months < 7, `~${months.toFixed(1)} months`);

    // Admin subscriptions list flags it.
    const list = await req("/admin/subscriptions", { cookie: admin.cookie });
    const row = (list.body ?? []).find((s) => s.id === pro.publicId);
    ok("admin subscriptions list shows complimentary + date", row?.complimentary === true && !!row?.complimentaryUntil, JSON.stringify(row));

    // Force expiry in the past → next account read flips them back to inactive.
    sql(`update "Driver" set "complimentaryUntil"='2000-01-01' where "publicId"='${pro.publicId}';`);
    const acc2 = await req("/me/account", { cookie: pro.cookie });
    ok("lapsed complimentary access drops the pro to inactive", acc2.body?.isActive === false);
    ok("expired comp no longer reads complimentary", acc2.body?.complimentary === false);

    // Re-grant, then revoke with months=0.
    await req(`/admin/subscriptions/${pro.publicId}/complimentary`, { method: "POST", cookie: admin.cookie, body: { months: 3 } });
    const revoke = await req(`/admin/subscriptions/${pro.publicId}/complimentary`, { method: "POST", cookie: admin.cookie, body: { months: 0 } });
    ok("admin revokes complimentary (months=0)", revoke.ok && revoke.body?.complimentaryUntil === null, JSON.stringify(revoke.body));
    ok("revoked pro is inactive with no comp date", sql(`select "isActive"::text||'|'||coalesce("complimentaryUntil"::text,'null') from "Driver" where "publicId"='${pro.publicId}';`) === "false|null");
  } finally {
    for (const e of drivers) delDriver(e);
  }
  return done("complimentary");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

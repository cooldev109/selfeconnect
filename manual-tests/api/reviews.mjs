// Reviews: anonymous (QR) reviews with per-IP rate limiting, verified reviews
// from signed-in customers, self-review protection, and the pro's own list.
import { req, sql, reporter, signupPro, signupCustomer, delDriver, delCustomer } from "./_lib.mjs";

const ipHdr = (ip) => ({ "x-real-ip": ip });

export async function run() {
  const { ok, done } = reporter();
  console.log("\n── Reviews ──");
  const drivers = [], customers = [];
  try {
    const pro = await signupPro();
    drivers.push(pro.email);
    const pid = pro.publicId;

    // Anonymous review (QR): no account, no payment.
    const a1 = await req(`/drivers/${pid}/reviews`, { method: "POST", headers: ipHdr("203.0.113.1"), body: { rating: 5, comment: "Brilliant, fast work", authorName: "Passer-by" } });
    ok("anonymous review accepted (2xx)", a1.ok && a1.body?.ok, `HTTP ${a1.status} ${JSON.stringify(a1.body)}`);

    // Same IP + same driver within the window → rate limited.
    const a2 = await req(`/drivers/${pid}/reviews`, { method: "POST", headers: ipHdr("203.0.113.1"), body: { rating: 4 } });
    ok("second review from same IP is rate-limited (429)", a2.status === 429, `HTTP ${a2.status} ${JSON.stringify(a2.body)}`);

    // Different IP → allowed.
    const a3 = await req(`/drivers/${pid}/reviews`, { method: "POST", headers: ipHdr("203.0.113.2"), body: { rating: 5 } });
    ok("a different IP may still review (2xx)", a3.ok, `HTTP ${a3.status}`);

    // Invalid rating rejected.
    const bad = await req(`/drivers/${pid}/reviews`, { method: "POST", headers: ipHdr("203.0.113.3"), body: { rating: 6 } });
    ok("rating out of range rejected (400)", bad.status === 400, `HTTP ${bad.status}`);

    // Unknown professional → 404.
    const missing = await req(`/drivers/ZZZZZ/reviews`, { method: "POST", headers: ipHdr("203.0.113.4"), body: { rating: 5 } });
    ok("review for unknown pro returns 404", missing.status === 404, `HTTP ${missing.status}`);

    // A signed-in professional cannot review themselves.
    const self = await req(`/drivers/${pid}/reviews`, { method: "POST", cookie: pro.cookie, headers: ipHdr("203.0.113.5"), body: { rating: 5 } });
    ok("pro cannot review themselves (403)", self.status === 403, `HTTP ${self.status} ${JSON.stringify(self.body)}`);

    // A verified review from a signed-in customer (POST /reviews).
    const cust = await signupCustomer();
    customers.push(cust.email);
    const v = await req(`/reviews`, { method: "POST", cookie: cust.cookie, body: { driverPublicId: pid, rating: 5, comment: "Hired through the site — spotless" } });
    ok("customer verified review accepted (2xx)", v.ok, `HTTP ${v.status} ${JSON.stringify(v.body)}`);
    const isVerified = sql(`select "customerId" is not null from "Review" where id='${v.body?.id}';`);
    ok("verified review is linked to the customer account", isVerified === "t", `customerId set = ${isVerified}`);

    // Posting a review needs a customer session.
    const anonVerified = await req(`/reviews`, { method: "POST", body: { driverPublicId: pid, rating: 5 } });
    ok("verified-review endpoint needs a customer session (401)", anonVerified.status === 401, `HTTP ${anonVerified.status}`);

    // The pro sees their reviews; anonymous cannot.
    const anonList = await req(`/me/reviews`);
    ok("GET /me/reviews needs the pro session (401)", anonList.status === 401, `HTTP ${anonList.status}`);
    const list = await req(`/me/reviews`, { cookie: pro.cookie });
    ok("pro's review list loads (2xx)", list.ok, `HTTP ${list.status}`);
    const listStr = JSON.stringify(list.body ?? {});
    ok("list contains the reviews just left", (listStr.match(/"rating"/g) ?? []).length >= 2, listStr.slice(0, 160));
    ok("list distinguishes verified reviews", /"verified"\s*:\s*true/.test(listStr), listStr.slice(0, 200));
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
  }
  return done("reviews");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => { console.log(`\n${r.pass} passed, ${r.fail} failed`); process.exit(r.fail ? 1 : 0); });
}

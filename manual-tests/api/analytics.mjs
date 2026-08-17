// Analytics + per-user history (M3.4). The admin analytics aggregate (funnel,
// conversions, MRR, churn, response time, signup trend) and the per-user
// timelines for a professional and a customer. Admin-only.
import {
  req,
  sql,
  reporter,
  signupPro,
  signupCustomer,
  makeAdmin,
  delDriver,
  delCustomer,
} from "./_lib.mjs";

export async function run() {
  const { ok, done } = reporter();
  console.log("\n── Analytics + history (M3.4) ──");
  const drivers = [], customers = [];
  try {
    const admin = await makeAdmin();
    drivers.push(admin.email);
    const pro = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(pro.email);
    sql(`update "Driver" set "isActive"=true, "foundingMember"=true where id='${pro.id}';`);
    const cust = await signupCustomer();
    customers.push(cust.email);

    // Seed a job + a quote so the funnel/response metrics + timelines have data.
    const job = await req("/jobs", { method: "POST", cookie: cust.cookie, body: { categorySlug: "plumber", title: "Analytics test job", description: "needs a plumber right now please", postcode: "RG1 8EQ", contactConsent: true } });
    ok("seed job created", job.ok && !!job.body?.id, `HTTP ${job.status}`);
    const quote = await req(`/pro/jobs/${job.body.id}/quote`, { method: "POST", cookie: pro.cookie, body: { amount: 5000, message: "I can do this" } });
    ok("seed quote created", quote.ok, `HTTP ${quote.status} ${JSON.stringify(quote.body)}`);

    // --- analytics ---
    const forb = await req("/admin/analytics", { cookie: pro.cookie });
    ok("non-admin can't read analytics (403)", forb.status === 403, `HTTP ${forb.status}`);
    const an = await req("/admin/analytics", { cookie: admin.cookie });
    const b = an.body ?? {};
    ok("analytics returns all metric groups", an.ok && !!b.users && !!b.jobs && !!b.conversions && !!b.revenue && !!b.responseTime && Array.isArray(b.signupTrend), `HTTP ${an.status}`);
    ok("MRR is a number", typeof b.revenue?.mrr === "number");
    ok("at least one paying pro in the MRR base", (b.revenue?.activePros ?? 0) >= 1, String(b.revenue?.activePros));
    ok("quotesPerJob is computed", typeof b.jobs?.quotesPerJob === "number");
    ok("conversions include job→completed %", typeof b.conversions?.jobToCompletedPct === "number");
    ok("signupTrend has 8 weekly buckets", b.signupTrend?.length === 8);

    // --- professional history ---
    const dh = await req(`/admin/drivers/${pro.publicId}/history`, { cookie: admin.cookie });
    ok("driver history returns user + timeline", dh.ok && dh.body?.user?.email === pro.email && Array.isArray(dh.body?.timeline), `HTTP ${dh.status}`);
    ok("driver timeline has signup + quote events", dh.body.timeline.some((e) => e.kind === "signup") && dh.body.timeline.some((e) => e.kind === "quote"));
    ok("driver stats count the quote", dh.body?.stats?.quotes === 1, JSON.stringify(dh.body?.stats));

    // --- customer history ---
    const ch = await req(`/admin/customers/${cust.id}/history`, { cookie: admin.cookie });
    ok("customer history returns user + timeline", ch.ok && ch.body?.user?.email === cust.email && Array.isArray(ch.body?.timeline), `HTTP ${ch.status}`);
    ok("customer timeline includes the posted job", ch.body.timeline.some((e) => e.kind === "job"));

    const forbH = await req(`/admin/drivers/${pro.publicId}/history`, { cookie: cust.cookie });
    ok("non-admin can't read a user's history", forbH.status === 401 || forbH.status === 403, `HTTP ${forbH.status}`);
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
  }
  return done("analytics");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

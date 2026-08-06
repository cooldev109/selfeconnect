// Admin console: overview aggregates, every list, the subscription toggle, and
// the delete operations — plus the guard that keeps non-admins out.
import { req, sql, reporter, signupPro, signupCustomer, makeAdmin, delDriver, delCustomer } from "./_lib.mjs";

const jobBody = (over = {}) => ({
  categorySlug: "plumber", title: "Admin test job",
  description: "A job created to exercise the admin console delete path.",
  postcode: "RG1 8EQ", contactConsent: true, ...over,
});

export async function run() {
  const { ok, done } = reporter();
  console.log("\n── Admin console ──");
  const drivers = [], customers = [];
  try {
    // ── Guard ──
    ok("unauthenticated /admin is rejected (401)", (await req("/admin/overview")).status === 401);
    const pleb = await signupPro();
    drivers.push(pleb.email);
    ok("a non-admin professional is forbidden (403)", (await req("/admin/overview", { cookie: pleb.cookie })).status === 403);

    const admin = await makeAdmin();
    drivers.push(admin.email);
    const A = { cookie: admin.cookie };

    // ── Overview ──
    const ov = await req("/admin/overview", A);
    ok("overview loads for an admin (2xx)", ov.ok, `HTTP ${ov.status}`);
    ok("overview carries the headline aggregates", ["totalDrivers", "activeSubs", "platformRevenue", "totalCustomers", "totalJobs", "totalReviews"].every((k) => k in (ov.body ?? {})), JSON.stringify(ov.body).slice(0, 160));

    // ── Every list loads ──
    for (const path of ["/admin/drivers", "/admin/customers", "/admin/subscriptions", "/admin/jobs", "/admin/reviews", "/admin/transactions"]) {
      const r = await req(path, A);
      ok(`GET ${path} loads (2xx)`, r.ok, `HTTP ${r.status}`);
    }

    // ── Subscription toggle (by publicId) ──
    const subPro = await signupPro();
    drivers.push(subPro.email);
    const on = await req(`/admin/subscriptions/${subPro.publicId}`, { method: "PATCH", cookie: admin.cookie, body: { isActive: true } });
    ok("admin can activate a subscription", on.ok && sql(`select "isActive" from "Driver" where id='${subPro.id}';`) === "t", `HTTP ${on.status}`);
    const off = await req(`/admin/subscriptions/${subPro.publicId}`, { method: "PATCH", cookie: admin.cookie, body: { isActive: false } });
    ok("admin can deactivate a subscription", off.ok && sql(`select "isActive" from "Driver" where id='${subPro.id}';`) === "f", `HTTP ${off.status}`);

    // ── Delete a review ──
    const revPro = await signupPro();
    drivers.push(revPro.email);
    await req(`/drivers/${revPro.publicId}/reviews`, { method: "POST", headers: { "x-real-ip": "198.51.100.9" }, body: { rating: 4, comment: "admin delete target" } });
    const reviewId = sql(`select id from "Review" where "driverId"='${revPro.id}' limit 1;`);
    const delReview = await req(`/admin/reviews/${reviewId}`, { method: "DELETE", cookie: admin.cookie });
    ok("admin can delete a review", delReview.ok && sql(`select count(*) from "Review" where id='${reviewId}';`) === "0", `HTTP ${delReview.status}`);

    // ── Delete a job ──
    const jobCust = await signupCustomer();
    customers.push(jobCust.email);
    const job = await req("/jobs", { method: "POST", cookie: jobCust.cookie, body: jobBody() });
    const jobId = job.body?.id;
    const delJob = await req(`/admin/jobs/${jobId}`, { method: "DELETE", cookie: admin.cookie });
    ok("admin can delete a job", delJob.ok && sql(`select count(*) from "Job" where id='${jobId}';`) === "0", `HTTP ${delJob.status}`);

    // ── Delete a customer ──
    const doomedCust = await signupCustomer();
    const delCust = await req(`/admin/customers/${doomedCust.id}`, { method: "DELETE", cookie: admin.cookie });
    ok("admin can delete a customer", delCust.ok && sql(`select count(*) from "Customer" where id='${doomedCust.id}';`) === "0", `HTTP ${delCust.status}`);
    if (!delCust.ok) customers.push(doomedCust.email);

    // ── Delete a driver ──
    const doomedPro = await signupPro();
    // Driver delete keys on publicId (customers key on id) — matches the real API.
    const delPro = await req(`/admin/drivers/${doomedPro.publicId}`, { method: "DELETE", cookie: admin.cookie });
    ok("admin can delete a driver", delPro.ok && sql(`select count(*) from "Driver" where id='${doomedPro.id}';`) === "0", `HTTP ${delPro.status}`);
    if (!delPro.ok) drivers.push(doomedPro.email);
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
  }
  return done("admin-crud");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => { console.log(`\n${r.pass} passed, ${r.fail} failed`); process.exit(r.fail ? 1 : 0); });
}

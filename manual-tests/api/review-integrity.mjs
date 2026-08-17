// Review integrity (M3.3). Reporting a fake/abusive review, admin soft-takedown
// (hide/unhide) that removes it from the public profile + rating, and the
// "Verified Job Review" signal for reviews tied to a completed on-platform job.
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
  console.log("\n── Review integrity (M3.3) ──");
  const drivers = [], customers = [];
  try {
    const pro = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(pro.email);
    sql(`update "Driver" set "isActive"=true where id='${pro.id}';`);
    const cust = await signupCustomer();
    customers.push(cust.email);

    // A customer leaves a plain (no-job) review.
    const rv = await req("/reviews", { method: "POST", cookie: cust.cookie, body: { driverPublicId: pro.publicId, rating: 2, comment: "meh" } });
    ok("customer creates a review", rv.ok && !!rv.body?.id, `HTTP ${rv.status}`);
    const reviewId = rv.body.id;

    const prof0 = await req(`/pros/${pro.publicId}`, { cookie: cust.cookie });
    const item0 = (prof0.body?.reviews ?? []).find((x) => x.id === reviewId);
    ok("review shows on the public profile with its id", !!item0);
    ok("a plain review is not a Verified Job Review", item0?.verifiedJob === false);

    // The pro reports it.
    const rep = await req(`/me/reviews/${reviewId}/report`, { method: "POST", cookie: pro.cookie, body: { reason: "This is fake, from a competitor" } });
    ok("pro reports the review", rep.ok && rep.body?.ok === true, `HTTP ${rep.status}`);
    ok("reportCount incremented to 1", sql(`select "reportCount" from "Review" where id='${reviewId}';`) === "1");
    const rep2 = await req(`/me/reviews/${reviewId}/report`, { method: "POST", cookie: pro.cookie, body: { reason: "again" } });
    ok("a repeat report is idempotent", rep2.ok && rep2.body?.alreadyReported === true);
    ok("reportCount stays 1 on repeat", sql(`select "reportCount" from "Review" where id='${reviewId}';`) === "1");

    // A different pro can't report a review that isn't on their profile.
    const other = await signupPro();
    drivers.push(other.email);
    const forb = await req(`/me/reviews/${reviewId}/report`, { method: "POST", cookie: other.cookie, body: { reason: "not on my profile" } });
    ok("a pro can't report a review on someone else's profile (403)", forb.status === 403, `HTTP ${forb.status}`);

    // A customer can also report.
    const cust2 = await signupCustomer();
    customers.push(cust2.email);
    const crep = await req(`/reviews/${reviewId}/report`, { method: "POST", cookie: cust2.cookie, body: { reason: "abusive" } });
    ok("a customer can report a review", crep.ok && crep.body?.ok === true, `HTTP ${crep.status}`);
    ok("reportCount now 2", sql(`select "reportCount" from "Review" where id='${reviewId}';`) === "2");

    // Admin moderation.
    const admin = await makeAdmin();
    drivers.push(admin.email);
    const adminRow = (await req("/admin/reviews", { cookie: admin.cookie })).body.find((x) => x.id === reviewId);
    ok("admin list shows reportCount + not-hidden", adminRow?.reportCount === 2 && adminRow?.hidden === false, JSON.stringify(adminRow));

    const hide = await req(`/admin/reviews/${reviewId}/hide`, { method: "POST", cookie: admin.cookie });
    ok("admin hides the review", hide.ok && hide.body?.hidden === true, `HTTP ${hide.status}`);
    const prof1 = await req(`/pros/${pro.publicId}`, { cookie: cust.cookie });
    ok("hidden review is gone from the public profile", !(prof1.body?.reviews ?? []).some((x) => x.id === reviewId));
    ok("hidden review no longer counts toward the rating", (prof1.body?.reviewCount ?? 0) === 0, `count=${prof1.body?.reviewCount}`);

    const unhide = await req(`/admin/reviews/${reviewId}/unhide`, { method: "POST", cookie: admin.cookie });
    ok("admin unhides the review", unhide.ok && unhide.body?.hidden === false, `HTTP ${unhide.status}`);
    const prof2 = await req(`/pros/${pro.publicId}`, { cookie: cust.cookie });
    ok("unhidden review reappears publicly", (prof2.body?.reviews ?? []).some((x) => x.id === reviewId));

    // Verified Job Review: link the review to a completed on-platform job.
    const jobCreate = await req("/jobs", { method: "POST", cookie: cust.cookie, body: { categorySlug: "plumber", title: "Fix tap integrity test", description: "Leaky tap needs fixing now", postcode: "RG1 8EQ", contactConsent: true } });
    ok("customer posts a job", jobCreate.ok && !!jobCreate.body?.id, `HTTP ${jobCreate.status} ${JSON.stringify(jobCreate.body)}`);
    const jobId = jobCreate.body.id;
    sql(`update "Job" set status='completed', "hiredDriverId"='${pro.id}' where id='${jobId}';`);
    const jrv = await req("/reviews", { method: "POST", cookie: cust.cookie, body: { driverPublicId: pro.publicId, rating: 5, comment: "great job", jobId } });
    ok("customer reviews the completed job", jrv.ok, `HTTP ${jrv.status} ${JSON.stringify(jrv.body)}`);
    const prof3 = await req(`/pros/${pro.publicId}`, { cookie: cust.cookie });
    const jitem = (prof3.body?.reviews ?? []).find((x) => x.id === jrv.body.id);
    ok("a review of a completed job is a Verified Job Review", jitem?.verifiedJob === true, JSON.stringify(jitem));
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
  }
  return done("review-integrity");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

// Optional platform payment (M2.5). A customer pays the hired pro for a job
// through the platform (a destination charge, 100% to the pro). In dev the
// Stripe gateway is mocked, so payments settle immediately. Covers gating,
// the paid-on-platform flag, and the verified-paid review badge.
import {
  req,
  sql,
  reporter,
  signupPro,
  signupCustomer,
  delDriver,
  delCustomer,
} from "./_lib.mjs";

const jobBody = (over = {}) => ({
  categorySlug: "plumber",
  title: "Fix a leaking kitchen tap",
  description: "The mixer tap under the kitchen sink drips constantly and needs replacing.",
  postcode: "RG1 8EQ",
  contactConsent: true,
  ...over,
});

export async function run() {
  const { ok, done } = reporter();
  console.log("\n── Job payments + verified-paid (M2.5) ──");
  const drivers = [],
    customers = [];
  try {
    const cust = await signupCustomer();
    customers.push(cust.email);
    const pro = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(pro.email);
    sql(`update "Driver" set "isActive"=true where id='${pro.id}';`);

    const job = (await req("/jobs", { method: "POST", cookie: cust.cookie, body: jobBody() })).body;
    // Hire the pro so there's someone to pay.
    await req(`/jobs/${job.id}`, { method: "PATCH", cookie: cust.cookie, body: { status: "hired", hiredDriverPublicId: pro.publicId } });

    // The pro can't receive payments until they've connected payouts.
    const early = await req(`/jobs/${job.id}/pay`, { method: "POST", cookie: cust.cookie, body: { amount: 12000 } });
    ok("paying a pro with no payouts is refused (400)", early.status === 400, `HTTP ${early.status} ${JSON.stringify(early.body)}`);

    // Connect the pro to Stripe (mock).
    sql(`update "Driver" set "stripeAccountId"='acct_test_${pro.id.slice(0, 8)}', "stripeOnboarded"=true where id='${pro.id}';`);

    // Job now advertises it can be paid, but hasn't been.
    const before = await req(`/jobs/${job.id}`, { cookie: cust.cookie });
    ok("job shows canPayOnPlatform + not yet paid", before.body?.canPayOnPlatform === true && before.body?.paidOnPlatform === false, JSON.stringify({ can: before.body?.canPayOnPlatform, paid: before.body?.paidOnPlatform }));

    // Validation: below the minimum.
    const tooSmall = await req(`/jobs/${job.id}/pay`, { method: "POST", cookie: cust.cookie, body: { amount: 50 } });
    ok("a tiny amount is rejected (400)", tooSmall.status === 400, `HTTP ${tooSmall.status}`);

    // Pay (mock settles immediately).
    const pay = await req(`/jobs/${job.id}/pay`, { method: "POST", cookie: cust.cookie, body: { amount: 12000 } });
    ok("customer pays for the job (2xx)", pay.ok && !!pay.body?.tipId, `HTTP ${pay.status} ${JSON.stringify(pay.body)}`);
    ok("dev uses the mock gateway (settles immediately)", pay.body?.mock === true);

    // Recorded as a succeeded job payment.
    const row = sql(`select type||'|'||status||'|'||amount from "Tip" where "jobId"='${job.id}';`);
    ok("payment recorded as a succeeded job payment", row === "payment|succeeded|12000", `db=${row}`);

    // The job now reads as paid.
    const after = await req(`/jobs/${job.id}`, { cookie: cust.cookie });
    ok("job now reads paidOnPlatform", after.body?.paidOnPlatform === true);

    // Receipt endpoint: owner gets a { receiptUrl } shape (null in mock, a
    // Stripe-hosted URL in real mode); a non-owner can't read it.
    const receipt = await req(`/jobs/${job.id}/receipt`, { cookie: cust.cookie });
    ok("owner can request the payment receipt", receipt.ok && "receiptUrl" in (receipt.body ?? {}), `HTTP ${receipt.status} ${JSON.stringify(receipt.body)}`);

    // Leave a review linked to the job → it's marked paid on the public profile.
    const review = await req("/reviews", { method: "POST", cookie: cust.cookie, body: { driverPublicId: pro.publicId, jobId: job.id, rating: 5, comment: "Great job, paid easily through the app." } });
    ok("customer leaves a review for the job (2xx)", review.ok, `HTTP ${review.status} ${JSON.stringify(review.body)}`);
    const profile = await req(`/pros/${pro.publicId}`, { cookie: cust.cookie });
    const theReview = (profile.body?.reviews ?? []).find((r) => /paid easily/.test(r.comment ?? ""));
    ok("the review is flagged verified + paid on platform", theReview?.verified === true && theReview?.paidOnPlatform === true, JSON.stringify(theReview));

    // A job with no hired pro can't be paid.
    const job2 = (await req("/jobs", { method: "POST", cookie: cust.cookie, body: jobBody({ title: "Unhired job" }) })).body;
    const noPro = await req(`/jobs/${job2.id}/pay`, { method: "POST", cookie: cust.cookie, body: { amount: 5000 } });
    ok("paying a job with no hired pro is refused (400)", noPro.status === 400, `HTTP ${noPro.status}`);

    // Auth boundaries.
    const proPay = await req(`/jobs/${job.id}/pay`, { method: "POST", cookie: pro.cookie, body: { amount: 1000 } });
    ok("a pro can't use the pay endpoint (401/403)", proPay.status === 401 || proPay.status === 403, `HTTP ${proPay.status}`);
    const other = await signupCustomer();
    customers.push(other.email);
    const foreign = await req(`/jobs/${job.id}/pay`, { method: "POST", cookie: other.cookie, body: { amount: 1000 } });
    ok("another customer can't pay this job (403/404)", foreign.status === 403 || foreign.status === 404, `HTTP ${foreign.status}`);

    for (const id of [job.id, job2.id]) await req(`/jobs/${id}`, { method: "DELETE", cookie: cust.cookie });
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
  }
  return done("job-payments");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

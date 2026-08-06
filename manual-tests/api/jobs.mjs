// Jobs marketplace: posting (consent), quote cap, contact unlock, interested,
// edit/delete, and the customer/professional ownership boundaries.
import { req, sql, reporter, signupPro, signupCustomer, delDriver, delCustomer } from "./_lib.mjs";

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
  console.log("\n── Jobs / marketplace ──");
  const drivers = [], customers = [];
  try {
    const cust = await signupCustomer();
    customers.push(cust.email);

    // Consent is mandatory.
    const noConsent = await req("/jobs", { method: "POST", cookie: cust.cookie, body: jobBody({ contactConsent: false }) });
    ok("posting without consent is rejected (400)", noConsent.status === 400, `HTTP ${noConsent.status} ${JSON.stringify(noConsent.body)}`);

    // Too-short description fails validation.
    const badDesc = await req("/jobs", { method: "POST", cookie: cust.cookie, body: jobBody({ description: "too short" }) });
    ok("short description rejected (400)", badDesc.status === 400, `HTTP ${badDesc.status}`);

    // A professional session cannot post a job.
    const pro1 = await signupPro();
    drivers.push(pro1.email);
    const proPost = await req("/jobs", { method: "POST", cookie: pro1.cookie, body: jobBody() });
    ok("a professional cannot post a job (401/403)", proPost.status === 401 || proPost.status === 403, `HTTP ${proPost.status}`);

    // Happy-path post.
    const post = await req("/jobs", { method: "POST", cookie: cust.cookie, body: jobBody({ maxContacts: 1 }) });
    ok("customer posts a job (2xx) with an id", post.ok && !!post.body?.id, `HTTP ${post.status} ${JSON.stringify(post.body)}`);
    const jobId = post.body?.id;

    // Customer sees it in "mine" and can read it.
    const mine = await req("/jobs/mine", { cookie: cust.cookie });
    ok("job appears in the customer's 'mine' list", (mine.body ?? []).some((j) => j.id === jobId));
    const getJob = await req(`/jobs/${jobId}`, { cookie: cust.cookie });
    ok("customer can read their own job", getJob.ok && getJob.body?.id === jobId, `HTTP ${getJob.status}`);

    // Another customer cannot read it.
    const other = await signupCustomer();
    customers.push(other.email);
    const foreign = await req(`/jobs/${jobId}`, { cookie: other.cookie });
    ok("another customer cannot read the job (403/404)", foreign.status === 403 || foreign.status === 404, `HTTP ${foreign.status}`);

    // An inactive professional cannot unlock (needs a subscription).
    const preActivate = await req(`/pro/jobs/${jobId}/unlock`, { method: "POST", cookie: pro1.cookie });
    ok("inactive pro is refused unlock (403 subscription_required)", preActivate.status === 403, `HTTP ${preActivate.status} ${JSON.stringify(preActivate.body)}`);

    // Activate two professionals.
    sql(`update "Driver" set "isActive"=true where id='${pro1.id}';`);
    const pro2 = await signupPro();
    drivers.push(pro2.email);
    sql(`update "Driver" set "isActive"=true where id='${pro2.id}';`);

    // A customer session cannot use the pro unlock endpoint.
    const custUnlock = await req(`/pro/jobs/${jobId}/unlock`, { method: "POST", cookie: cust.cookie });
    ok("a customer cannot unlock contacts (401/403)", custUnlock.status === 401 || custUnlock.status === 403, `HTTP ${custUnlock.status}`);

    // First pro unlocks → gets the customer's contact details.
    const unlock1 = await req(`/pro/jobs/${jobId}/unlock`, { method: "POST", cookie: pro1.cookie });
    ok("active pro unlocks the contact (2xx)", unlock1.ok, `HTTP ${unlock1.status} ${JSON.stringify(unlock1.body)}`);
    const contactStr = JSON.stringify(unlock1.body ?? {});
    ok("unlock returns customer contact (email/phone)", /@/.test(contactStr) || /\+?\d{6,}/.test(contactStr), contactStr.slice(0, 160));

    // Re-unlocking by the same pro is idempotent (they already have it).
    const reUnlock = await req(`/pro/jobs/${jobId}/unlock`, { method: "POST", cookie: pro1.cookie });
    ok("same pro re-unlocking still succeeds", reUnlock.ok, `HTTP ${reUnlock.status}`);

    // Quote cap (maxContacts=1): the SECOND pro is refused.
    const unlock2 = await req(`/pro/jobs/${jobId}/unlock`, { method: "POST", cookie: pro2.cookie });
    ok("quote cap blocks a second pro (403 quotes_full)", unlock2.status === 403, `HTTP ${unlock2.status} ${JSON.stringify(unlock2.body)}`);

    // Customer sees who's interested.
    const interested = await req(`/jobs/${jobId}/interested`, { cookie: cust.cookie });
    ok("interested list includes the pro who unlocked", (interested.body ?? []).length >= 1, JSON.stringify(interested.body).slice(0, 160));

    // Edit + delete.
    const patch = await req(`/jobs/${jobId}`, { method: "PATCH", cookie: cust.cookie, body: { title: "Fix a leaking bathroom tap" } });
    ok("customer can edit their job", patch.ok, `HTTP ${patch.status}`);
    const del = await req(`/jobs/${jobId}`, { method: "DELETE", cookie: cust.cookie });
    ok("customer can delete their job", del.ok, `HTTP ${del.status}`);
    const gone = await req(`/jobs/${jobId}`, { cookie: cust.cookie });
    ok("deleted job is no longer readable (404)", gone.status === 404, `HTTP ${gone.status}`);
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
  }
  return done("jobs");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => { console.log(`\n${r.pass} passed, ${r.fail} failed`); process.exit(r.fail ? 1 : 0); });
}

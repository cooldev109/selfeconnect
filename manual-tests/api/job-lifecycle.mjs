// Job lifecycle — valid transitions, timestamps, and rejection of invalid ones.
import { req, sql, reporter, signupCustomer, signupPro, delCustomer, delDriver } from "./_lib.mjs";

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
  console.log("\n── Job lifecycle ──");
  const customers = [], drivers = [];
  try {
    const cust = await signupCustomer();
    customers.push(cust.email);
    const pro = await signupPro();
    drivers.push(pro.email);

    const post = await req("/jobs", { method: "POST", cookie: cust.cookie, body: jobBody() });
    const jobId = post.body?.id;
    ok("new job starts in 'open'", post.body?.status === "open", JSON.stringify(post.body?.status));

    // Invalid: can't jump open -> completed
    const skip = await req(`/jobs/${jobId}`, { method: "PATCH", cookie: cust.cookie, body: { status: "completed" } });
    ok("open -> completed is rejected (400)", skip.status === 400, `HTTP ${skip.status} ${JSON.stringify(skip.body)}`);

    // Valid: open -> hired (records the pro + stamps hiredAt)
    const hire = await req(`/jobs/${jobId}`, { method: "PATCH", cookie: cust.cookie, body: { status: "hired", hiredDriverPublicId: pro.publicId } });
    ok("open -> hired accepted", hire.ok && hire.body?.status === "hired", `HTTP ${hire.status} ${JSON.stringify(hire.body?.status)}`);
    ok("hiredAt timestamp is set", !!hire.body?.hiredAt, JSON.stringify(hire.body?.hiredAt));
    ok("hired professional recorded", hire.body?.hiredDriverPublicId === pro.publicId);

    // Valid: hired -> in_progress
    const start = await req(`/jobs/${jobId}`, { method: "PATCH", cookie: cust.cookie, body: { status: "in_progress" } });
    ok("hired -> in_progress accepted", start.ok && start.body?.status === "in_progress", `HTTP ${start.status}`);
    ok("startedAt timestamp is set", !!start.body?.startedAt);

    // Invalid: in_progress -> hired (can't go backwards)
    const back = await req(`/jobs/${jobId}`, { method: "PATCH", cookie: cust.cookie, body: { status: "hired" } });
    ok("in_progress -> hired is rejected (400)", back.status === 400, `HTTP ${back.status}`);

    // Valid: in_progress -> completed
    const complete = await req(`/jobs/${jobId}`, { method: "PATCH", cookie: cust.cookie, body: { status: "completed" } });
    ok("in_progress -> completed accepted", complete.ok && complete.body?.status === "completed", `HTTP ${complete.status}`);
    ok("completedAt timestamp is set", !!complete.body?.completedAt);

    // Terminal: completed -> anything rejected
    const afterDone = await req(`/jobs/${jobId}`, { method: "PATCH", cookie: cust.cookie, body: { status: "in_progress" } });
    ok("completed is terminal (400)", afterDone.status === 400, `HTTP ${afterDone.status}`);

    // Cancellation path on a fresh job: open -> cancelled with a reason
    const job2 = (await req("/jobs", { method: "POST", cookie: cust.cookie, body: jobBody({ title: "Second job to cancel" }) })).body;
    const cancel = await req(`/jobs/${job2.id}`, { method: "PATCH", cookie: cust.cookie, body: { status: "cancelled", cancelReason: "No longer needed" } });
    ok("open -> cancelled accepted", cancel.ok && cancel.body?.status === "cancelled", `HTTP ${cancel.status}`);
    ok("cancelledAt + reason recorded", !!cancel.body?.cancelledAt && cancel.body?.cancelReason === "No longer needed", JSON.stringify(cancel.body?.cancelReason));

    // Back-compat: the legacy open -> closed still works (found off-platform)
    const job3 = (await req("/jobs", { method: "POST", cookie: cust.cookie, body: jobBody({ title: "Third job, legacy close" }) })).body;
    const close = await req(`/jobs/${job3.id}`, { method: "PATCH", cookie: cust.cookie, body: { status: "closed" } });
    ok("legacy open -> closed still works", close.ok && close.body?.status === "closed", `HTTP ${close.status}`);

    // Only the owner can transition someone else's job
    const other = await signupCustomer();
    customers.push(other.email);
    const foreign = await req(`/jobs/${jobId}`, { method: "PATCH", cookie: other.cookie, body: { status: "cancelled" } });
    ok("a non-owner cannot transition the job (404/403)", foreign.status === 404 || foreign.status === 403, `HTTP ${foreign.status}`);
  } finally {
    for (const e of customers) delCustomer(e);
    for (const e of drivers) delDriver(e);
  }
  return done("job-lifecycle");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => { console.log(`\n${r.pass} passed, ${r.fail} failed`); process.exit(r.fail ? 1 : 0); });
}

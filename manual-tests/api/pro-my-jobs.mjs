// Staged My Jobs — professional pipeline (M1.6). GET /pro/jobs/mine returns the
// jobs a pro has unlocked or been hired for, at whatever stage, with the
// customer contact and a `hired` flag. Also checks the customer-side lifecycle
// data (status + cancelReason) the staged customer view reads.
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
const mineFind = (rows, id) => (rows ?? []).find((j) => j.id === id);

export async function run() {
  const { ok, done } = reporter();
  console.log("\n── Pro pipeline / staged My Jobs (M1.6) ──");
  const drivers = [],
    customers = [];
  try {
    // Anonymous can't read a pipeline.
    const anon = await req("/pro/jobs/mine");
    ok("anonymous cannot read the pro pipeline (401)", anon.status === 401, `HTTP ${anon.status}`);

    const cust = await signupCustomer();
    customers.push(cust.email);
    const pro = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(pro.email);
    sql(`update "Driver" set "isActive"=true where id='${pro.id}';`);

    // A job the pro has NOT touched must not appear in their pipeline.
    const jobA = (await req("/jobs", { method: "POST", cookie: cust.cookie, body: jobBody() })).body;
    const before = await req("/pro/jobs/mine", { cookie: pro.cookie });
    ok("untouched job is absent from the pipeline", !mineFind(before.body, jobA.id));

    // Pro unlocks it → it enters their pipeline as "open", not hired, contact shown.
    const unlock = await req(`/pro/jobs/${jobA.id}/unlock`, { method: "POST", cookie: pro.cookie });
    ok("pro unlocks the job (2xx)", unlock.ok, `HTTP ${unlock.status}`);
    let mine = (await req("/pro/jobs/mine", { cookie: pro.cookie })).body;
    let row = mineFind(mine, jobA.id);
    ok("unlocked job appears in the pipeline", !!row);
    ok("pipeline row carries the status (open)", row?.status === "open", `status=${row?.status}`);
    ok("pipeline row is not yet hired", row?.hired === false);
    ok("pipeline row exposes the customer contact", !!row?.contact?.email);

    // Customer hires this pro → hired flag flips, status becomes hired.
    await req(`/jobs/${jobA.id}`, {
      method: "PATCH",
      cookie: cust.cookie,
      body: { status: "hired", hiredDriverPublicId: pro.publicId },
    });
    mine = (await req("/pro/jobs/mine", { cookie: pro.cookie })).body;
    row = mineFind(mine, jobA.id);
    ok("pipeline shows the pro was hired", row?.hired === true && row?.status === "hired", JSON.stringify({ hired: row?.hired, status: row?.status }));

    // Advance to in_progress then completed — pipeline tracks the stage.
    await req(`/jobs/${jobA.id}`, { method: "PATCH", cookie: cust.cookie, body: { status: "in_progress" } });
    row = mineFind((await req("/pro/jobs/mine", { cookie: pro.cookie })).body, jobA.id);
    ok("pipeline reflects in_progress", row?.status === "in_progress", `status=${row?.status}`);
    await req(`/jobs/${jobA.id}`, { method: "PATCH", cookie: cust.cookie, body: { status: "completed" } });
    row = mineFind((await req("/pro/jobs/mine", { cookie: pro.cookie })).body, jobA.id);
    ok("pipeline reflects completed", row?.status === "completed", `status=${row?.status}`);

    // Customer-side lifecycle data the staged customer view reads: cancelReason.
    const jobB = (await req("/jobs", { method: "POST", cookie: cust.cookie, body: jobBody({ title: "Second job" }) })).body;
    const cancel = await req(`/jobs/${jobB.id}`, {
      method: "PATCH",
      cookie: cust.cookie,
      body: { status: "cancelled", cancelReason: "No longer needed" },
    });
    ok("customer can cancel with a reason (2xx)", cancel.ok, `HTTP ${cancel.status}`);
    ok("cancelled job echoes status + reason", cancel.body?.status === "cancelled" && cancel.body?.cancelReason === "No longer needed", JSON.stringify({ s: cancel.body?.status, r: cancel.body?.cancelReason }));

    // A hired-but-not-unlocked pro still sees the job (they're the hire).
    const pro2 = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(pro2.email);
    const jobC = (await req("/jobs", { method: "POST", cookie: cust.cookie, body: jobBody({ title: "Third job" }) })).body;
    await req(`/jobs/${jobC.id}`, { method: "PATCH", cookie: cust.cookie, body: { status: "hired", hiredDriverPublicId: pro2.publicId } });
    const mine2 = (await req("/pro/jobs/mine", { cookie: pro2.cookie })).body;
    const rowC = mineFind(mine2, jobC.id);
    ok("hired-but-never-unlocked pro still sees the job", !!rowC && rowC.hired === true, JSON.stringify(rowC && { hired: rowC.hired }));
    ok("hired pro sees the contact even without unlocking", !!rowC?.contact?.email);

    // Cleanup jobs.
    for (const id of [jobA.id, jobB.id, jobC.id]) {
      await req(`/jobs/${id}`, { method: "DELETE", cookie: cust.cookie });
    }
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
  }
  return done("pro-my-jobs");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

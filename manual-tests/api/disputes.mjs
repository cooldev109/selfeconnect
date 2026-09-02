// Disputes + abuse reports (M3.5). A customer and a hired professional can each
// raise a dispute on a job (with party checks), an admin resolves it and the
// raiser is notified; and anyone can report a professional / customer / job for
// an admin to action or dismiss.
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
  console.log("\n── Disputes + reports (M3.5) ──");
  const drivers = [], customers = [];
  try {
    const admin = await makeAdmin();
    drivers.push(admin.email);
    const pro = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(pro.email);
    sql(`update "Driver" set "isActive"=true where id='${pro.id}';`);
    const cust = await signupCustomer();
    customers.push(cust.email);

    // A job hired to the pro (so both are parties + notifications route).
    const job = await req("/jobs", { method: "POST", cookie: cust.cookie, body: { categorySlug: "plumber", title: "Dispute test job", description: "a job we will raise a dispute about during testing", postcode: "RG1 8EQ", contactConsent: true } });
    ok("job created", job.ok && !!job.body?.id, `HTTP ${job.status}`);
    const jobId = job.body.id;
    sql(`update "Job" set status='hired', "hiredDriverId"='${pro.id}' where id='${jobId}';`);

    // --- customer raises a dispute ---
    const d1 = await req(`/jobs/${jobId}/dispute`, { method: "POST", cookie: cust.cookie, body: { reason: "no_show", detail: "The professional didn't turn up." } });
    ok("customer raises a dispute", d1.ok && d1.body?.status === "open", `HTTP ${d1.status} ${JSON.stringify(d1.body)}`);
    const disputeId = d1.body.id;
    // pro (hired) is notified
    const proNotif = await req("/notifications", { cookie: pro.cookie });
    ok("hired pro is notified of the dispute", (proNotif.body ?? []).some((n) => n.kind === "dispute"));

    // a different customer can't raise on someone else's job
    const cust2 = await signupCustomer();
    customers.push(cust2.email);
    const forbCust = await req(`/jobs/${jobId}/dispute`, { method: "POST", cookie: cust2.cookie, body: { reason: "other", detail: "not my job at all" } });
    ok("non-owner customer can't raise a dispute (403)", forbCust.status === 403, `HTTP ${forbCust.status}`);

    // --- pro raises a dispute (hired → a party) ---
    const d2 = await req(`/pro/jobs/${jobId}/dispute`, { method: "POST", cookie: pro.cookie, body: { reason: "payment", detail: "I have not been paid for this." } });
    ok("hired pro raises a dispute", d2.ok && d2.body?.status === "open", `HTTP ${d2.status}`);
    // a pro not involved can't
    const other = await signupPro();
    drivers.push(other.email);
    const forbPro = await req(`/pro/jobs/${jobId}/dispute`, { method: "POST", cookie: other.cookie, body: { reason: "other", detail: "nothing to do with me" } });
    ok("uninvolved pro can't raise a dispute (403)", forbPro.status === 403, `HTTP ${forbPro.status}`);

    // --- admin resolves ---
    const forbList = await req("/admin/disputes", { cookie: pro.cookie });
    ok("non-admin can't list disputes (403)", forbList.status === 403, `HTTP ${forbList.status}`);
    const list = await req("/admin/disputes?status=open", { cookie: admin.cookie });
    ok("admin sees the open dispute", list.ok && (list.body ?? []).some((d) => d.id === disputeId), `HTTP ${list.status}`);
    const res = await req(`/admin/disputes/${disputeId}/resolve`, { method: "POST", cookie: admin.cookie, body: { status: "resolved", notes: "Refunded the customer." } });
    ok("admin resolves the dispute", res.ok && res.body?.status === "resolved", `HTTP ${res.status}`);
    ok("dispute is resolved in the DB", sql(`select status from "Dispute" where id='${disputeId}';`) === "resolved");
    const custNotif = await req("/customer/notifications", { cookie: cust.cookie });
    ok("the raiser (customer) is notified of the outcome", (custNotif.body ?? []).some((n) => n.kind === "dispute"));

    // --- abuse reports ---
    const r1 = await req("/report", { method: "POST", cookie: cust.cookie, body: { targetType: "driver", targetId: pro.publicId, reason: "This profile looks fake." } });
    ok("customer reports a professional", r1.ok && !!r1.body?.id, `HTTP ${r1.status}`);
    const pr = await req("/pro/report", { method: "POST", cookie: pro.cookie, body: { targetType: "job", targetId: jobId, reason: "Spam job posting." } });
    ok("pro reports a job", pr.ok && !!pr.body?.id, `HTTP ${pr.status}`);
    const forbReports = await req("/admin/reports", { cookie: cust.cookie });
    ok("non-admin can't list reports", forbReports.status === 401 || forbReports.status === 403, `HTTP ${forbReports.status}`);
    const reportsList = await req("/admin/reports?status=open", { cookie: admin.cookie });
    ok("admin sees the open reports", reportsList.ok && (reportsList.body ?? []).some((r) => r.id === r1.body.id), `HTTP ${reportsList.status}`);
    const rr = await req(`/admin/reports/${r1.body.id}/resolve`, { method: "POST", cookie: admin.cookie, body: { status: "dismissed" } });
    ok("admin dismisses a report", rr.ok && rr.body?.status === "dismissed", `HTTP ${rr.status}`);
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
  }
  return done("disputes");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

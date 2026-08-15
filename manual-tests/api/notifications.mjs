// Notification centre (M2.3). Events raise in-app notifications: a new quote and
// new messages alert the customer; a new message and being hired alert the pro.
// Message alerts de-dupe while unread. Covers generation, listing, mark-read,
// and the auth boundaries.
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
const kinds = (list) => (list ?? []).map((n) => n.kind);
const unread = (list) => (list ?? []).filter((n) => !n.read);

export async function run() {
  const { ok, done } = reporter();
  console.log("\n── Notifications (M2.3) ──");
  const drivers = [],
    customers = [];
  try {
    const cust = await signupCustomer();
    customers.push(cust.email);
    const job = (await req("/jobs", { method: "POST", cookie: cust.cookie, body: jobBody() })).body;
    const pro = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(pro.email);
    sql(`update "Driver" set "isActive"=true where id='${pro.id}';`);

    // Pro quotes → customer gets a quote notification.
    await req(`/pro/jobs/${job.id}/quote`, { method: "POST", cookie: pro.cookie, body: { amount: 12000, message: "Can do Thursday." } });
    let custList = (await req("/customer/notifications", { cookie: cust.cookie })).body;
    ok("customer is notified of a new quote", kinds(custList).includes("quote"), JSON.stringify(kinds(custList)));

    // Editing the quote does NOT add another notification.
    await req(`/pro/jobs/${job.id}/quote`, { method: "POST", cookie: pro.cookie, body: { amount: 9000, message: "Cheaper now." } });
    custList = (await req("/customer/notifications", { cookie: cust.cookie })).body;
    ok("editing a quote adds no extra notification", kinds(custList).filter((k) => k === "quote").length === 1);

    // Pro sends two messages → customer gets ONE unread message notification.
    await req(`/pro/jobs/${job.id}/messages`, { method: "POST", cookie: pro.cookie, body: { body: "Hi there!" } });
    await req(`/pro/jobs/${job.id}/messages`, { method: "POST", cookie: pro.cookie, body: { body: "Still available Thursday." } });
    custList = (await req("/customer/notifications", { cookie: cust.cookie })).body;
    ok("two pro messages produce a single unread message alert", unread(custList).filter((n) => n.kind === "message").length === 1, JSON.stringify(kinds(custList)));

    // The notification deep-links to the job.
    ok("message notification carries the jobId", (custList ?? []).find((n) => n.kind === "message")?.jobId === job.id);

    // Customer reads notifications → all marked read.
    const read = await req("/customer/notifications/read", { method: "POST", cookie: cust.cookie });
    ok("customer marks all read (2xx)", read.ok, `HTTP ${read.status}`);
    custList = (await req("/customer/notifications", { cookie: cust.cookie })).body;
    ok("no unread after marking read", unread(custList).length === 0);

    // A fresh pro message after read raises a NEW unread alert.
    await req(`/pro/jobs/${job.id}/messages`, { method: "POST", cookie: pro.cookie, body: { body: "Following up!" } });
    custList = (await req("/customer/notifications", { cookie: cust.cookie })).body;
    ok("a new message after reading re-alerts", unread(custList).some((n) => n.kind === "message"));

    // Customer messages the pro → pro gets a message notification.
    await req(`/jobs/${job.id}/messages`, { method: "POST", cookie: cust.cookie, body: { pro: pro.publicId, body: "Thursday works." } });
    let proList = (await req("/notifications", { cookie: pro.cookie })).body;
    ok("pro is notified of the customer's message", kinds(proList).includes("message"));

    // Customer hires the pro → pro gets a 'hired' notification.
    await req(`/jobs/${job.id}`, { method: "PATCH", cookie: cust.cookie, body: { status: "hired", hiredDriverPublicId: pro.publicId } });
    proList = (await req("/notifications", { cookie: pro.cookie })).body;
    ok("pro is notified they were hired", kinds(proList).includes("hired"));
    ok("hired notification deep-links to the job", (proList ?? []).find((n) => n.kind === "hired")?.jobId === job.id);

    // Auth boundaries.
    const anon = await req("/notifications");
    ok("anonymous can't read pro notifications (401)", anon.status === 401, `HTTP ${anon.status}`);
    const custOnPro = await req("/notifications", { cookie: cust.cookie });
    ok("a customer can't read pro notifications (401/403)", custOnPro.status === 401 || custOnPro.status === 403, `HTTP ${custOnPro.status}`);
    const proOnCust = await req("/customer/notifications", { cookie: pro.cookie });
    ok("a pro can't read customer notifications (401/403)", proOnCust.status === 401 || proOnCust.status === 403, `HTTP ${proOnCust.status}`);

    await req(`/jobs/${job.id}`, { method: "DELETE", cookie: cust.cookie });
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
  }
  return done("notifications");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

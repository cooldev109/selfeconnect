// Invite professionals to a job (customer-initiated outreach). A customer can
// reach skilled pros for their own job: the candidate list is their trade, not
// yet engaged; inviting one engages them (a two-way thread + first message +
// an in-app alert) and isn't blocked by the inbound-contact cap.
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
  console.log("\n── Invite professionals to a job ──");
  const drivers = [],
    customers = [];
  try {
    const cust = await signupCustomer();
    customers.push(cust.email);
    const job = (await req("/jobs", { method: "POST", cookie: cust.cookie, body: jobBody() })).body;

    // Pro A — a plumber who has already engaged (quoted → unlocked).
    const engaged = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(engaged.email);
    sql(`update "Driver" set "isActive"=true where id='${engaged.id}';`);
    await req(`/pro/jobs/${job.id}/quote`, { method: "POST", cookie: engaged.cookie, body: { amount: 12000, message: "Can do Thursday." } });

    // Pro B — a plumber not yet engaged (the invite candidate).
    const candidate = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(candidate.email);
    sql(`update "Driver" set "isActive"=true where id='${candidate.id}';`);

    // Pro C — a carpenter (wrong trade for a plumbing job).
    const wrongTrade = await signupPro({ categorySlugs: ["carpenter"] });
    drivers.push(wrongTrade.email);
    sql(`update "Driver" set "isActive"=true where id='${wrongTrade.id}';`);

    // --- Candidate list ---
    const match1 = await req(`/jobs/${job.id}/matching-pros`, { cookie: cust.cookie });
    const ids1 = (match1.body ?? []).map((p) => p.publicId);
    ok("matching-pros lists the un-engaged plumber", match1.ok && ids1.includes(candidate.publicId), `HTTP ${match1.status} ${JSON.stringify(ids1)}`);
    ok("matching-pros excludes the already-engaged pro", !ids1.includes(engaged.publicId));
    ok("matching-pros excludes a different trade", !ids1.includes(wrongTrade.publicId));

    // --- Invite the candidate ---
    const inv = await req(`/jobs/${job.id}/invite`, { method: "POST", cookie: cust.cookie, body: { pro: candidate.publicId, message: "Hi, are you free next week to fix my tap?" } });
    ok("invite succeeds (2xx) and returns the pro", inv.ok && inv.body?.proPublicId === candidate.publicId, `HTTP ${inv.status} ${JSON.stringify(inv.body)}`);

    // The invited pro is now engaged: they can read the thread and see the message.
    const proMsgs = await req(`/pro/jobs/${job.id}/messages`, { cookie: candidate.cookie });
    ok("invited pro can read the thread with the customer's message", proMsgs.ok && (proMsgs.body ?? []).some((m) => m.fromCustomer && /next week/.test(m.body ?? "")), `HTTP ${proMsgs.status}`);

    // The invited pro got an in-app notification (kind message).
    const notif = await req("/notifications", { cookie: candidate.cookie });
    ok("invited pro gets a 'new enquiry' notification", (notif.body ?? []).some((n) => n.kind === "message" && n.jobId === job.id), JSON.stringify((notif.body ?? []).map((n) => n.kind)));

    // The contact count reflects both the engaged pro and the invite.
    const jobNow = await req(`/jobs/${job.id}`, { cookie: cust.cookie });
    ok("contact count includes the invited pro", jobNow.body?.contactCount === 2, `count=${jobNow.body?.contactCount}`);

    // The candidate no longer appears in the list (now engaged).
    const match2 = await req(`/jobs/${job.id}/matching-pros`, { cookie: cust.cookie });
    ok("an invited pro drops off the candidate list", !(match2.body ?? []).map((p) => p.publicId).includes(candidate.publicId));

    // --- Validation & guards ---
    const empty = await req(`/jobs/${job.id}/invite`, { method: "POST", cookie: cust.cookie, body: { pro: wrongTrade.publicId, message: "x" } });
    ok("a too-short message is rejected (400)", empty.status === 400, `HTTP ${empty.status}`);
    const badPro = await req(`/jobs/${job.id}/invite`, { method: "POST", cookie: cust.cookie, body: { pro: "ZZZZZ", message: "Are you available?" } });
    ok("inviting an unknown pro 404s", badPro.status === 404, `HTTP ${badPro.status}`);

    const other = await signupCustomer();
    customers.push(other.email);
    const foreignList = await req(`/jobs/${job.id}/matching-pros`, { cookie: other.cookie });
    ok("another customer can't list matching pros (403/404)", foreignList.status === 403 || foreignList.status === 404, `HTTP ${foreignList.status}`);
    const foreignInvite = await req(`/jobs/${job.id}/invite`, { method: "POST", cookie: other.cookie, body: { pro: wrongTrade.publicId, message: "Are you available?" } });
    ok("another customer can't invite to the job (403/404)", foreignInvite.status === 403 || foreignInvite.status === 404, `HTTP ${foreignInvite.status}`);

    const proInvite = await req(`/jobs/${job.id}/invite`, { method: "POST", cookie: engaged.cookie, body: { pro: wrongTrade.publicId, message: "Are you available?" } });
    ok("a pro can't use the invite endpoint (401/403)", proInvite.status === 401 || proInvite.status === 403, `HTTP ${proInvite.status}`);

    // --- The cap doesn't block the customer's own outreach ---
    const capped = (await req("/jobs", { method: "POST", cookie: cust.cookie, body: jobBody({ maxContacts: 1 }) })).body;
    await req(`/pro/jobs/${capped.id}/quote`, { method: "POST", cookie: engaged.cookie, body: { amount: 9000, message: "Available." } });
    const cappedJob = await req(`/jobs/${capped.id}`, { cookie: cust.cookie });
    ok("the capped job is at its inbound limit", cappedJob.body?.contactCount === 1 && cappedJob.body?.maxContacts === 1, JSON.stringify({ c: cappedJob.body?.contactCount, m: cappedJob.body?.maxContacts }));
    const capBypass = await req(`/jobs/${capped.id}/invite`, { method: "POST", cookie: cust.cookie, body: { pro: candidate.publicId, message: "Could you help with this one too?" } });
    ok("a customer can invite past the contact cap", capBypass.ok, `HTTP ${capBypass.status} ${JSON.stringify(capBypass.body)}`);

    // --- A closed job can't be invited to ---
    sql(`update "Job" set status='completed' where id='${job.id}';`);
    const closed = await req(`/jobs/${job.id}/invite`, { method: "POST", cookie: cust.cookie, body: { pro: wrongTrade.publicId, message: "Are you available?" } });
    ok("inviting to a completed job is rejected (400)", closed.status === 400, `HTTP ${closed.status}`);

    await req(`/jobs/${job.id}`, { method: "DELETE", cookie: cust.cookie });
    await req(`/jobs/${capped.id}`, { method: "DELETE", cookie: cust.cookie });
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
  }
  return done("job-invite");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

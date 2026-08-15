// In-job chat (M2.2). A customer and an engaged pro exchange messages in a
// per-(job,pro) thread. Covers send/receive both ways, read receipts driving
// the unread count, engagement gating, and the auth boundaries.
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
  console.log("\n── In-job chat (M2.2) ──");
  const drivers = [],
    customers = [];
  try {
    const cust = await signupCustomer();
    customers.push(cust.email);
    const job = (await req("/jobs", { method: "POST", cookie: cust.cookie, body: jobBody() })).body;

    // An engaged pro (quotes → unlocks).
    const pro = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(pro.email);
    sql(`update "Driver" set "isActive"=true where id='${pro.id}';`);
    await req(`/pro/jobs/${job.id}/quote`, { method: "POST", cookie: pro.cookie, body: { amount: 12000, message: "Can do Thursday." } });

    // A second active pro who hasn't engaged with this job.
    const stranger = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(stranger.email);
    sql(`update "Driver" set "isActive"=true where id='${stranger.id}';`);

    // Pro sends the first message.
    const m1 = await req(`/pro/jobs/${job.id}/messages`, { method: "POST", cookie: pro.cookie, body: { body: "Hi! Happy to help with the tap — when suits?" } });
    ok("engaged pro sends a message (2xx)", m1.ok && m1.body?.fromCustomer === false, `HTTP ${m1.status} ${JSON.stringify(m1.body)}`);

    // Customer sees a thread with that pro, 1 unread.
    const threads1 = await req(`/jobs/${job.id}/threads`, { cookie: cust.cookie });
    const t = (threads1.body ?? []).find((x) => x.publicId === pro.publicId);
    ok("customer sees the thread with a last message", !!t && /tap/.test(t.lastMessage ?? ""), JSON.stringify(t));
    ok("thread shows 1 unread for the customer", t?.unread === 1, `unread=${t?.unread}`);

    // Opening the thread marks the pro's message read.
    const msgs = await req(`/jobs/${job.id}/messages?pro=${pro.publicId}`, { cookie: cust.cookie });
    ok("customer reads the thread (2xx, 1 message)", msgs.ok && msgs.body?.length === 1, `HTTP ${msgs.status}`);
    const threads2 = await req(`/jobs/${job.id}/threads`, { cookie: cust.cookie });
    ok("unread clears after reading", (threads2.body ?? []).find((x) => x.publicId === pro.publicId)?.unread === 0);

    // Customer replies.
    const r1 = await req(`/jobs/${job.id}/messages`, { method: "POST", cookie: cust.cookie, body: { pro: pro.publicId, body: "Thursday morning works, thanks!" } });
    ok("customer sends a reply (2xx)", r1.ok && r1.body?.fromCustomer === true, `HTTP ${r1.status}`);

    // Pro sees both messages in order, and their unread reflects the reply.
    const proMsgs = await req(`/pro/jobs/${job.id}/messages`, { cookie: pro.cookie });
    ok(
      "pro sees the full thread in order",
      proMsgs.body?.length === 2 && proMsgs.body[0].fromCustomer === false && proMsgs.body[1].fromCustomer === true,
      JSON.stringify(proMsgs.body?.map((m) => m.fromCustomer)),
    );

    // Engagement gating: the stranger can't read or post.
    const strangerRead = await req(`/pro/jobs/${job.id}/messages`, { cookie: stranger.cookie });
    ok("a non-engaged pro can't read the thread (403)", strangerRead.status === 403, `HTTP ${strangerRead.status}`);
    const strangerPost = await req(`/pro/jobs/${job.id}/messages`, { method: "POST", cookie: stranger.cookie, body: { body: "let me in" } });
    ok("a non-engaged pro can't post (403)", strangerPost.status === 403, `HTTP ${strangerPost.status}`);

    // The customer can't message a pro who isn't engaged.
    const custToStranger = await req(`/jobs/${job.id}/messages`, { method: "POST", cookie: cust.cookie, body: { pro: stranger.publicId, body: "hello?" } });
    ok("customer can't message a non-engaged pro (403)", custToStranger.status === 403, `HTTP ${custToStranger.status}`);

    // Validation: empty message body.
    const empty = await req(`/pro/jobs/${job.id}/messages`, { method: "POST", cookie: pro.cookie, body: { body: "" } });
    ok("an empty message is rejected (400)", empty.status === 400, `HTTP ${empty.status}`);

    // Auth boundaries.
    const custOnProEndpoint = await req(`/pro/jobs/${job.id}/messages`, { cookie: cust.cookie });
    ok("a customer can't use the pro chat endpoint (401/403)", custOnProEndpoint.status === 401 || custOnProEndpoint.status === 403, `HTTP ${custOnProEndpoint.status}`);
    const proOnCustEndpoint = await req(`/jobs/${job.id}/threads`, { cookie: pro.cookie });
    ok("a pro can't list a customer's threads (401/403)", proOnCustEndpoint.status === 401 || proOnCustEndpoint.status === 403, `HTTP ${proOnCustEndpoint.status}`);
    const other = await signupCustomer();
    customers.push(other.email);
    const foreign = await req(`/jobs/${job.id}/threads`, { cookie: other.cookie });
    ok("another customer can't read the threads (403/404)", foreign.status === 403 || foreign.status === 404, `HTTP ${foreign.status}`);

    await req(`/jobs/${job.id}`, { method: "DELETE", cookie: cust.cookie });
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
  }
  return done("job-chat");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

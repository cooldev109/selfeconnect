// Quotes (M2.1). A professional submits a price + pitch on a job; submitting a
// quote also unlocks the contact. The customer sees the quotes on their job and
// hires from one. Covers gating (subscription, category, cap), update, the
// optional amount, and the auth boundaries.
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
  console.log("\n── Quotes (M2.1) ──");
  const drivers = [],
    customers = [];
  try {
    const cust = await signupCustomer();
    customers.push(cust.email);
    const job = (await req("/jobs", { method: "POST", cookie: cust.cookie, body: jobBody({ maxContacts: 1 }) })).body;

    // An inactive pro can't quote (same gate as unlock).
    const pro = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(pro.email);
    const inactiveQuote = await req(`/pro/jobs/${job.id}/quote`, {
      method: "POST",
      cookie: pro.cookie,
      body: { amount: 12000, message: "Can do this Thursday, parts included." },
    });
    ok("inactive pro is refused a quote (403)", inactiveQuote.status === 403, `HTTP ${inactiveQuote.status}`);

    // Activate and quote.
    sql(`update "Driver" set "isActive"=true where id='${pro.id}';`);
    const quote = await req(`/pro/jobs/${job.id}/quote`, {
      method: "POST",
      cookie: pro.cookie,
      body: { amount: 12000, message: "Can do this Thursday, parts included." },
    });
    ok("active pro submits a quote (2xx)", quote.ok, `HTTP ${quote.status} ${JSON.stringify(quote.body)}`);
    ok(
      "quote response carries myQuote (amount + message)",
      quote.body?.myQuote?.amount === 12000 && /Thursday/.test(quote.body?.myQuote?.message ?? ""),
      JSON.stringify(quote.body?.myQuote),
    );
    ok("quoting unlocked the contact", quote.body?.unlocked === true && !!quote.body?.contact?.email);

    // Validation: a too-short message is rejected.
    const badMsg = await req(`/pro/jobs/${job.id}/quote`, { method: "POST", cookie: pro.cookie, body: { message: "hi" } });
    ok("a too-short quote message is rejected (400)", badMsg.status === 400, `HTTP ${badMsg.status}`);

    // Customer sees the quote on their job.
    const list1 = await req(`/jobs/${job.id}/quotes`, { cookie: cust.cookie });
    ok(
      "customer sees the quote with pro + amount + message",
      list1.ok && list1.body?.length === 1 && list1.body[0].amount === 12000 && list1.body[0].publicId === pro.publicId,
      JSON.stringify(list1.body).slice(0, 200),
    );

    // Re-submitting updates the same quote (no duplicate).
    const update = await req(`/pro/jobs/${job.id}/quote`, {
      method: "POST",
      cookie: pro.cookie,
      body: { amount: 9500, message: "Actually I can do it cheaper — Friday morning." },
    });
    ok("re-submitting updates the quote (2xx)", update.ok && update.body?.myQuote?.amount === 9500, JSON.stringify(update.body?.myQuote));
    const list2 = await req(`/jobs/${job.id}/quotes`, { cookie: cust.cookie });
    ok("still one quote, now updated", list2.body?.length === 1 && list2.body[0].amount === 9500, JSON.stringify(list2.body));

    // The DB agrees there's exactly one quote row for this pro+job.
    ok("exactly one quote row in the DB", sql(`select count(*) from "Quote" where "jobId"='${job.id}' and "driverId"='${pro.id}';`) === "1");

    // Quote cap: a second active pro is blocked (quoting unlocks, cap=1).
    const pro2 = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(pro2.email);
    sql(`update "Driver" set "isActive"=true where id='${pro2.id}';`);
    const capped = await req(`/pro/jobs/${job.id}/quote`, { method: "POST", cookie: pro2.cookie, body: { amount: 8000, message: "I can beat that price." } });
    ok("quote cap blocks a second pro (403 quotes_full)", capped.status === 403, `HTTP ${capped.status}`);

    // Amount is optional — a message-only quote is fine (fresh job, no cap).
    const job2 = (await req("/jobs", { method: "POST", cookie: cust.cookie, body: jobBody({ title: "Second job" }) })).body;
    const noAmount = await req(`/pro/jobs/${job2.id}/quote`, { method: "POST", cookie: pro.cookie, body: { message: "Happy to help — I'd need to see it first to price it." } });
    ok("a quote with no amount is allowed (2xx)", noAmount.ok && noAmount.body?.myQuote?.amount === null, JSON.stringify(noAmount.body?.myQuote));
    const list3 = await req(`/jobs/${job2.id}/quotes`, { cookie: cust.cookie });
    ok("message-only quote shows amount: null", list3.body?.[0]?.amount === null, JSON.stringify(list3.body?.[0]));

    // Auth boundaries.
    const custQuote = await req(`/pro/jobs/${job.id}/quote`, { method: "POST", cookie: cust.cookie, body: { message: "customers can't quote" } });
    ok("a customer cannot submit a quote (401/403)", custQuote.status === 401 || custQuote.status === 403, `HTTP ${custQuote.status}`);
    const proList = await req(`/jobs/${job.id}/quotes`, { cookie: pro.cookie });
    ok("a pro cannot list a customer's quotes (401/403)", proList.status === 401 || proList.status === 403, `HTTP ${proList.status}`);
    const other = await signupCustomer();
    customers.push(other.email);
    const foreign = await req(`/jobs/${job.id}/quotes`, { cookie: other.cookie });
    ok("another customer cannot list the quotes (403/404)", foreign.status === 403 || foreign.status === 404, `HTTP ${foreign.status}`);

    // Customer hires from a quote (existing lifecycle transition).
    const hire = await req(`/jobs/${job.id}`, { method: "PATCH", cookie: cust.cookie, body: { status: "hired", hiredDriverPublicId: pro.publicId } });
    ok("customer hires the quoting pro (2xx)", hire.ok && hire.body?.status === "hired", `HTTP ${hire.status}`);

    // Cleanup.
    for (const id of [job.id, job2.id]) await req(`/jobs/${id}`, { method: "DELETE", cookie: cust.cookie });
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
  }
  return done("job-quotes");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

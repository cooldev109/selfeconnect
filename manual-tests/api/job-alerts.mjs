// Job matching + notify professionals (M1.4). When a customer posts a job, the
// matching, subscribed, opted-in professionals within range are emailed. This
// suite posts one job and asserts exactly the right pros were alerted, reading
// the mock mailer's log lines ("[mail:mock] → <email> · <subject>").
import { readFileSync } from "node:fs";
import {
  req,
  sql,
  reporter,
  signupPro,
  signupCustomer,
  delDriver,
  delCustomer,
  API_LOG,
} from "./_lib.mjs";

const logLineCount = () => readFileSync(API_LOG, "utf8").split("\n").length;
// Lines the mock mailer logged since `sinceLine` (ASCII substring matching —
// the log line "[mail:mock] → <to> · <subject>" uses unicode →/· we avoid).
const logSince = (sinceLine) =>
  readFileSync(API_LOG, "utf8").split("\n").slice(sinceLine);

// Did this pro get a new-job alert (its subject is "New <trade> job near you")?
const gotAlert = (lines, email) =>
  lines.some((l) => l.includes(email) && l.includes("job near you"));

// The alert is fired async (void) after the response, so give it a moment and
// poll until the expected recipient shows up (or we give up).
async function waitForMail(sinceLine, email, tries = 100) {
  for (let i = 0; i < tries; i++) {
    if (gotAlert(logSince(sinceLine), email)) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

export async function run() {
  const { ok, done } = reporter();
  console.log("\n── Job alerts / matching (M1.4) ──");
  const drivers = [],
    customers = [];
  try {
    const cust = await signupCustomer();
    customers.push(cust.email);

    // A matching pro: right trade, in range, active, opted in.
    const match = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(match.email);
    sql(`update "Driver" set "isActive"=true where id='${match.id}';`);

    // Wrong trade — should never be alerted to a plumbing job.
    const wrongCat = await signupPro({ categorySlugs: ["electrician"] });
    drivers.push(wrongCat.email);
    sql(`update "Driver" set "isActive"=true where id='${wrongCat.id}';`);

    // Right trade but far away (moved to Edinburgh, > 30 miles from Reading).
    const far = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(far.email);
    sql(`update "Driver" set "isActive"=true, latitude=55.9533, longitude=-3.1883 where id='${far.id}';`);

    // Right trade, in range, but opted out of job alerts.
    const optedOut = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(optedOut.email);
    sql(`update "Driver" set "isActive"=true, "notifyNewJobs"=false where id='${optedOut.id}';`);

    // Right trade, in range, opted in — but not subscribed (inactive).
    const inactive = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(inactive.email);
    // left isActive=false

    const before = logLineCount();
    const post = await req("/jobs", {
      method: "POST",
      cookie: cust.cookie,
      body: {
        categorySlug: "plumber",
        title: "Fix a leaking kitchen tap",
        description: "The mixer tap under the kitchen sink drips constantly and needs replacing.",
        postcode: "RG1 8EQ",
        contactConsent: true,
      },
    });
    ok("customer posts a plumbing job (2xx)", post.ok && !!post.body?.id, `HTTP ${post.status}`);

    // The matching pro is alerted…
    ok("matching pro is emailed a new-job alert", await waitForMail(before, match.email));
    const sent = logSince(before);
    // …and nobody who shouldn't be.
    ok("wrong-trade pro is NOT alerted", !gotAlert(sent, wrongCat.email));
    ok("out-of-range pro is NOT alerted", !gotAlert(sent, far.email));
    ok("opted-out pro is NOT alerted", !gotAlert(sent, optedOut.email));
    ok("inactive (unsubscribed) pro is NOT alerted", !gotAlert(sent, inactive.email));

    // The alert subject is the trade-specific one.
    ok(
      "alert subject names the trade",
      sent.some((l) => l.includes(match.email) && /New .*job near you/.test(l)),
      sent.find((l) => l.includes(match.email)) ?? "(no line)",
    );

    // …and the in-app "alarm" (bell) lands for the right pro only — an email
    // isn't enough, it must show in the app too.
    const jobNotifs = async (p) =>
      ((await req("/notifications", { cookie: p.cookie })).body || []).filter((n) => n.kind === "job");
    ok("matching pro gets an in-app new-job alarm", (await jobNotifs(match)).length > 0);
    ok("wrong-trade pro gets no in-app alarm", (await jobNotifs(wrongCat)).length === 0);
    ok("out-of-range pro gets no in-app alarm", (await jobNotifs(far)).length === 0);
    ok("opted-out pro gets no in-app alarm", (await jobNotifs(optedOut)).length === 0);

    // A too-short job description is rejected (min length).
    const shortDesc = await req("/jobs", {
      method: "POST",
      cookie: cust.cookie,
      body: { categorySlug: "plumber", title: "Short desc test", description: "too short", postcode: "RG1 8EQ", contactConsent: true },
    });
    ok("a too-short job description is rejected", shortDesc.status === 400, `HTTP ${shortDesc.status}`);

    if (post.body?.id) await req(`/jobs/${post.body.id}`, { method: "DELETE", cookie: cust.cookie });
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
  }
  return done("job-alerts");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

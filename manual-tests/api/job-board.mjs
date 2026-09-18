// Open job board. Every open job is visible to any professional (so the board
// is never empty); filters narrow it. Jobs in the pro's own trades are flagged
// and float to the top, but jobs in other trades are still browsable.
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
  title: "Board job",
  description: "A job posted to exercise the open professional job board and its filters.",
  postcode: "RG1 8EQ",
  contactConsent: true,
  ...over,
});

export async function run() {
  const { ok, done } = reporter();
  console.log("\n── Open job board ──");
  const drivers = [],
    customers = [];
  try {
    const cust = await signupCustomer();
    customers.push(cust.email);

    // A plumbing job (matches the pro), then a NEWER carpentry job (doesn't).
    const plumb = (await req("/jobs", { method: "POST", cookie: cust.cookie, body: jobBody({ title: "Board plumbing job", categorySlug: "plumber" }) })).body;
    const carp = (await req("/jobs", { method: "POST", cookie: cust.cookie, body: jobBody({ title: "Board carpentry job", categorySlug: "carpenter" }) })).body;

    const pro = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(pro.email);
    sql(`update "Driver" set "isActive"=true where id='${pro.id}';`);

    // --- Default view: the open board shows every trade ---
    const all = await req("/pro/jobs", { cookie: pro.cookie });
    const byId = (id) => (all.body ?? []).find((j) => j.id === id);
    ok("a plumber sees a plumbing job on the board", !!byId(plumb.id));
    ok("a plumber ALSO sees a carpentry job (open board)", !!byId(carp.id), "board should not be trade-locked");
    ok("own-trade job is flagged matchesMySkills=true", byId(plumb.id)?.matchesMySkills === true);
    ok("other-trade job is flagged matchesMySkills=false", byId(carp.id)?.matchesMySkills === false);

    // Matched jobs float to the top even though the carpentry job is newer.
    const ids = (all.body ?? []).map((j) => j.id);
    ok("own-trade job is ordered above the newer other-trade job", ids.indexOf(plumb.id) < ids.indexOf(carp.id), `plumb@${ids.indexOf(plumb.id)} carp@${ids.indexOf(carp.id)}`);

    // --- scope=mine narrows to the pro's own trades ---
    const mine = await req("/pro/jobs?scope=mine", { cookie: pro.cookie });
    const mineIds = (mine.body ?? []).map((j) => j.id);
    ok("scope=mine includes the plumbing job", mineIds.includes(plumb.id));
    ok("scope=mine excludes the carpentry job", !mineIds.includes(carp.id));

    // --- a specific trade filter can be any trade, not just the pro's ---
    const carpOnly = await req("/pro/jobs?category=carpenter", { cookie: pro.cookie });
    const carpIds = (carpOnly.body ?? []).map((j) => j.id);
    ok("category=carpenter shows the carpentry job", carpIds.includes(carp.id));
    ok("category=carpenter hides the plumbing job", !carpIds.includes(plumb.id));

    // --- 'Not interested' now works on any visible job, not just same-trade ---
    const dismiss = await req(`/pro/jobs/${carp.id}/dismiss`, { method: "POST", cookie: pro.cookie });
    ok("a pro can dismiss an other-trade job (2xx)", dismiss.ok, `HTTP ${dismiss.status}`);
    const afterDismiss = await req("/pro/jobs", { cookie: pro.cookie });
    ok("a dismissed job leaves the board", !(afterDismiss.body ?? []).some((j) => j.id === carp.id));

    // --- contact stays hidden until unlocked ---
    ok("board jobs don't leak contact before unlocking", byId(plumb.id)?.contact == null && byId(plumb.id)?.unlocked === false);

    await req(`/jobs/${plumb.id}`, { method: "DELETE", cookie: cust.cookie });
    await req(`/jobs/${carp.id}`, { method: "DELETE", cookie: cust.cookie });
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
  }
  return done("job-board");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

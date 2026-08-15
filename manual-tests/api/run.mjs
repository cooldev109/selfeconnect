// Runs every API integration suite in one process and totals the results.
//
//   node manual-tests/api/run.mjs
//   API_URL=http://localhost:4100/api/v1 node manual-tests/api/run.mjs
//
// Needs the dev API running and DB_URL reachable. These suites hit the API
// directly (no browser) and clean up every row they create.
import { run as customers } from "./customers.mjs";
import { run as pros } from "./pros.mjs";
import { run as jobs } from "./jobs.mjs";
import { run as reviews } from "./reviews.mjs";
import { run as geo } from "./geo-gate.mjs";
import { run as accountFlows } from "./account-flows.mjs";
import { run as adminCrud } from "./admin-crud.mjs";
import { run as authBoundaries } from "./auth-boundaries.mjs";
import { run as payouts } from "./payouts.mjs";
import { run as jobLifecycle } from "./job-lifecycle.mjs";
import { run as jobPhotos } from "./job-photos.mjs";
import { run as customerLowfriction } from "./customer-lowfriction.mjs";
import { run as jobAlerts } from "./job-alerts.mjs";
import { run as proOnboarding } from "./pro-onboarding.mjs";
import { run as proMyJobs } from "./pro-my-jobs.mjs";
import { run as jobQuotes } from "./job-quotes.mjs";
import { run as jobChat } from "./job-chat.mjs";
import { run as notifications } from "./notifications.mjs";
import { run as proGallery } from "./pro-gallery.mjs";
import { run as jobPayments } from "./job-payments.mjs";

const SUITES = [customers, pros, jobs, reviews, geo, accountFlows, adminCrud, authBoundaries, payouts, jobLifecycle, jobPhotos, customerLowfriction, jobAlerts, proOnboarding, proMyJobs, jobQuotes, jobChat, notifications, proGallery, jobPayments];

const results = [];
for (const suite of SUITES) {
  try {
    results.push(await suite());
  } catch (e) {
    console.error(`\n\x1b[31mSUITE CRASHED\x1b[0m: ${e.message}`);
    results.push({ name: suite.name, pass: 0, fail: 1, fails: [`crashed: ${e.message}`] });
  }
}

console.log("\n════════════ API SUITE TOTALS ════════════");
let pass = 0, fail = 0;
for (const r of results) {
  pass += r.pass; fail += r.fail;
  console.log(`  ${r.fail ? "\x1b[31m✗" : "\x1b[32m✓"}\x1b[0m ${r.name.padEnd(18)} ${r.pass}/${r.pass + r.fail}`);
  for (const f of r.fails ?? []) console.log(`      \x1b[31m- ${f}\x1b[0m`);
}
console.log(`  ${"".padEnd(18)} ─────`);
console.log(`  ${"TOTAL".padEnd(18)} ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);

// TipVan manual-test runner — drives the live deployment with a real browser
// (Playwright/Chromium) plus webhook calls, exactly as a human would click
// through the app. This is the automated form of the "manual test" gate.
//
// Usage:
//   node manual-tests/run.mjs                 # all phases
//   node manual-tests/run.mjs p3 p4           # only the named phases
//   BASE_URL=https://luxerontech.com \
//   DATABASE_URL=postgresql://tips:...@localhost:5432/tipvan_prod \
//     node manual-tests/run.mjs
//
// DATABASE_URL is optional; without it P5 is skipped and no test data is
// cleaned up. With it, P5 runs and all test rows are removed at the end.
import { chromium } from "@playwright/test";
import { BASE, hasDb, cleanup } from "./lib.mjs";
import { run as p1 } from "./p1-auth.mjs";
import { run as p2 } from "./p2-drivers.mjs";
import { run as p3 } from "./p3-billing.mjs";
import { run as p4 } from "./p4-tips.mjs";
import { run as p5 } from "./p5-webhooks.mjs";
import { run as p6 } from "./p6-dashboard.mjs";
import { run as p7 } from "./p7-account.mjs";
import { run as p8 } from "./p8-admin.mjs";

const ALL = { p1, p2, p3, p4, p5, p6, p7, p8 };
const pick = process.argv.slice(2).map((s) => s.toLowerCase());
const phases = pick.length ? pick.filter((k) => ALL[k]) : Object.keys(ALL);

console.log(`TipVan manual tests against ${BASE}  (DB: ${hasDb() ? "yes" : "no"})`);
console.log(`Phases: ${phases.join(", ")}\n`);

const browser = await chromium.launch();
const results = [];
for (const key of phases) {
  console.log(`— ${key} —`);
  try {
    results.push(await ALL[key](browser));
  } catch (e) {
    console.log("  ERROR  phase crashed :: " + (e?.message || e));
    results.push({ passed: 0, total: 1 });
  }
  console.log("");
}
await browser.close();

try {
  cleanup(["mt_"]);
  if (hasDb()) console.log(`Cleanup done. Drivers remaining = ${(await import("./lib.mjs")).sql('SELECT count(*) FROM "Driver";')}`);
} catch (e) {
  console.log("Cleanup skipped/failed: " + (e?.message || e));
}

const passed = results.reduce((a, r) => a + r.passed, 0);
const total = results.reduce((a, r) => a + r.total, 0);
console.log(`\n======== TOTAL: ${passed}/${total} passed ========`);
process.exit(passed === total ? 0 : 1);

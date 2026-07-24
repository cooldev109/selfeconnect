#!/usr/bin/env node
// Founding-member pricing — backend API test.
//
// Restarts the dev API between phases with a different FOUNDING_MEMBER_CAP so
// both sides of the boundary — places available and places gone — are
// exercised against a real database.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const API = "http://localhost:4100/api/v1";
const DB = "postgresql://tips:tips_local_dev@localhost:5432/selfeconnect_dev";
const TS = Date.now();

let pass = 0;
let fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) {
    pass++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    fail++;
    console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

const sql = (q) => execFileSync("psql", [DB, "-tAc", q], { encoding: "utf8" }).trim();

// HTTP through curl rather than fetch: the API is restarted mid-test, and
// Node's pooled keep-alive sockets hang indefinitely when one is reused across
// a restart. One curl process per request makes that impossible, and being
// synchronous it keeps the test's ordering plain to read.
const HDR = "/tmp/founding-test-headers.txt";

function req(path, { method = "GET", body, cookie } = {}) {
  const args = [
    "-s",
    "--max-time", "15",
    "-w", "\n__STATUS__%{http_code}",
    "-D", HDR,
    "-X", method,
    `${API}${path}`,
  ];
  if (body !== undefined) {
    args.push("-H", "Content-Type: application/json", "--data", JSON.stringify(body));
  }
  if (cookie) args.push("-H", `Cookie: ${cookie}`);

  let out = "";
  try {
    out = execFileSync("curl", args, { encoding: "utf8" });
  } catch (e) {
    out = String(e.stdout ?? "");
  }
  const marker = out.lastIndexOf("\n__STATUS__");
  const status = marker === -1 ? 0 : Number(out.slice(marker + 11).trim());
  const text = marker === -1 ? out : out.slice(0, marker);

  let setCookie = "";
  try {
    const m = readFileSync(HDR, "utf8").match(/^set-cookie:\s*([^;\r\n]+)/im);
    if (m) setCookie = m[1];
  } catch {
    /* no headers captured */
  }

  return {
    status,
    ok: status >= 200 && status < 300,
    body: text.trim() ? JSON.parse(text) : null,
    cookie: setCookie,
  };
}

// Restart the dev API with extra env. Mirrors /tmp/sc-dev-restart.sh.
function restart(extra = {}) {
  try {
    execFileSync("fuser", ["-k", "4100/tcp"], { stdio: "ignore" });
  } catch {
    /* nothing was listening */
  }
  execFileSync("sleep", ["2"]);
  const env = {
    ...process.env,
    DATABASE_URL: `${DB}?schema=public`,
    JWT_SECRET: "devsecret_phase1_testing_only_000000000000000000000000",
    PORT: "4100",
    CORS_ORIGIN: "http://localhost:3100",
    PUBLIC_URL: "http://localhost:4100",
    UPLOAD_DIR: "/tmp/sc-dev-uploads",
    ...extra,
  };
  execFileSync(
    "bash",
    [
      "-c",
      "cd /root/projects/blank-phase1/backend && nohup node dist/main.js > /tmp/sc-dev-api.log 2>&1 < /dev/null & disown; exit 0",
    ],
    { env, stdio: "ignore" },
  );
  for (let i = 0; i < 40; i++) {
    if (req("/health").ok) return;
    execFileSync("sleep", ["1"]);
  }
  throw new Error("dev API never became healthy");
}

function signup(tag) {
  const email = `founding_${tag}_${TS}@example.com`;
  const res = req("/auth/signup", {
    method: "POST",
    body: {
      name: `Founding Test ${tag}`,
      email,
      password: "TestPass123!",
      postcode: "RG1 8EQ",
      categorySlugs: ["plumber"],
    },
  });
  if (!res.ok) throw new Error(`signup ${tag} failed: ${JSON.stringify(res.body)}`);
  return { email, cookie: res.cookie };
}

const login = (email) =>
  req("/auth/login", { method: "POST", body: { email, password: "TestPass123!" } });

const checkout = (cookie) => req("/subscription/checkout", { method: "POST", cookie });
const account = (cookie) => req("/me/account", { cookie }).body;
const pricing = () => req("/pricing").body;

const claimed = () =>
  Number(
    sql(
      `select count(*) from "Driver" where "foundingMember" and "subscriptionStatus" <> 'none';`,
    ),
  );
const isFounding = (email) =>
  sql(`select "foundingMember" from "Driver" where email = '${email}';`) === "t";

const created = [];

try {
  const claimedBefore = claimed();
  console.log(`\nBaseline: ${claimedBefore} founding places already claimed`);

  // ── Phase 1: founding places still available ──────────────────────
  console.log("\nPhase 1 — places available (cap = claimed + 40)");
  restart({ FOUNDING_MEMBER_CAP: String(claimedBefore + 40) });

  let p = pricing();
  ok("GET /pricing needs no auth", p !== null);
  ok("founding rate is offered", p.founding === true, JSON.stringify(p));
  ok("price is £5.49", p.amountGbp === 5.49, String(p.amountGbp));
  ok("standard rate advertised as £9.49", p.standardAmountGbp === 9.49);
  ok("cap is reported", p.foundingCap === claimedBefore + 40, String(p.foundingCap));
  ok("places left hidden while plenty remain", p.spotsLeft === null, `got ${p.spotsLeft}`);

  const a = signup("a");
  created.push(a.email);
  ok("new pro is not a founding member before checkout", !isFounding(a.email));

  const co = checkout(a.cookie);
  ok("checkout starts", co.ok, `HTTP ${co.status}`);
  ok("starting checkout claims a founding place", isFounding(a.email));

  let acc = account(a.cookie);
  ok("account reports £5.49", acc.priceGbp === 5.49, String(acc.priceGbp));
  ok("account flags founding member", acc.foundingMember === true);

  ok(
    "abandoned checkout does not consume a place",
    claimed() === claimedBefore,
    `${claimedBefore} → ${claimed()}`,
  );

  // Simulate the webhook completing the subscription.
  sql(
    `update "Driver" set "subscriptionStatus" = 'active', "isActive" = true where email = '${a.email}';`,
  );
  const claimedLive = claimed();
  ok(
    "a completed subscription consumes a place",
    claimedLive === claimedBefore + 1,
    `${claimedBefore} → ${claimedLive}`,
  );

  // ── Phase 2: the counter appears only once it is low ──────────────
  console.log("\nPhase 2 — few places left (cap = claimed + 5)");
  restart({ FOUNDING_MEMBER_CAP: String(claimedLive + 5) });
  p = pricing();
  ok("places left shown once low", p.spotsLeft === 5, `got ${p.spotsLeft}`);
  ok("still on the founding rate", p.founding === true && p.amountGbp === 5.49);

  // ── Phase 3: founding places gone ────────────────────────────────
  console.log("\nPhase 3 — places gone (cap = claimed)");
  restart({ FOUNDING_MEMBER_CAP: String(claimedLive) });

  p = pricing();
  ok("founding rate no longer offered", p.founding === false, JSON.stringify(p));
  ok("price is now £9.49", p.amountGbp === 9.49, String(p.amountGbp));
  ok("places left is null when there are none", p.spotsLeft === null);

  const b = signup("b");
  created.push(b.email);
  const cob = checkout(b.cookie);
  ok("later pro can still check out", cob.ok, `HTTP ${cob.status}`);
  ok("later pro does not become a founding member", !isFounding(b.email));
  const accB = account(b.cookie);
  ok("later pro is charged £9.49", accB.priceGbp === 9.49, String(accB.priceGbp));
  ok("later pro has no founding badge", accB.foundingMember === false);

  // The whole point of the offer: existing members keep their rate.
  const loginA = login(a.email);
  acc = account(loginA.cookie);
  ok(
    "existing founding member keeps £5.49 after places run out",
    acc.priceGbp === 5.49 && acc.foundingMember === true,
    JSON.stringify(acc),
  );

  // A returning founding member must not be re-priced at the standard rate.
  sql(
    `update "Driver" set "subscriptionStatus" = 'canceled', "isActive" = false where email = '${a.email}';`,
  );
  const reco = checkout(loginA.cookie);
  ok("cancelled founding member can resubscribe", reco.ok, `HTTP ${reco.status}`);
  ok("…and keeps their founding rate", account(loginA.cookie).priceGbp === 5.49);

  // ── Phase 4: revenue is summed per member, not per headcount ──────
  console.log("\nPhase 4 — admin revenue");
  sql(
    `update "Driver" set "subscriptionStatus" = 'active', "isActive" = true where email in ('${a.email}','${b.email}');`,
  );
  const [f, s] = sql(
    `select count(*) filter (where "foundingMember"), count(*) filter (where not "foundingMember") from "Driver" where "isActive";`,
  )
    .split("|")
    .map(Number);
  const expected = Math.round((f * 5.49 + s * 9.49) * 100) / 100;

  // Dev has no seeded admin, so borrow one for the length of this check —
  // it is deleted with the rest of the test accounts below. Promoting after
  // signup also keeps it out of the active-subscriber counts above.
  const adm = signup("admin");
  created.push(adm.email);
  sql(`update "Driver" set role = 'admin' where email = '${adm.email}';`);
  const adminLogin = login(adm.email);
  ok("promoted admin can log in", adminLogin.ok, `HTTP ${adminLogin.status}`);

  const ovRes = req("/admin/overview", { cookie: adminLogin.cookie });
  ok("admin overview is reachable", ovRes.ok, `HTTP ${ovRes.status}`);
  ok(
    `revenue mixes both rates (${f}×£5.49 + ${s}×£9.49 = £${expected})`,
    ovRes.body?.platformRevenue === expected,
    `got ${ovRes.body?.platformRevenue}`,
  );
} finally {
  for (const email of created) sql(`delete from "Driver" where email = '${email}';`);
  console.log(`\nCleaned up ${created.length} test professionals`);
  restart();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

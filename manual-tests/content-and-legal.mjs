#!/usr/bin/env node
// Content & legal — manual (browser) test.
//
// Covers the client-facing copy shipped this cycle: the rewritten About page,
// the "About SelfeConnect" top-nav link, and the SELFECONNECT LTD business
// details now in the Terms and Privacy pages. Pure content, no DB writes, so
// it is safe to point at production.
//
//   node manual-tests/content-and-legal.mjs                     # dev :3100
//   BASE=https://selfeconnect.com node manual-tests/content-and-legal.mjs

import { chromium } from "@playwright/test";

const BASE = (process.env.BASE ?? "http://localhost:3100").replace(/\/+$/, "");

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

// The exact registered-company wording the client supplied.
const COMPANY = {
  name: "SELFECONNECT LTD",
  number: "17367516",
  office: "66 Paul Street, London, EC2A 4NA",
  jurisdiction: "registered in England and Wales",
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  console.log(`\nAbout page — ${BASE}/about`);
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle" });
  const about = await page.locator("article").innerText();
  ok("headline is the client's thesis", /Built for professionals\. Powered by community\./.test(about));
  ok("origin paragraph (lead fees / commissions)", /expensive lead fees, high commissions/.test(about));
  ok("'better way' line", /We believed there had to be a better way\./.test(about));
  ok("what-we-built paragraph", /simple, fair and affordable platform/.test(about));
  ok("mission paragraph", /UK's largest community of self-employed professionals/.test(about));
  ok("closing line", /And we're only getting started\./.test(about));
  ok("old placeholder copy is gone", !/Recognition and reward/.test(about));

  console.log("\nTop navigation");
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const nav = page.locator("header nav");
  const navText = await nav.innerText();
  ok("nav lists About SelfeConnect", /About SelfeConnect/.test(navText));
  ok("nav keeps the existing items", /For customers/.test(navText) && /For professionals/.test(navText) && /Pricing/.test(navText));
  await nav.getByRole("link", { name: "About SelfeConnect" }).click();
  await page.waitForURL(/\/about$/, { timeout: 8000 });
  ok("nav link navigates to /about", /\/about$/.test(page.url()));

  console.log(`\nTerms — ${BASE}/terms`);
  await page.goto(`${BASE}/terms`, { waitUntil: "networkidle" });
  const terms = await page.locator("article").innerText();
  ok("names the operating company", terms.includes(COMPANY.name));
  ok("states the jurisdiction", terms.includes(COMPANY.jurisdiction));
  ok("gives the company number", terms.includes(COMPANY.number));
  ok("gives the registered office", terms.includes(COMPANY.office));
  ok("calls it a limited company", /We are a limited company\./.test(terms));
  ok("§3 keeps the founding-member pricing", /founding-member rate of £5\.49/.test(terms) && /£9\.49 per month/.test(terms));
  ok("last-updated is 28 July 2026", /Last updated:\s*28 July 2026/.test(terms));

  console.log(`\nPrivacy — ${BASE}/privacy`);
  await page.goto(`${BASE}/privacy`, { waitUntil: "networkidle" });
  const privacy = await page.locator("article").innerText();
  ok("names the operating company", privacy.includes(COMPANY.name));
  ok("states the jurisdiction", privacy.includes(COMPANY.jurisdiction));
  ok("gives the company number", privacy.includes(COMPANY.number));
  ok("gives the registered office", privacy.includes(COMPANY.office));
  // The pronoun definition should live only in the new company paragraph — the
  // old paragraph's redundant copy was removed. Count is quote-style agnostic
  // (the page uses curly quotes; a straight-quote class would miss them).
  const pronounDefs = (privacy.match(/[“”"']we[“”"'], [“”"']us[“”"'], or [“”"']our[“”"']/g) || []).length;
  ok(
    "defines 'we / us / our' exactly once (no duplication)",
    pronounDefs === 1,
    "found " + pronounDefs,
  );
  ok("still explains data controller role", /data controller/.test(privacy));
  ok("last-updated is 28 July 2026", /Last updated:\s*28 July 2026/.test(privacy));

  console.log("\nFooter legal links resolve");
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  for (const [label, re] of [
    ["Terms", /\/terms$/],
    ["Privacy", /\/privacy$/],
  ]) {
    const link = page.locator("footer").getByRole("link", { name: new RegExp(label, "i") }).first();
    const href = await link.getAttribute("href");
    ok(`footer link "${label}" points at the right route`, re.test(href ?? ""), href ?? "(no href)");
  }
} finally {
  await browser.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

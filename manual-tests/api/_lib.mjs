// Shared helpers for the SelfeConnect API integration suites.
//
// These hit the running dev API directly (no browser), so they are fast and
// deterministic. Every entity is uniquely named and torn down; suites assert
// their OWN contribution, never global totals, so they are isolation-safe.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import zlib from "node:zlib";

export const API = process.env.API_URL ?? "http://localhost:4100/api/v1";
const DB = process.env.DB_URL ?? "postgresql://tips:tips_local_dev@localhost:5432/selfeconnect_dev";
export const API_LOG = process.env.API_LOG ?? "/tmp/sc-dev-api.log";

export const sql = (q) => execFileSync("psql", [DB, "-tAc", q], { encoding: "utf8" }).trim();

// Smallest valid PNG (1x1) — enough for endpoints that only need image bytes.
export const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

// A real, decodable PNG (solid teal). The driver photo pipeline resizes with
// `cover`, which a 1x1 image makes sharp reject — so give it something bigger.
function makePng(size = 64) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3)]);
  for (let x = 0; x < size; x++) {
    row[1 + x * 3] = 0x1d;
    row[2 + x * 3] = 0x9e;
    row[3 + x * 3] = 0x75;
  }
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
export const PNG_64 = makePng(64);

export async function req(path, { method = "GET", body, cookie, headers = {} } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
  const sc = res.headers.get("set-cookie");
  return { status: res.status, ok: res.ok, body: json, text, cookie: sc ? sc.split(";")[0] : "" };
}

let seq = 0;
const STAMP = Date.now();
export const uniqEmail = (p) => `mt_${p}_${STAMP}_${seq++}@example.com`;

export function reporter() {
  let pass = 0, fail = 0;
  const fails = [];
  const ok = (label, cond, detail = "") => {
    if (cond) { pass++; console.log(`  \x1b[32m✓\x1b[0m ${label}`); }
    else { fail++; fails.push(label + (detail ? ` — ${detail}` : "")); console.log(`  \x1b[31m✗\x1b[0m ${label}${detail ? ` — ${detail}` : ""}`); }
  };
  const done = (name) => ({ name, pass, fail, fails });
  return { ok, done };
}

// A professional account, already signed in. The API signup DTO is lighter
// than the web form (no phone/photo required).
export async function signupPro(opts = {}) {
  const email = uniqEmail("pro");
  const r = await req("/auth/signup", {
    method: "POST",
    body: { name: "MT Pro", email, password: "TestPass123!", postcode: "RG1 8EQ", categorySlugs: ["plumber"], ...opts },
  });
  if (!r.ok) throw new Error("signupPro failed: " + JSON.stringify(r.body));
  const id = sql(`select id from "Driver" where email='${email}';`);
  const publicId = sql(`select "publicId" from "Driver" where email='${email}';`);
  return { email, id, publicId, cookie: r.cookie };
}

// A customer account, already signed in.
export async function signupCustomer(opts = {}) {
  const email = uniqEmail("cust");
  const r = await req("/customer/auth/signup", {
    method: "POST",
    body: { name: "MT Cust", email, password: "TestPass123!", phone: "+44 7700 900000", ...opts },
  });
  if (!r.ok) throw new Error("signupCustomer failed: " + JSON.stringify(r.body));
  const id = sql(`select id from "Customer" where email='${email}';`);
  return { email, id, cookie: r.cookie };
}

// Promote a fresh professional to admin (the guard reads role per request).
export async function makeAdmin() {
  const a = await signupPro();
  sql(`update "Driver" set role='admin' where id='${a.id}';`);
  return a;
}

// Pull the most recent mock-mailer action link (reset / verify) for an address
// out of the API log, so happy-path token flows can be completed.
export function lastMailLinkFor(kind /* 'reset-password' | 'verify-email' */, sinceLine = 0) {
  const lines = readFileSync(API_LOG, "utf8").split("\n").slice(sinceLine);
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = new RegExp(`${kind}\\?token=([^"\\s]+)`).exec(lines[i]);
    if (m) return m[1];
  }
  return null;
}
export const apiLogLineCount = () => readFileSync(API_LOG, "utf8").split("\n").length;

export const delDriver = (email) => sql(`delete from "Driver" where email='${email}';`);
export const delCustomer = (email) => sql(`delete from "Customer" where email='${email}';`);

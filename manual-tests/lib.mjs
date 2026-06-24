// Shared helpers for TipVan manual (end-to-end) tests against a live deployment.
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import zlib from "node:zlib";

export const BASE = process.env.BASE_URL || "https://luxerontech.com";
export const API = BASE + "/api/v1";
const DB = process.env.DATABASE_URL || "";

// --- tiny test reporter ---
export function reporter() {
  const rows = [];
  return {
    async step(name, fn) {
      try {
        await fn();
        rows.push({ name, ok: true });
        console.log("  PASS  " + name);
      } catch (e) {
        rows.push({ name, ok: false, err: (e?.message || String(e)).split("\n")[0] });
        console.log("  FAIL  " + name + "  ::  " + (e?.message || "").split("\n")[0]);
      }
    },
    summary(label) {
      const passed = rows.filter((r) => r.ok).length;
      console.log(`\n==== ${label}: ${passed}/${rows.length} passed ====`);
      return { passed, total: rows.length, rows };
    },
  };
}

// --- DB access (optional; only needed for webhook/internal-id + cleanup) ---
export const hasDb = () => Boolean(DB);
export function sql(query) {
  if (!DB) throw new Error("DATABASE_URL not set — DB-dependent step skipped");
  return execSync(`psql "${DB}" -t -A -c ${JSON.stringify(query)}`).toString().trim();
}

// --- HTTP / webhook helper ---
export function webhook(event) {
  return fetch(API + "/stripe/webhook", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(event),
  }).then((r) => r.json());
}

// Build a real, decodable PNG (solid teal, 64x64 RGB) so the backend's sharp
// pipeline accepts it — tiny 1x1/2x2 PNGs make sharp throw 'invalid_image'.
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
  // rows: each prefixed with filter byte 0, then size*3 RGB bytes (teal)
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3).fill(0)]);
  for (let x = 0; x < size; x++) {
    row[1 + x * 3] = 0x1d; // R
    row[2 + x * 3] = 0x9e; // G
    row[3 + x * 3] = 0x75; // B
  }
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
export function writeTestPng(path = "/tmp/tipvan-test.png") {
  writeFileSync(path, makePng());
  return path;
}

let seq = 0;
const stamp = Date.now();
export const uniqueEmail = (prefix) => `${prefix}_${stamp}_${seq++}@example.com`;
export const eventId = () => `evt_mt_${stamp}_${seq++}`;

// Sign up a driver through the real UI; returns the page (left on /dashboard).
export async function signupDriver(ctx, { email, name = "MT Driver", photo }) {
  const p = await ctx.newPage();
  await p.goto(BASE + "/signup", { waitUntil: "networkidle" });
  await p.setInputFiles('input[type="file"]', photo);
  await p.getByPlaceholder("Jane Doe").fill(name);
  await p.getByPlaceholder("you@example.com").fill(email);
  await p.getByPlaceholder("+44 7700 900000").fill("+44 7700 900000");
  await p.getByPlaceholder("At least 8 characters").fill("supersecret");
  await p.getByRole("button", { name: /Create account/i }).click();
  await p.waitForURL(/\/dashboard$/, { timeout: 20000 });
  return p;
}

// Remove all test rows created by these suites. No-op if DATABASE_URL unset.
export function cleanup(prefixes = ["mt_"]) {
  if (!DB) return;
  const like = prefixes.map((p) => `d.email LIKE '${p}%'`).join(" OR ");
  const likeD = prefixes.map((p) => `email LIKE '${p}%'`).join(" OR ");
  sql(`DELETE FROM "Tip" t USING "Driver" d WHERE t."driverId"=d.id AND (${like});`);
  sql(`DELETE FROM "Driver" WHERE ${likeD};`);
  sql(`DELETE FROM "WebhookEvent" WHERE id LIKE 'evt_mt_%';`);
}

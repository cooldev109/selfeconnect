// Verification system (M3.1). A professional verifies phone + submits
// document-backed checks (identity / insurance / qualification); an admin
// approves or rejects them; approved checks become granular badges on the
// public profile and in search. Covers state, phone OTP, document upload,
// private-document access control, the admin review queue, expiry, and
// rejection.
import {
  API,
  req,
  sql,
  reporter,
  signupPro,
  signupCustomer,
  makeAdmin,
  delDriver,
  delCustomer,
} from "./_lib.mjs";

// The service stores the bytes as-is (no parsing), so any application/pdf
// payload exercises the PDF path.
const PDF = Buffer.from("%PDF-1.4\n% selfeconnect test verification document\n");

async function upload(cookie, type, { file = true, fields = {} } = {}) {
  const form = new FormData();
  if (file) form.append("file", new Blob([PDF], { type: "application/pdf" }), "doc.pdf");
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  const res = await fetch(`${API}/me/verification/${type}/document`, {
    method: "POST",
    headers: cookie ? { cookie } : {},
    body: form,
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
  return { status: res.status, ok: res.ok, body };
}

export async function run() {
  const { ok, done } = reporter();
  console.log("\n── Verification system (M3.1) ──");
  const drivers = [], customers = [];
  try {
    const pro = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(pro.email);
    sql(`update "Driver" set "isActive"=true where id='${pro.id}';`);

    // --- initial state ---
    const s0 = await req("/me/verification", { cookie: pro.cookie });
    ok("verification state loads for a pro", s0.ok && !!s0.body?.email && !!s0.body?.identity, `HTTP ${s0.status}`);
    ok("email starts unverified", s0.body?.email?.verified === false);
    ok("phone starts unverified", s0.body?.phone?.verified === false);
    ok("identity starts 'none'", s0.body?.identity?.status === "none");
    ok("no badges yet", s0.body?.badges?.verifiedPro === false && s0.body?.badges?.identity === false);

    const anon = await req("/me/verification", {});
    ok("anonymous can't read verification state (401)", anon.status === 401, `HTTP ${anon.status}`);

    // --- email resend ---
    const er = await req("/me/verification/email/resend", { method: "POST", cookie: pro.cookie });
    ok("email verification resend ok", er.ok && er.body?.ok === true, `HTTP ${er.status}`);

    // --- phone OTP ---
    const p0 = await req("/me/verification/phone/start", { method: "POST", cookie: pro.cookie, body: { phone: "+44 7700 900123" } });
    ok("phone start returns a 6-digit dev code (mock)", p0.ok && /^\d{6}$/.test(p0.body?.devCode ?? ""), `HTTP ${p0.status} ${JSON.stringify(p0.body)}`);
    const code = p0.body.devCode;
    const wrong = code === "000000" ? "111111" : "000000";
    const pbad = await req("/me/verification/phone/confirm", { method: "POST", cookie: pro.cookie, body: { code: wrong } });
    ok("wrong phone code rejected (400)", pbad.status === 400, `HTTP ${pbad.status}`);
    const pconf = await req("/me/verification/phone/confirm", { method: "POST", cookie: pro.cookie, body: { code } });
    ok("correct phone code verifies", pconf.ok && pconf.body?.verified === true, `HTTP ${pconf.status}`);
    const s1 = await req("/me/verification", { cookie: pro.cookie });
    ok("state + badge show phone verified", s1.body?.phone?.verified === true && s1.body?.badges?.phone === true);

    // --- identity document submission ---
    const missing = await upload(pro.cookie, "identity", { file: false });
    ok("identity upload with no file rejected (400)", missing.status === 400, `HTTP ${missing.status}`);
    const badType = await upload(pro.cookie, "nonsense");
    ok("unknown verification type rejected (400)", badType.status === 400, `HTTP ${badType.status}`);
    const idUp = await upload(pro.cookie, "identity", { fields: { reference: "Passport" } });
    ok("identity document submits → pending", idUp.ok && idUp.body?.status === "pending", `HTTP ${idUp.status} ${JSON.stringify(idUp.body)}`);
    const s2 = await req("/me/verification", { cookie: pro.cookie });
    ok("state shows identity pending + hasDocument", s2.body?.identity?.status === "pending" && s2.body?.identity?.hasDocument === true);

    // owner can stream their own private document
    const ownDoc = await fetch(`${API}/me/verification/identity/document`, { headers: { cookie: pro.cookie } });
    ok("owner streams their own document (200 pdf)", ownDoc.status === 200 && (ownDoc.headers.get("content-type") ?? "").includes("pdf"), `HTTP ${ownDoc.status}`);

    // --- admin review queue ---
    const admin = await makeAdmin();
    drivers.push(admin.email);
    const forbQueue = await req("/admin/verifications", { cookie: pro.cookie });
    ok("non-admin can't see the review queue (403)", forbQueue.status === 403, `HTTP ${forbQueue.status}`);
    const queue = await req("/admin/verifications?status=pending", { cookie: admin.cookie });
    const sub = (queue.body ?? []).find((v) => v.driver?.publicId === pro.publicId && v.type === "identity");
    ok("admin sees this submission in the pending queue", queue.ok && !!sub, `HTTP ${queue.status}`);

    const forbApprove = await req(`/admin/verifications/${sub.id}/approve`, { method: "POST", cookie: pro.cookie });
    ok("non-admin can't approve (403)", forbApprove.status === 403, `HTTP ${forbApprove.status}`);

    const appr = await req(`/admin/verifications/${sub.id}/approve`, { method: "POST", cookie: admin.cookie });
    ok("admin approves identity", appr.ok && appr.body?.status === "verified", `HTTP ${appr.status}`);
    const s3 = await req("/me/verification", { cookie: pro.cookie });
    ok("identity verified → verifiedPro + identity badges", s3.body?.identity?.status === "verified" && s3.body?.badges?.verifiedPro === true && s3.body?.badges?.identity === true);
    ok("legacy Driver.verified mirrored true", sql(`select verified from "Driver" where id='${pro.id}';`) === "t");

    const notif = await req("/notifications", { cookie: pro.cookie });
    ok("pro is notified of the verification decision", notif.ok && (notif.body ?? []).some((n) => n.kind === "verification"));

    const admDoc = await fetch(`${API}/admin/verifications/${sub.id}/document`, { headers: { cookie: admin.cookie } });
    ok("admin streams the document (200)", admDoc.status === 200, `HTTP ${admDoc.status}`);

    // M3.2 admin control centre: overview surfaces the pending count, and the
    // quotes list is admin-only.
    const ov = await req("/admin/overview", { cookie: admin.cookie });
    ok("admin overview reports pendingVerifications", ov.ok && typeof ov.body?.pendingVerifications === "number", `HTTP ${ov.status}`);
    const quotesList = await req("/admin/quotes", { cookie: admin.cookie });
    ok("admin quotes list returns an array", quotesList.ok && Array.isArray(quotesList.body), `HTTP ${quotesList.status}`);
    const forbQuotes = await req("/admin/quotes", { cookie: pro.cookie });
    ok("non-admin can't list quotes (403)", forbQuotes.status === 403, `HTTP ${forbQuotes.status}`);

    // badge surfaces on the public profile + in search
    const cust = await signupCustomer();
    customers.push(cust.email);
    const pub = await req(`/pros/${pro.publicId}`, { cookie: cust.cookie });
    ok("public profile exposes verifiedPro badge", pub.ok && pub.body?.badges?.verifiedPro === true, `HTTP ${pub.status} ${JSON.stringify(pub.body?.badges)}`);
    const search = await req(`/pros?category=plumber&postcode=RG1 8EQ&radius=100`, { cookie: cust.cookie });
    const inSearch = (search.body ?? []).find((r) => r.publicId === pro.publicId);
    ok("search results carry the badge set", search.ok && inSearch?.badges?.verifiedPro === true, `HTTP ${search.status}`);

    // --- insurance with expiry (live badge with a date; expired drops it) ---
    const insUp = await upload(pro.cookie, "insurance", { fields: { label: "Public liability £2m", expiresAt: "2030-01-01" } });
    ok("insurance submits with an expiry", insUp.ok && insUp.body?.status === "pending");
    const insSub = (await req("/admin/verifications?status=pending", { cookie: admin.cookie })).body.find((v) => v.driver?.publicId === pro.publicId && v.type === "insurance");
    await req(`/admin/verifications/${insSub.id}/approve`, { method: "POST", cookie: admin.cookie });
    const s4 = await req("/me/verification", { cookie: pro.cookie });
    ok("insurance badge is live with an expiry date", s4.body?.badges?.insurance === true && !!s4.body?.badges?.insuranceExpiresAt);
    sql(`update "Verification" set "expiresAt"='2000-01-01' where "driverId"='${pro.id}' and type='insurance';`);
    const s5 = await req("/me/verification", { cookie: pro.cookie });
    ok("expired insurance no longer badges", s5.body?.badges?.insurance === false);

    // --- rejection (qualification) ---
    await upload(pro.cookie, "qualification", { fields: { label: "Gas Safe" } });
    const qSub = (await req("/admin/verifications?status=pending", { cookie: admin.cookie })).body.find((v) => v.driver?.publicId === pro.publicId && v.type === "qualification");
    const rej = await req(`/admin/verifications/${qSub.id}/reject`, { method: "POST", cookie: admin.cookie, body: { notes: "Certificate unreadable" } });
    ok("admin rejects qualification with a note", rej.ok && rej.body?.status === "rejected", `HTTP ${rej.status}`);
    const s6 = await req("/me/verification", { cookie: pro.cookie });
    ok("state shows rejection + reviewer notes, no badge", s6.body?.qualification?.status === "rejected" && s6.body?.qualification?.reviewerNotes === "Certificate unreadable" && s6.body?.badges?.qualification === false);
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
  }
  return done("verification");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

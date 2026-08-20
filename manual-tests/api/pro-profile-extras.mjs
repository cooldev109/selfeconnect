// Ruan feedback #11 + #14: professional social links save + surface on the
// public profile, and re-submitting a verification document (the "replace"
// option) sends an already-verified check back to review.
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

const PDF = Buffer.from("%PDF-1.4 selfeconnect extras test");
async function uploadDoc(cookie, type, fields = {}) {
  const form = new FormData();
  form.append("file", new Blob([PDF], { type: "application/pdf" }), "doc.pdf");
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  const res = await fetch(`${API}/me/verification/${type}/document`, {
    method: "POST",
    headers: cookie ? { cookie } : {},
    body: form,
  });
  return res.ok;
}

export async function run() {
  const { ok, done } = reporter();
  console.log("\n── Pro profile extras: social links + doc replace ──");
  const drivers = [], customers = [];
  try {
    const pro = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(pro.email);
    sql(`update "Driver" set "isActive"=true where id='${pro.id}';`);

    // #11 — save social links
    const patch = await req("/me", { method: "PATCH", cookie: pro.cookie, body: { website: "https://acme.co", instagram: "https://instagram.com/acme", facebook: "", tiktok: "https://tiktok.com/@acme", linkedin: "" } });
    ok("PATCH /me saves social links", patch.ok && patch.body?.socials?.website === "https://acme.co" && (patch.body?.socials?.instagram ?? "").includes("instagram"), JSON.stringify(patch.body?.socials));
    const me = await req("/me", { cookie: pro.cookie });
    ok("GET /me returns the saved socials", (me.body?.socials?.tiktok ?? "").includes("tiktok"));
    ok("an empty social link is cleared", me.body?.socials?.facebook === "");

    // public profile exposes socials
    const cust = await signupCustomer();
    customers.push(cust.email);
    const pub = await req(`/pros/${pro.publicId}`, { cookie: cust.cookie });
    ok("public profile exposes the social links", pub.ok && pub.body?.socials?.website === "https://acme.co", JSON.stringify(pub.body?.socials));

    // #14 — replacing a verified document sends it back to review
    const admin = await makeAdmin();
    drivers.push(admin.email);
    await uploadDoc(pro.cookie, "identity", { reference: "Passport" });
    const sub = (await req("/admin/verifications?status=pending", { cookie: admin.cookie })).body.find((v) => v.driver.publicId === pro.publicId);
    await req(`/admin/verifications/${sub.id}/approve`, { method: "POST", cookie: admin.cookie });
    let st = await req("/me/verification", { cookie: pro.cookie });
    ok("identity is verified after approval", st.body?.identity?.status === "verified");
    await uploadDoc(pro.cookie, "identity", { reference: "Renewed Passport" });
    st = await req("/me/verification", { cookie: pro.cookie });
    ok("re-submitting a verified doc goes back to 'pending' (replace)", st.body?.identity?.status === "pending", st.body?.identity?.status);
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
  }
  return done("pro-profile-extras");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

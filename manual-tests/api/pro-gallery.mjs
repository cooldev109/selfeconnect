// Rich pro profiles — work gallery (M2.4). A professional uploads photos of
// past work; they appear on /me and on their public profile, can be removed,
// are capped, and the endpoints are guarded.
import {
  API,
  req,
  sql,
  reporter,
  signupPro,
  signupCustomer,
  delDriver,
  delCustomer,
  PNG_64,
} from "./_lib.mjs";

async function uploadGallery(cookie, { withFile = true } = {}) {
  const form = new FormData();
  if (withFile) form.append("file", new Blob([PNG_64], { type: "image/png" }), "work.png");
  const res = await fetch(API + "/me/gallery", {
    method: "POST",
    headers: cookie ? { cookie } : {},
    body: form,
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON */
  }
  return { status: res.status, ok: res.ok, body };
}

export async function run() {
  const { ok, done } = reporter();
  console.log("\n── Pro work gallery (M2.4) ──");
  const drivers = [],
    customers = [];
  try {
    const pro = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(pro.email);
    sql(`update "Driver" set "isActive"=true where id='${pro.id}';`);

    // Fresh pro has an empty gallery.
    const me0 = await req("/me", { cookie: pro.cookie });
    ok("new pro has an empty gallery", Array.isArray(me0.body?.galleryPhotos) && me0.body.galleryPhotos.length === 0);

    // Anonymous can't upload.
    const anon = await uploadGallery("");
    ok("anonymous can't add a gallery photo (401)", anon.status === 401, `HTTP ${anon.status}`);

    // Upload two photos.
    const up1 = await uploadGallery(pro.cookie);
    ok("pro adds a gallery photo (2xx)", up1.ok && up1.body?.galleryPhotos?.length === 1, `HTTP ${up1.status} ${JSON.stringify(up1.body?.galleryPhotos)}`);
    const url1 = up1.body.galleryPhotos[0];
    ok("gallery url is a served webp", /\/uploads\/gallery_.*\.webp$/.test(url1), url1);
    const served = await fetch(url1);
    ok("gallery photo serves (200) as an image", served.status === 200 && (served.headers.get("content-type") ?? "").startsWith("image/"), `HTTP ${served.status}`);

    const up2 = await uploadGallery(pro.cookie);
    ok("second photo appends (length 2)", up2.body?.galleryPhotos?.length === 2);

    // Missing file → 400.
    const noFile = await uploadGallery(pro.cookie, { withFile: false });
    ok("upload with no file is rejected (400)", noFile.status === 400, `HTTP ${noFile.status}`);

    // Shows on the public profile.
    const cust = await signupCustomer();
    customers.push(cust.email);
    const pub = await req(`/pros/${pro.publicId}`, { cookie: cust.cookie });
    ok("public profile exposes the gallery (2 photos)", pub.ok && (pub.body?.galleryPhotos ?? []).length === 2, `HTTP ${pub.status} ${JSON.stringify(pub.body?.galleryPhotos)}`);

    // Remove one.
    const rem = await req("/me/gallery/remove", { method: "POST", cookie: pro.cookie, body: { url: url1 } });
    ok("pro removes a gallery photo (length 1)", rem.ok && rem.body?.galleryPhotos?.length === 1 && !rem.body.galleryPhotos.includes(url1), JSON.stringify(rem.body?.galleryPhotos));
    const remNoUrl = await req("/me/gallery/remove", { method: "POST", cookie: pro.cookie, body: {} });
    ok("remove with no url is rejected (400)", remNoUrl.status === 400, `HTTP ${remNoUrl.status}`);

    // Cap: fill to 12 (via DB) then the next upload is refused.
    const twelve = Array.from({ length: 12 }, (_, i) => `https://x/gallery_${i}.webp`);
    sql(`update "Driver" set "galleryPhotos"=ARRAY[${twelve.map((u) => `'${u}'`).join(",")}]::text[] where id='${pro.id}';`);
    const overCap = await uploadGallery(pro.cookie);
    ok("gallery cap blocks the 13th photo (400)", overCap.status === 400, `HTTP ${overCap.status} ${JSON.stringify(overCap.body)}`);
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
  }
  return done("pro-gallery");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

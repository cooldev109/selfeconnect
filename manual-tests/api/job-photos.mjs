// Post-a-Job wizard backend (M1.2): job photo upload + creating a job with
// photos and a "timing" phrase. Covers the auth boundary on the upload
// endpoint, validation, that the stored URL actually serves, and that the
// create payload persists photos + timing and reads them back.
import {
  API,
  req,
  sql,
  reporter,
  signupPro,
  signupCustomer,
  delDriver,
  delCustomer,
  PNG_1PX,
} from "./_lib.mjs";

// Multipart upload — `req` only speaks JSON, so post the file directly.
async function uploadPhoto(cookie, { withFile = true } = {}) {
  const form = new FormData();
  if (withFile) {
    form.append("file", new Blob([PNG_1PX], { type: "image/png" }), "job.png");
  }
  const res = await fetch(API + "/jobs/photo", {
    method: "POST",
    headers: cookie ? { cookie } : {},
    body: form,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON */
  }
  return { status: res.status, ok: res.ok, body: json };
}

const jobBody = (over = {}) => ({
  categorySlug: "plumber",
  title: "Fix a leaking kitchen tap",
  description: "The mixer tap under the kitchen sink drips constantly and needs replacing.",
  postcode: "RG1 8EQ",
  contactConsent: true,
  ...over,
});

export async function run() {
  const { ok, done } = reporter();
  console.log("\n── Job photos + wizard (M1.2) ──");
  const drivers = [],
    customers = [];
  try {
    const cust = await signupCustomer();
    customers.push(cust.email);

    // Auth boundary: no session cannot upload.
    const anon = await uploadPhoto("");
    ok(
      "anonymous upload is refused (401)",
      anon.status === 401,
      `HTTP ${anon.status}`,
    );

    // A professional session cannot upload a customer job photo.
    const pro = await signupPro();
    drivers.push(pro.email);
    const proUp = await uploadPhoto(pro.cookie);
    ok(
      "a professional cannot upload a job photo (401/403)",
      proUp.status === 401 || proUp.status === 403,
      `HTTP ${proUp.status}`,
    );

    // Missing file → 400 no_file.
    const noFile = await uploadPhoto(cust.cookie, { withFile: false });
    ok(
      "upload with no file is rejected (400)",
      noFile.status === 400,
      `HTTP ${noFile.status} ${JSON.stringify(noFile.body)}`,
    );

    // Happy path: customer uploads a photo → gets a webp URL.
    const up1 = await uploadPhoto(cust.cookie);
    ok(
      "customer uploads a photo (2xx) with a url",
      up1.ok && typeof up1.body?.url === "string",
      `HTTP ${up1.status} ${JSON.stringify(up1.body)}`,
    );
    const url = up1.body?.url ?? "";
    ok(
      "uploaded photo url is a served webp under /uploads/",
      /\/uploads\/job_.*\.webp$/.test(url),
      url,
    );

    // The stored URL actually serves the image bytes.
    if (url) {
      const served = await fetch(url);
      ok(
        "uploaded photo serves (200) as an image",
        served.status === 200 &&
          (served.headers.get("content-type") ?? "").startsWith("image/"),
        `HTTP ${served.status} ${served.headers.get("content-type")}`,
      );
    } else {
      ok("uploaded photo serves (200) as an image", false, "no url");
    }

    // Second photo, so we can assert multi-photo create.
    const up2 = await uploadPhoto(cust.cookie);
    const url2 = up2.body?.url ?? "";

    // Create a job carrying the photos + a timing phrase.
    const post = await req("/jobs", {
      method: "POST",
      cookie: cust.cookie,
      body: jobBody({
        timing: "As soon as possible",
        photos: [url, url2].filter(Boolean),
      }),
    });
    ok(
      "customer posts a job with photos + timing (2xx)",
      post.ok && !!post.body?.id,
      `HTTP ${post.status} ${JSON.stringify(post.body)}`,
    );
    const jobId = post.body?.id;
    ok(
      "created job echoes the timing phrase",
      post.body?.timing === "As soon as possible",
      JSON.stringify(post.body?.timing),
    );
    ok(
      "created job echoes both photos",
      Array.isArray(post.body?.photos) && post.body.photos.length === 2,
      JSON.stringify(post.body?.photos),
    );

    // Persisted to the DB, not just echoed.
    if (jobId) {
      const dbCount = sql(
        `select array_length(photos,1) from "Job" where id='${jobId}';`,
      );
      ok("photos persisted to the DB (2)", dbCount === "2", `db=${dbCount}`);
      const dbTiming = sql(`select timing from "Job" where id='${jobId}';`);
      ok(
        "timing persisted to the DB",
        dbTiming === "As soon as possible",
        `db=${dbTiming}`,
      );
    }

    // Reads back the same on GET.
    const getJob = await req(`/jobs/${jobId}`, { cookie: cust.cookie });
    ok(
      "GET returns the photos + timing",
      getJob.ok &&
        getJob.body?.timing === "As soon as possible" &&
        (getJob.body?.photos ?? []).length === 2,
      `HTTP ${getJob.status} ${JSON.stringify(getJob.body?.photos)}`,
    );

    // A job with neither photos nor timing is still valid (both optional).
    const plain = await req("/jobs", {
      method: "POST",
      cookie: cust.cookie,
      body: jobBody(),
    });
    ok(
      "a job with no photos/timing still posts (2xx)",
      plain.ok &&
        Array.isArray(plain.body?.photos) &&
        plain.body.photos.length === 0 &&
        plain.body?.timing === null,
      `HTTP ${plain.status} ${JSON.stringify(plain.body?.timing)}`,
    );

    // Cleanup jobs (customer delete removes rows).
    if (jobId) await req(`/jobs/${jobId}`, { method: "DELETE", cookie: cust.cookie });
    if (plain.body?.id)
      await req(`/jobs/${plain.body.id}`, { method: "DELETE", cookie: cust.cookie });
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
  }
  return done("job-photos");
}

// Allow running this suite standalone: node manual-tests/api/job-photos.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

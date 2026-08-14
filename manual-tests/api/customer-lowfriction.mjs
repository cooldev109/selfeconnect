// Low-friction / email-first customer signup (M1.3). Covers phone being
// optional, that phone is still validated when supplied, and the two server
// paths behind the job-first wizard: (1) a fresh signup's session posts a job
// straight away, (2) a returning customer's email 409s on signup then logs in.
import {
  req,
  sql,
  reporter,
  uniqEmail,
  delCustomer,
} from "./_lib.mjs";

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
  console.log("\n── Low-friction customer signup (M1.3) ──");
  const emails = [];
  try {
    // 1) Signup with NO phone succeeds and stores phone as null.
    const noPhoneEmail = uniqEmail("lf_nophone");
    emails.push(noPhoneEmail);
    const noPhone = await req("/customer/auth/signup", {
      method: "POST",
      body: { name: "No Phone", email: noPhoneEmail, password: "TestPass123!" },
    });
    ok(
      "signup without a phone succeeds (2xx)",
      noPhone.ok && !!noPhone.body?.customer,
      `HTTP ${noPhone.status} ${JSON.stringify(noPhone.body)}`,
    );
    ok(
      "customer stored with null phone",
      sql(`select phone is null from "Customer" where email='${noPhoneEmail}';`) === "t",
    );
    ok(
      "signup response exposes phone: null",
      noPhone.body?.customer?.phone === null,
      JSON.stringify(noPhone.body?.customer?.phone),
    );

    // 2) A malformed phone is still rejected when one IS supplied.
    const badPhone = await req("/customer/auth/signup", {
      method: "POST",
      body: {
        name: "Bad Phone",
        email: uniqEmail("lf_badphone"),
        password: "TestPass123!",
        phone: "not-a-number!!",
      },
    });
    ok("an invalid phone is still rejected (400)", badPhone.status === 400, `HTTP ${badPhone.status}`);

    // 3) Job-first: the fresh signup's own session can post immediately.
    const jobFirstEmail = uniqEmail("lf_jobfirst");
    emails.push(jobFirstEmail);
    const signup = await req("/customer/auth/signup", {
      method: "POST",
      body: { name: "Job First", email: jobFirstEmail, password: "TestPass123!" },
    });
    ok("job-first signup succeeds (2xx)", signup.ok, `HTTP ${signup.status}`);
    const post = await req("/jobs", {
      method: "POST",
      cookie: signup.cookie,
      body: jobBody(),
    });
    ok(
      "new customer posts a job with the signup session (2xx)",
      post.ok && !!post.body?.id,
      `HTTP ${post.status} ${JSON.stringify(post.body)}`,
    );
    if (post.body?.id)
      await req(`/jobs/${post.body.id}`, { method: "DELETE", cookie: signup.cookie });

    // 4) Returning customer: same email 409s on signup, then logs in and posts.
    const dupe = await req("/customer/auth/signup", {
      method: "POST",
      body: { name: "Job First", email: jobFirstEmail, password: "TestPass123!" },
    });
    ok("re-using an email is rejected (409)", dupe.status === 409, `HTTP ${dupe.status}`);
    const login = await req("/customer/auth/login", {
      method: "POST",
      body: { email: jobFirstEmail, password: "TestPass123!" },
    });
    ok("returning customer logs in with the same password (2xx)", login.ok, `HTTP ${login.status}`);
    const wrong = await req("/customer/auth/login", {
      method: "POST",
      body: { email: jobFirstEmail, password: "WrongPass999!" },
    });
    ok("a wrong password is refused (401)", wrong.status === 401, `HTTP ${wrong.status}`);
    const post2 = await req("/jobs", {
      method: "POST",
      cookie: login.cookie,
      body: jobBody({ title: "Second tap job" }),
    });
    ok("logged-in returning customer can post (2xx)", post2.ok, `HTTP ${post2.status}`);
    if (post2.body?.id)
      await req(`/jobs/${post2.body.id}`, { method: "DELETE", cookie: login.cookie });
  } finally {
    for (const e of emails) delCustomer(e);
  }
  return done("customer-lowfriction");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

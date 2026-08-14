// Guided professional onboarding (M1.5). The dashboard checklist derives its
// steps purely from the profile + account data, so this asserts that contract:
// a fresh pro reads back as "trade set, everything else outstanding", and the
// signals the checklist ticks (bio, photo) actually update when completed.
import { API, req, sql, reporter, signupPro, delDriver, PNG_64 } from "./_lib.mjs";

// Multipart photo upload to /me/photo (driver profile photo).
async function uploadMePhoto(cookie) {
  const form = new FormData();
  form.append("file", new Blob([PNG_64], { type: "image/png" }), "me.png");
  const res = await fetch(API + "/me/photo", {
    method: "POST",
    headers: { cookie },
    body: form,
  });
  return { status: res.status, ok: res.ok };
}

export async function run() {
  const { ok, done } = reporter();
  console.log("\n── Professional onboarding contract (M1.5) ──");
  const drivers = [];
  try {
    const pro = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(pro.email);

    // A fresh pro: trade is set (chosen at signup), nothing else yet.
    const me0 = await req("/me", { cookie: pro.cookie });
    ok(
      "GET /me exposes the chosen trade",
      (me0.body?.categorySlugs ?? []).includes("plumber"),
      JSON.stringify(me0.body?.categorySlugs),
    );
    ok("new pro has no photo yet", !me0.body?.photoUrl, `photoUrl=${me0.body?.photoUrl}`);
    ok("new pro has no bio yet", !me0.body?.bio, `bio=${JSON.stringify(me0.body?.bio)}`);

    const acct0 = await req("/me/account", { cookie: pro.cookie });
    ok(
      "account contract: not live, no payouts yet",
      acct0.ok && acct0.body?.isActive === false && acct0.body?.stripeOnboarded === false,
      `HTTP ${acct0.status} ${JSON.stringify(acct0.body)}`,
    );

    // Completing the "introduce yourself" step flips the bio signal.
    const patch = await req("/me", {
      method: "PATCH",
      cookie: pro.cookie,
      body: { bio: "20 years fixing leaks across Reading. Fast, tidy, guaranteed." },
    });
    ok("PATCH /me saves a bio", patch.ok, `HTTP ${patch.status}`);
    const me1 = await req("/me", { cookie: pro.cookie });
    ok("bio now reads back as set", !!me1.body?.bio?.trim());

    // Completing the "add a photo" step flips the photo signal.
    const up = await uploadMePhoto(pro.cookie);
    ok("photo upload succeeds (2xx)", up.ok, `HTTP ${up.status}`);
    const me2 = await req("/me", { cookie: pro.cookie });
    ok("photoUrl now reads back as set", !!me2.body?.photoUrl, `photoUrl=${me2.body?.photoUrl}`);

    // And going live is reflected by the account (the checklist's last step).
    sql(`update "Driver" set "isActive"=true, "stripeOnboarded"=true where id='${pro.id}';`);
    const acct1 = await req("/me/account", { cookie: pro.cookie });
    ok(
      "account reflects live + payouts once set",
      acct1.body?.isActive === true && acct1.body?.stripeOnboarded === true,
      JSON.stringify(acct1.body),
    );
  } finally {
    for (const e of drivers) delDriver(e);
  }
  return done("pro-onboarding");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail ? 1 : 0));
}

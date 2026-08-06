// Public professional search + profile (contact gated by a customer session).
import { req, sql, reporter, signupPro, signupCustomer, delDriver, delCustomer } from "./_lib.mjs";

export async function run() {
  const { ok, done } = reporter();
  console.log("\n── Pros search + profile ──");
  const drivers = [], customers = [];
  try {
    // An active plumber near Reading (RG1 8EQ is geocoded on signup).
    const pro = await signupPro({ postcode: "RG1 8EQ", categorySlugs: ["plumber"] });
    drivers.push(pro.email);
    // Pin the pro at Reading (near RG1) so the radius test controls location
    // directly rather than depending on a second external geocode.
    sql(`update "Driver" set "isActive"=true, name='MT SearchPro', tagline='Fast & tidy', latitude=51.4543, longitude=-0.9781 where id='${pro.id}';`);

    // Browse by category finds the active pro.
    const byCat = await req(`/pros?category=plumber`);
    ok("browse by category returns 2xx array", byCat.ok && Array.isArray(byCat.body), `HTTP ${byCat.status}`);
    ok("active pro appears in category results", (byCat.body ?? []).some((p) => p.publicId === pro.publicId));

    // Radius search from RG1: pro at Reading is inside 25mi.
    const near = await req(`/pros?category=plumber&postcode=RG1 8EQ&radius=25`);
    ok("radius search returns an array", Array.isArray(near.body), JSON.stringify(near.body).slice(0, 120));
    ok("pro at Reading is within a 25mi radius of RG1", (near.body ?? []).some((p) => p.publicId === pro.publicId));

    // Move the pro to Edinburgh: now well outside 25mi of RG1.
    sql(`update "Driver" set latitude=55.9533, longitude=-3.1883 where id='${pro.id}';`);
    const far = await req(`/pros?category=plumber&postcode=RG1 8EQ&radius=25`);
    ok("pro in Edinburgh is excluded from a 25mi radius of RG1", Array.isArray(far.body) && !far.body.some((p) => p.publicId === pro.publicId));

    // An inactive pro must not surface.
    const inactive = await signupPro({ categorySlugs: ["plumber"] });
    drivers.push(inactive.email);
    const list2 = await req(`/pros?category=plumber`);
    ok("inactive pro is hidden from search", !(list2.body ?? []).some((p) => p.publicId === inactive.publicId));

    // Public profile: contact hidden for anonymous, shown for a signed-in customer.
    const anonProfile = await req(`/pros/${pro.publicId}`);
    ok("public profile loads for anyone (200)", anonProfile.ok, `HTTP ${anonProfile.status}`);
    const anonStr = JSON.stringify(anonProfile.body ?? {});
    ok("anonymous profile withholds phone/email", !/"phone"\s*:\s*"\+/.test(anonStr) && !anonStr.includes("@"), anonStr.slice(0, 160));

    const cust = await signupCustomer();
    customers.push(cust.email);
    const custProfile = await req(`/pros/${pro.publicId}`, { cookie: cust.cookie });
    ok("signed-in customer sees the profile (200)", custProfile.ok, `HTTP ${custProfile.status}`);
    ok("profile carries the pro's public fields", custProfile.body?.publicId === pro.publicId || custProfile.body?.name === "MT SearchPro", JSON.stringify(custProfile.body).slice(0, 160));

    // Unknown profile 404s.
    const missing = await req(`/pros/ZZZZZ`);
    ok("unknown profile returns 404", missing.status === 404, `HTTP ${missing.status}`);
  } finally {
    for (const e of drivers) delDriver(e);
    for (const e of customers) delCustomer(e);
  }
  return done("pros");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => { console.log(`\n${r.pass} passed, ${r.fail} failed`); process.exit(r.fail ? 1 : 0); });
}

// Geo: postcode autocomplete + reverse lookup, and the launch service-area
// gate that professional signup enforces (radius around the launch centre).
import { req, reporter, uniqEmail, delDriver } from "./_lib.mjs";

export async function run() {
  const { ok, done } = reporter();
  console.log("\n── Geo + service-area gate ──");
  const drivers = [];
  try {
    // Autocomplete.
    const ac = await req(`/geo/postcodes?q=RG1`);
    ok("postcode autocomplete returns suggestions", ac.ok && Array.isArray(ac.body?.postcodes) && ac.body.postcodes.length > 0, JSON.stringify(ac.body).slice(0, 120));

    // Reverse geocode near the launch centre (Reading).
    const rev = await req(`/geo/reverse?lat=51.4543&lng=-0.9781`);
    ok("reverse geocode returns a nearby postcode", rev.ok && !!(rev.body?.postcode || rev.body?.result || rev.text), `HTTP ${rev.status} ${JSON.stringify(rev.body)}`);

    // Signup gate — in area (Reading) is allowed.
    const inEmail = uniqEmail("pro");
    const inArea = await req(`/auth/signup`, { method: "POST", body: { name: "In Area", email: inEmail, password: "TestPass123!", postcode: "RG1 8EQ", categorySlugs: ["plumber"] } });
    if (inArea.ok) drivers.push(inEmail);
    ok("signup inside the service area is allowed (2xx)", inArea.ok, `HTTP ${inArea.status} ${JSON.stringify(inArea.body)}`);

    // Signup gate — far away (Manchester, >30mi) is refused.
    const farEmail = uniqEmail("pro");
    const outArea = await req(`/auth/signup`, { method: "POST", body: { name: "Far Away", email: farEmail, password: "TestPass123!", postcode: "M1 1AE", categorySlugs: ["plumber"] } });
    if (outArea.ok) drivers.push(farEmail);
    ok("signup outside the service area is refused (400 outside_service_area)", outArea.status === 400 && /outside_service_area/.test(JSON.stringify(outArea.body)), `HTTP ${outArea.status} ${JSON.stringify(outArea.body)}`);

    // Signup gate — a nonsense postcode is refused.
    const badEmail = uniqEmail("pro");
    const badPc = await req(`/auth/signup`, { method: "POST", body: { name: "Bad PC", email: badEmail, password: "TestPass123!", postcode: "ZZ99 9ZZ", categorySlugs: ["plumber"] } });
    if (badPc.ok) drivers.push(badEmail);
    ok("signup with an invalid postcode is refused (400)", badPc.status === 400 && /invalid_postcode/.test(JSON.stringify(badPc.body)), `HTTP ${badPc.status} ${JSON.stringify(badPc.body)}`);

    // Signup gate — a missing postcode is refused.
    const missPc = await req(`/auth/signup`, { method: "POST", body: { name: "No PC", email: uniqEmail("pro"), password: "TestPass123!", categorySlugs: ["plumber"] } });
    ok("signup with no postcode is refused (400)", missPc.status === 400, `HTTP ${missPc.status} ${JSON.stringify(missPc.body)}`);
  } finally {
    for (const e of drivers) delDriver(e);
  }
  return done("geo-gate");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => { console.log(`\n${r.pass} passed, ${r.fail} failed`); process.exit(r.fail ? 1 : 0); });
}

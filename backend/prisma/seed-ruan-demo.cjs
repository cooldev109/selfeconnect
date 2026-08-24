/**
 * Ruan walkthrough — demo seed (run on the prod box, in the backend dir).
 *
 *   cd /root/selfeconnect/backend && node prisma/seed-ruan-demo.cjs
 *
 * Creates 3 clearly-labelled demo accounts (pro / customer / admin) and a few
 * jobs in the states needed to verify Ruan's 20 requirements, then prints the
 * logins. Idempotent: re-running deletes the previous demo rows first.
 *
 * Remove everything afterwards with:  node prisma/seed-ruan-demo.cjs --clean
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const PW = 'Demo1234!';
const PRO = 'demo.pro@sc-demo.test';
const CUST = 'demo.customer@sc-demo.test';
const ADMIN = 'demo.admin@sc-demo.test';
const DEMO_EMAILS = [PRO, CUST, ADMIN];

const now = Date.now();
const mins = (n) => new Date(now - n * 60000);
const days = (n) => new Date(now + n * 86400000);

function publicId() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}
async function uniquePublicId() {
  for (;;) {
    const id = publicId();
    if (!(await prisma.driver.findUnique({ where: { publicId: id } }))) return id;
  }
}

async function clean() {
  // Jobs are owned by the demo customer; deleting the customer cascades to
  // jobs, quotes, messages, notifications, unlocks. Drivers cascade their own.
  const custs = await prisma.customer.findMany({ where: { email: { in: DEMO_EMAILS } }, select: { id: true } });
  for (const c of custs) await prisma.customer.delete({ where: { id: c.id } }).catch(() => {});
  const pros = await prisma.driver.findMany({ where: { email: { in: DEMO_EMAILS } }, select: { id: true } });
  for (const d of pros) await prisma.driver.delete({ where: { id: d.id } }).catch(() => {});
}

async function main() {
  if (process.argv.includes('--clean')) {
    await clean();
    console.log('Demo accounts + jobs removed.');
    return;
  }

  await clean(); // fresh start

  const hash = bcrypt.hashSync(PW, 10);

  // A real service category to hang the pro + jobs off of.
  const category =
    (await prisma.serviceCategory.findFirst({ where: { slug: 'plumber', active: true } })) ||
    (await prisma.serviceCategory.findFirst({ where: { active: true }, orderBy: { name: 'asc' } }));
  if (!category) throw new Error('No active ServiceCategory found on this database.');

  // ── Professional (active + verified + socials, NOT Stripe-onboarded so you
  //    can optionally do the real payout onboarding for the receipt step) ──
  const pro = await prisma.driver.create({
    data: {
      publicId: await uniquePublicId(),
      email: PRO,
      passwordHash: hash,
      role: 'driver',
      name: 'Demo Pro',
      company: 'Demo Plumbing Co',
      phone: '07700 900123',
      city: 'Reading',
      tagline: 'Friendly local plumber',
      bio: 'Friendly local plumber with 10 years experience. No job too small.',
      postcode: 'RG1 8EQ',
      yearsActive: 10,
      verified: true,
      website: 'https://demo-plumbing.example.com',
      instagram: 'https://instagram.com/demoplumbing',
      facebook: 'https://facebook.com/demoplumbing',
      isActive: true,
      complimentaryUntil: days(180), // launch free access (#17 banner + admin state)
      emailVerifiedAt: mins(60),
      phoneVerifiedAt: mins(60), // "Phone verified" badge
      categories: { connect: { id: category.id } },
      verifications: {
        create: [
          { type: 'identity', status: 'verified', label: 'Government ID', reviewedAt: mins(60) },
          { type: 'insurance', status: 'verified', label: 'Public liability £2m', reference: 'POL-123456', expiresAt: days(365), reviewedAt: mins(60) },
          { type: 'qualification', status: 'pending', label: 'City & Guilds', submittedAt: mins(30) },
        ],
      },
    },
  });

  // ── Admin (to test the admin control centre + granting complimentary #17) ──
  await prisma.driver.create({
    data: {
      publicId: await uniquePublicId(),
      email: ADMIN,
      passwordHash: hash,
      role: 'admin',
      name: 'Demo Admin',
      isActive: true,
      emailVerifiedAt: mins(60),
    },
  });

  // ── Customer ──
  const cust = await prisma.customer.create({
    data: {
      email: CUST,
      passwordHash: hash,
      name: 'Demo Customer',
      phone: '07700 900555',
      postcode: 'RG1 8EQ',
      emailVerifiedAt: mins(60),
    },
  });

  const jobBase = {
    customerId: cust.id,
    categoryId: category.id,
    postcode: 'RG1 8EQ',
    contactConsentAt: mins(120),
  };

  // Placeholder job photos (loaded by your browser) → tests #8 (job photos)
  const PHOTOS = ['https://picsum.photos/seed/sctap1/800/600', 'https://picsum.photos/seed/sctap2/800/600'];

  // J1 — OPEN with a quote from the pro → tests #2 (edit quote) + #3 (View profile on quote) + #8 (photos)
  const j1 = await prisma.job.create({
    data: {
      ...jobBase,
      title: 'Kitchen tap repair',
      description: 'A dripping kitchen tap that needs a new washer or cartridge.',
      status: 'open',
      timing: 'Within a week',
      photos: PHOTOS,
      createdAt: mins(180),
      quotes: { create: { driverId: pro.id, amount: 8000, message: 'Happy to help — can do this week. £80 all in.' } },
      unlocks: { create: { driverId: pro.id } },
    },
  });

  // J4 — OPEN, pro UNLOCKED but did NOT quote → tests #9 ("Contacted" vs "Quoted")
  await prisma.job.create({
    data: {
      ...jobBase,
      title: 'Fence painting',
      description: 'A garden fence, about 12 panels, needs treating and painting.',
      status: 'open',
      timing: 'I am flexible',
      createdAt: mins(170),
      unlocks: { create: { driverId: pro.id } },
    },
  });

  // J2 — HIRED to the pro, with a 2-message chat → tests #1 (timestamps),
  //      #4 (pay note/button), #18 (chat present), #19/#20 (complete→review+confirm), #15 (review)
  const j2 = await prisma.job.create({
    data: {
      ...jobBase,
      title: 'Bathroom leak under sink',
      description: 'Slow leak from the trap under the bathroom sink. Needs looking at.',
      status: 'hired',
      hiredDriverId: pro.id,
      hiredAt: mins(90),
      createdAt: mins(150),
      unlocks: { create: { driverId: pro.id } },
      quotes: { create: { driverId: pro.id, amount: 12000, message: 'Can pop round Thursday morning. £120.' } },
      messages: {
        create: [
          { driverId: pro.id, fromCustomer: false, body: 'Hi! I can come Thursday morning if that suits?', createdAt: mins(80) },
          { driverId: pro.id, fromCustomer: true, body: 'Thursday morning works, thanks!', createdAt: mins(70), readAt: mins(69) },
        ],
      },
    },
  });

  // J3 — COMPLETED → tests #18 (no chat on completed) + My Jobs history
  const j3 = await prisma.job.create({
    data: {
      ...jobBase,
      title: 'Garden clearance',
      description: 'Clear an overgrown back garden, roughly half a day of work.',
      status: 'completed',
      hiredDriverId: pro.id,
      hiredAt: mins(300),
      completedAt: mins(60),
      createdAt: mins(400),
      unlocks: { create: { driverId: pro.id } },
    },
  });

  // Pro notifications → tests #7 (notification bell)
  await prisma.notification.createMany({
    data: [
      { driverId: pro.id, kind: 'hired', title: 'You were hired', body: 'Demo Customer hired you for "Bathroom leak under sink".', jobId: j2.id, createdAt: mins(85) },
      { driverId: pro.id, kind: 'message', title: 'New message', body: 'Demo Customer sent you a message.', jobId: j2.id, createdAt: mins(70) },
      { driverId: pro.id, kind: 'verification', title: 'Insurance approved', body: 'Your insurance check was approved.', createdAt: mins(60) },
    ],
  });

  console.log('\n=== Ruan demo seeded ===');
  console.log('Password for all three:  ' + PW);
  console.log('Professional:  ' + PRO + '   (publicId ' + pro.publicId + ')');
  console.log('Customer:      ' + CUST);
  console.log('Admin:         ' + ADMIN);
  console.log('Category:      ' + category.name + ' (' + category.slug + ')');
  console.log('Jobs:  J1 open+quote "' + j1.title + '"  |  J2 hired+chat "' + j2.title + '"  |  J3 completed "' + j3.title + '"');
  console.log('\nClean up later with:  node prisma/seed-ruan-demo.cjs --clean\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

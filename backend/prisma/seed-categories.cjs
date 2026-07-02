// Idempotent seed for the starter service categories. Safe to run in any
// environment (upserts by slug), including production when Phase 1 ships.
//   DATABASE_URL=... node prisma/seed-categories.cjs
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: 'delivery-driver', name: 'Delivery Driver' },
  { slug: 'cleaner', name: 'Cleaner' },
  { slug: 'gardener', name: 'Gardener' },
  { slug: 'mechanic', name: 'Mechanic' },
  { slug: 'electrician', name: 'Electrician' },
  { slug: 'plumber', name: 'Plumber' },
  { slug: 'painter-decorator', name: 'Painter & Decorator' },
  { slug: 'handyman', name: 'Handyman' },
  { slug: 'removals', name: 'Removals' },
  { slug: 'pet-care', name: 'Pet Care' },
  { slug: 'tutor', name: 'Tutor' },
  { slug: 'personal-trainer', name: 'Personal Trainer' },
];

(async () => {
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    await prisma.serviceCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, sortOrder: i },
      create: { slug: c.slug, name: c.name, sortOrder: i, active: true },
    });
  }
  const total = await prisma.serviceCategory.count();
  console.log(`Seeded/updated ${CATEGORIES.length} categories. Total in DB: ${total}`);
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

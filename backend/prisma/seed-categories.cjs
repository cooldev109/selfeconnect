// Idempotent seed for the starter service categories. Safe to run in any
// environment (upserts by slug), including production when Phase 1 ships.
//   DATABASE_URL=... node prisma/seed-categories.cjs
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Starter set — expands over time (admin category management comes later).
// NOTE: existing slugs must stay stable so already-registered pros/jobs keep
// their category. New entries are just appended.
const CATEGORIES = [
  // Trades & home improvement
  { slug: 'electrician', name: 'Electrician' },
  { slug: 'plumber', name: 'Plumber' },
  { slug: 'gas-engineer', name: 'Heating & Gas Engineer' },
  { slug: 'carpenter', name: 'Carpenter & Joiner' },
  { slug: 'painter-decorator', name: 'Painter & Decorator' },
  { slug: 'plasterer', name: 'Plasterer' },
  { slug: 'tiler', name: 'Tiler' },
  { slug: 'roofer', name: 'Roofer' },
  { slug: 'builder', name: 'Builder' },
  { slug: 'bricklayer', name: 'Bricklayer' },
  { slug: 'handyman', name: 'Handyman' },
  { slug: 'locksmith', name: 'Locksmith' },
  { slug: 'glazier', name: 'Glazier & Windows' },
  { slug: 'kitchen-fitter', name: 'Kitchen Fitter' },
  { slug: 'bathroom-fitter', name: 'Bathroom Fitter' },
  { slug: 'flooring', name: 'Flooring & Carpet Fitter' },
  { slug: 'fencing', name: 'Fencing & Decking' },
  { slug: 'driveways', name: 'Driveways & Paving' },
  { slug: 'scaffolder', name: 'Scaffolder' },
  // Cleaning
  { slug: 'cleaner', name: 'Cleaner' },
  { slug: 'end-of-tenancy', name: 'End of Tenancy Cleaning' },
  { slug: 'oven-cleaning', name: 'Oven Cleaning' },
  { slug: 'carpet-cleaning', name: 'Carpet Cleaning' },
  { slug: 'window-cleaner', name: 'Window Cleaner' },
  { slug: 'gutter-cleaning', name: 'Gutter Cleaning' },
  // Outdoor
  { slug: 'gardener', name: 'Gardener' },
  { slug: 'landscaper', name: 'Landscaper' },
  { slug: 'tree-surgeon', name: 'Tree Surgeon' },
  { slug: 'pest-control', name: 'Pest Control' },
  // Transport & logistics
  { slug: 'delivery-driver', name: 'Delivery Driver' },
  { slug: 'removals', name: 'Removals' },
  { slug: 'man-and-van', name: 'Man & Van' },
  { slug: 'courier', name: 'Courier' },
  { slug: 'driving-instructor', name: 'Driving Instructor' },
  // Automotive
  { slug: 'mechanic', name: 'Mechanic' },
  { slug: 'car-valeting', name: 'Car Valeting' },
  // Pets
  { slug: 'pet-care', name: 'Pet Care' },
  { slug: 'dog-walker', name: 'Dog Walker' },
  { slug: 'dog-groomer', name: 'Dog Groomer' },
  // Health, beauty & fitness
  { slug: 'personal-trainer', name: 'Personal Trainer' },
  { slug: 'hairdresser', name: 'Hairdresser' },
  { slug: 'barber', name: 'Barber' },
  { slug: 'beautician', name: 'Beautician' },
  { slug: 'massage-therapist', name: 'Massage Therapist' },
  // Events & creative
  { slug: 'photographer', name: 'Photographer' },
  { slug: 'event-planner', name: 'Event Planner' },
  { slug: 'caterer', name: 'Caterer' },
  // Education & professional
  { slug: 'tutor', name: 'Tutor' },
  { slug: 'music-teacher', name: 'Music Teacher' },
  { slug: 'accountant', name: 'Accountant' },
  { slug: 'it-support', name: 'IT Support' },
  { slug: 'web-designer', name: 'Web Designer' },
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

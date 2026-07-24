// PM2 process config — copy to ecosystem.config.cjs and fill in real values.
// The real ecosystem.config.cjs is gitignored because it holds secrets.
module.exports = {
  apps: [
    {
      name: "tipvan-api",
      cwd: "/root/projects/Blank/backend",
      script: "dist/main.js",
      env: {
        NODE_ENV: "production",
        PORT: "4000",
        DATABASE_URL: "postgresql://USER:PASSWORD@localhost:5432/tipvan_prod?schema=public",
        JWT_SECRET: "replace-with-a-long-random-secret",
        PUBLIC_URL: "https://your-domain.com",
        CORS_ORIGIN: "https://your-domain.com",
        UPLOAD_DIR: "/root/projects/Blank/backend/uploads",
        // Stripe — leave STRIPE_SECRET_KEY empty to run in mock mode.
        STRIPE_SECRET_KEY: "sk_test_or_sk_live_...",
        STRIPE_WEBHOOK_SECRET: "whsec_...",
        // Founding-member pricing: the first FOUNDING_MEMBER_CAP professionals
        // keep the founding price for as long as they stay subscribed.
        STRIPE_FOUNDING_PRICE_ID: "price_...", // the existing £5.49 price
        STRIPE_STANDARD_PRICE_ID: "price_...", // the £9.49 price
        FOUNDING_MEMBER_CAP: "100",
        FOUNDING_PRICE_GBP: "5.49",
        STANDARD_PRICE_GBP: "9.49",
      },
    },
    {
      name: "tipvan-web",
      cwd: "/root/projects/Blank/frontend",
      script: ".output/server/index.mjs",
      interpreter: "node",
      env: { NODE_ENV: "production", PORT: "3000" },
    },
  ],
};

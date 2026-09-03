// One-shot demo-data seeder: run without the HTTP layer / auth.
//   npm run seed            (from server/)
//   node scripts/seed.js
//
// Honours ALLOW_SEED unless --force is passed.
require("../config/env"); // loads dotenv + validates
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const config = require("../config/env");
const { runSeed } = require("../services/seedService");

const force = process.argv.includes("--force");

(async () => {
  if (!config.allowSeed && !force) {
    console.error("Seeding is disabled (ALLOW_SEED is off). Re-run with --force to override.");
    process.exit(1);
  }

  await connectDB();
  console.log("Seeding…");
  const summary = await runSeed();
  console.log("Done:", summary);
  console.log("\nDemo logins:");
  console.log("  admin@gensys.com     / admin@123      (Admin)");
  console.log("  engineer@gensys.com  / password@123   (Engineer)");
  console.log("  tech@gensys.com      / password@123   (Technician)");
  console.log("  noc@gensys.com       / password@123   (NOC Manager)");

  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

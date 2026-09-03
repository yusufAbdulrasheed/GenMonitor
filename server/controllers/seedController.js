const asyncHandler = require("../utils/asyncHandler");
const config = require("../config/env");
const { runSeed } = require("../services/seedService");

// @desc    Wipe and reseed demo data
// @route   POST /api/seed
// @access  Private/Admin (disabled in production unless ALLOW_SEED=true)
const seedDatabase = asyncHandler(async (req, res) => {
  if (!config.allowSeed) {
    res.status(403);
    throw new Error("Seeding is disabled in this environment");
  }

  const summary = await runSeed({ keepUserId: req.user._id });

  await req.audit({ action: "update", entity: "Auth", entityLabel: "database seed", meta: summary });

  res.status(201).json({ message: "Database seeded successfully!", summary });
});

module.exports = { seedDatabase };

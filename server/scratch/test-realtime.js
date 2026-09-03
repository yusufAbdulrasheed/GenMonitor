// Manual helper: run a single telemetry simulator tick against the configured
// database and print the resulting generator states.
//   node scratch/test-realtime.js
require('../config/env'); // loads dotenv + validates
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Generator = require('../models/Generator');
const { tick } = require('../utils/simulator');

(async () => {
  await connectDB();
  try {
    await tick();
    const generators = await Generator.find({ isDecommissioned: false })
      .populate('siteId', 'name')
      .lean();
    console.log(`Updated ${generators.length} generator(s):`);
    generators.forEach((g) => {
      console.log(
        `  ${g.generatorId}  status=${g.status}  fuel=${g.fuelLevel?.toFixed?.(1)}%  ` +
          `temp=${g.temperature?.toFixed?.(1)}C  runtime=${g.runtimeHours?.toFixed?.(2)}h`
      );
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();

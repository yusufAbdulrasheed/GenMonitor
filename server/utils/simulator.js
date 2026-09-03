// Background telemetry simulator. Feeds simulated readings through the same
// pipeline as real device readings (persist Reading + evaluate alerts + push),
// so the dashboard shows "live" movement. GET /api/generators/realtime stays a
// pure read.

const Generator = require('../models/Generator');
const { buildSimulatedReading } = require('./telemetry');
const { recordReading } = require('../services/telemetryService');

let timer = null;

const tick = async () => {
  try {
    const generators = await Generator.find({
      isDecommissioned: false,
      status: { $in: ['Running', 'Fault'] },
    }).populate('siteId', 'name');

    for (const gen of generators) {
      await recordReading(gen, buildSimulatedReading(gen), 'simulator');
    }
  } catch (err) {
    console.error('[simulator] tick failed:', err.message);
  }
};

const startSimulator = (intervalMs = 10000) => {
  if (timer) return timer;
  console.log(`[simulator] telemetry simulation running every ${intervalMs}ms`);
  timer = setInterval(tick, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
  return timer;
};

const stopSimulator = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};

module.exports = { startSimulator, stopSimulator, tick };

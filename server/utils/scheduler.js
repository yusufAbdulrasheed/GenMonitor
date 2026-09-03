// Single entry point for all in-process background jobs. Each is guarded by an
// env flag and its own interval. Timers are unref'd so they never hold the
// process open on shutdown.

const config = require('../config/env');
const { startSimulator, stopSimulator } = require('./simulator');
const { sweepAll } = require('../services/alertService');
const { sweep: maintenanceSweep } = require('../services/maintenanceService');
const Reading = require('../models/Reading');

const timers = [];

const every = (ms, fn, label) => {
  const run = async () => {
    try {
      await fn();
    } catch (err) {
      console.error(`[scheduler] ${label} failed:`, err.message);
    }
  };
  const t = setInterval(run, ms);
  if (typeof t.unref === 'function') t.unref();
  timers.push(t);
  console.log(`[scheduler] ${label} every ${ms}ms`);
};

const purgeOldReadings = async () => {
  if (config.readingRetentionDays <= 0) return;
  const cutoff = new Date(Date.now() - config.readingRetentionDays * 24 * 60 * 60 * 1000);
  await Reading.deleteMany({ timestamp: { $lt: cutoff } });
};

const start = () => {
  if (config.enableSimulation) startSimulator(config.simulationIntervalMs);

  if (config.enableScheduler) {
    every(config.alertSweepIntervalMs, sweepAll, 'alert sweep');
    every(config.maintenanceSweepIntervalMs, maintenanceSweep, 'maintenance sweep');
    every(config.retentionSweepIntervalMs, purgeOldReadings, 'reading retention');
  }
};

const stop = () => {
  stopSimulator();
  while (timers.length) clearInterval(timers.pop());
};

module.exports = { start, stop };

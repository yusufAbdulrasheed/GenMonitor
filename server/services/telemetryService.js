const Reading = require('../models/Reading');
const { applyMonitoringReading } = require('../utils/telemetry');
const { evaluateGenerator } = require('./alertService');
const realtime = require('./realtime');

/**
 * Apply a telemetry reading to a generator document: mutate + persist the
 * generator, append a time-series Reading, reconcile alerts, and push the
 * updated snapshot to connected clients.
 *
 * @param {import('mongoose').Document} generator  loaded, non-decommissioned
 * @param {object} reading                         raw reading payload
 * @param {'simulator'|'device'|'manual'} source
 */
const recordReading = async (generator, reading = {}, source = 'manual') => {
  applyMonitoringReading(generator, reading);
  await generator.save();

  const readingDoc = await Reading.create({
    generatorId: generator._id,
    siteId: generator.siteId?._id || generator.siteId,
    siteCode: generator.siteCode,
    timestamp: generator.lastReadingAt || new Date(),
    fuelLevel: generator.fuelLevel,
    temperature: generator.temperature,
    batteryVoltage: generator.batteryVoltage,
    runtimeHours: generator.runtimeHours,
    status: generator.status,
    source,
  });

  let alertResult = { opened: 0, resolved: 0, updated: 0 };
  try {
    alertResult = await evaluateGenerator(generator);
  } catch (err) {
    console.error('[telemetry] alert evaluation failed:', err.message);
  }

  realtime.emitAll('telemetry:update', {
    generatorId: generator._id,
    status: generator.status,
    fuelLevel: generator.fuelLevel,
    temperature: generator.temperature,
    batteryVoltage: generator.batteryVoltage,
    runtimeHours: generator.runtimeHours,
    lastReadingAt: generator.lastReadingAt,
  });

  return { generator, reading: readingDoc, alertResult };
};

module.exports = { recordReading };

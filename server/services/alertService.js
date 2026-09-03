const Alert = require('../models/Alert');
const Generator = require('../models/Generator');
const { resolveThresholds } = require('./thresholdService');
const { notifyRoles } = require('./notificationService');
const realtime = require('./realtime');

const NOTIFY_ROLES = ['Admin', 'Engineer', 'NOC Manager'];

// Hysteresis so a value hovering on a threshold does not flap the alert.
const MARGIN = { fuel: 3, battery: 0.2, temp: 3 };

const genLabel = (generator) =>
  `${generator.generatorId}${generator.siteId?.name ? ` · ${generator.siteId.name}` : ''}`;

/**
 * Build the set of alert conditions that currently hold for a generator.
 * `recovering` = true relaxes thresholds by MARGIN so an existing alert only
 * clears once the value has comfortably recovered.
 */
const computeDesired = (generator, t, hasOpen) => {
  const desired = [];
  const m = (base, delta, dir) => (hasOpen ? base + dir * delta : base);

  if (generator.status === 'Fault') {
    desired.push({ type: 'Fault', severity: 'critical', message: `${generator.generatorId} is in FAULT state` });
  }

  const fuel = generator.fuelLevel;
  if (typeof fuel === 'number' && !generator.isDecommissioned) {
    if (fuel <= t.criticalFuelPct) {
      desired.push({ type: 'LowFuel', severity: 'critical', value: fuel, threshold: t.criticalFuelPct, message: `Fuel critically low (${fuel.toFixed(1)}%)` });
    } else if (fuel <= m(t.lowFuelPct, MARGIN.fuel, +1)) {
      desired.push({ type: 'LowFuel', severity: 'warning', value: fuel, threshold: t.lowFuelPct, message: `Fuel low (${fuel.toFixed(1)}%)` });
    }
  }

  const volt = generator.batteryVoltage;
  if (typeof volt === 'number') {
    if (volt < t.criticalBatteryV) {
      desired.push({ type: 'LowBattery', severity: 'critical', value: volt, threshold: t.criticalBatteryV, message: `Battery voltage critical (${volt.toFixed(2)}V)` });
    } else if (volt < m(t.lowBatteryV, MARGIN.battery, +1)) {
      desired.push({ type: 'LowBattery', severity: 'warning', value: volt, threshold: t.lowBatteryV, message: `Battery voltage low (${volt.toFixed(2)}V)` });
    }
  }

  const temp = generator.temperature;
  if (typeof temp === 'number') {
    if (temp >= t.criticalTempC) {
      desired.push({ type: 'HighTemp', severity: 'critical', value: temp, threshold: t.criticalTempC, message: `Temperature critical (${temp.toFixed(1)}°C)` });
    } else if (temp >= m(t.highTempC, MARGIN.temp, -1)) {
      desired.push({ type: 'HighTemp', severity: 'warning', value: temp, threshold: t.highTempC, message: `Temperature high (${temp.toFixed(1)}°C)` });
    }
  }

  return desired;
};

/**
 * Reconcile alert records for one generator against its current telemetry.
 * Returns { opened, resolved, updated } counts.
 */
const evaluateGenerator = async (generator) => {
  const t = await resolveThresholds(generator);
  const siteId = generator.siteId?._id || generator.siteId;

  const openAlerts = await Alert.find({
    generatorId: generator._id,
    status: { $in: ['open', 'acknowledged'] },
    type: { $ne: 'MaintenanceOverdue' },
  });

  const desired = computeDesired(generator, t, openAlerts.length > 0);
  const desiredByType = new Map(desired.map((d) => [d.type, d]));
  const now = new Date();
  const result = { opened: 0, resolved: 0, updated: 0 };

  // Auto-resolve alerts whose condition no longer holds.
  for (const alert of openAlerts) {
    if (!desiredByType.has(alert.type)) {
      alert.status = 'resolved';
      alert.resolvedAt = now;
      alert.autoResolved = true;
      await alert.save();
      realtime.emitAll('alert:updated', alert.toJSON());
      result.resolved += 1;
    }
  }

  // Open new / touch existing.
  for (const d of desired) {
    const existing = openAlerts.find((a) => a.type === d.type);
    if (!existing) {
      try {
        const created = await Alert.create({
          generatorId: generator._id,
          siteId,
          type: d.type,
          severity: d.severity,
          message: d.message,
          value: d.value,
          threshold: d.threshold,
          firstSeenAt: now,
          lastSeenAt: now,
        });
        realtime.emitAll('alert:new', created.toJSON());
        await notifyRoles(NOTIFY_ROLES, {
          title: `[${d.severity.toUpperCase()}] ${d.message}`,
          body: genLabel(generator),
          type: 'alert',
          link: '/alerts',
          alertId: created._id,
          severity: d.severity,
        });
        result.opened += 1;
      } catch (err) {
        if (err.code !== 11000) throw err; // raced with another evaluator
      }
    } else {
      const changed = existing.severity !== d.severity || existing.message !== d.message;
      existing.severity = d.severity;
      existing.message = d.message;
      existing.value = d.value;
      existing.threshold = d.threshold;
      existing.lastSeenAt = now;
      await existing.save();
      if (changed) {
        realtime.emitAll('alert:updated', existing.toJSON());
        result.updated += 1;
      }
    }
  }

  return result;
};

/** Re-evaluate every active generator (used by the scheduled sweep). */
const sweepAll = async () => {
  const generators = await Generator.find({ isDecommissioned: false }).populate('siteId', 'name');
  const totals = { opened: 0, resolved: 0, updated: 0 };
  for (const generator of generators) {
    try {
      const r = await evaluateGenerator(generator);
      totals.opened += r.opened;
      totals.resolved += r.resolved;
      totals.updated += r.updated;
    } catch (err) {
      console.error(`[alerts] sweep failed for ${generator.generatorId}:`, err.message);
    }
  }
  return totals;
};

module.exports = { evaluateGenerator, sweepAll, genLabel };

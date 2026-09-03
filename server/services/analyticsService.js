const Generator = require('../models/Generator');
const Reading = require('../models/Reading');
const Alert = require('../models/Alert');
const WorkOrder = require('../models/WorkOrder');

const RANGES = { '24h': 24 * 3600e3, '7d': 7 * 24 * 3600e3, '30d': 30 * 24 * 3600e3, '90d': 90 * 24 * 3600e3 };

const rangeMs = (range) => RANGES[range] || RANGES['7d'];

const UP_STATUSES = ['Running', 'Standby'];

const round = (n, dp = 2) => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

/** Availability = share of readings in an "up" status over the window. */
const availabilityFromReadings = (readings) => {
  if (!readings.length) return null;
  const up = readings.filter((r) => UP_STATUSES.includes(r.status)).length;
  return round((up / readings.length) * 100, 1);
};

/** Litres-equivalent %/hour drawdown, averaged over decreasing segments. */
const fuelBurnRate = (readings) => {
  let drop = 0;
  let hours = 0;
  for (let i = 1; i < readings.length; i += 1) {
    const a = readings[i - 1];
    const b = readings[i];
    if (typeof a.fuelLevel !== 'number' || typeof b.fuelLevel !== 'number') continue;
    const dt = (new Date(b.timestamp) - new Date(a.timestamp)) / 3600e3;
    if (dt <= 0 || dt > 6) continue;
    const delta = a.fuelLevel - b.fuelLevel;
    if (delta > 0) {
      drop += delta;
      hours += dt;
    }
  }
  return hours > 0 ? round(drop / hours, 2) : null;
};

const fleetSummary = async (range = '7d') => {
  const since = new Date(Date.now() - rangeMs(range));

  const [generators, readings, resolvedAlerts, faultAlerts, openAlerts, workOrders] = await Promise.all([
    Generator.find({}).lean(),
    Reading.find({ timestamp: { $gte: since } }).select('generatorId status fuelLevel timestamp').lean(),
    Alert.find({ status: 'resolved', resolvedAt: { $gte: since } }).select('firstSeenAt resolvedAt type').lean(),
    Alert.find({ type: 'Fault', firstSeenAt: { $gte: since } }).select('_id').lean(),
    Alert.find({ status: { $in: ['open', 'acknowledged'] } }).select('severity').lean(),
    WorkOrder.find({}).select('status slaDueAt completedAt').lean(),
  ]);

  const byStatus = generators.reduce((acc, g) => {
    const key = g.isDecommissioned ? 'Decommissioned' : g.status;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const readingsByGen = readings.reduce((acc, r) => {
    (acc[r.generatorId] = acc[r.generatorId] || []).push(r);
    return acc;
  }, {});
  const availList = Object.values(readingsByGen)
    .map((rs) => availabilityFromReadings(rs))
    .filter((v) => v !== null);
  const availabilityPct = availList.length
    ? round(availList.reduce((a, b) => a + b, 0) / availList.length, 1)
    : null;

  const mttrHoursList = resolvedAlerts
    .map((a) => (new Date(a.resolvedAt) - new Date(a.firstSeenAt)) / 3600e3)
    .filter((h) => Number.isFinite(h) && h >= 0);
  const mttrHours = mttrHoursList.length
    ? round(mttrHoursList.reduce((a, b) => a + b, 0) / mttrHoursList.length, 2)
    : null;

  const activeGen = generators.filter((g) => !g.isDecommissioned).length || 1;
  const mtbfHours = faultAlerts.length
    ? round((rangeMs(range) / 3600e3) / (faultAlerts.length / activeGen), 1)
    : null;

  const now = Date.now();
  return {
    range,
    generators: { total: generators.length, byStatus },
    availabilityPct,
    reliability: { mtbfHours, mttrHours, faultsInRange: faultAlerts.length },
    alertsOpen: {
      total: openAlerts.length,
      critical: openAlerts.filter((a) => a.severity === 'critical').length,
      warning: openAlerts.filter((a) => a.severity === 'warning').length,
    },
    workOrders: {
      open: workOrders.filter((w) => !['completed', 'cancelled'].includes(w.status)).length,
      overdue: workOrders.filter(
        (w) => !['completed', 'cancelled'].includes(w.status) && w.slaDueAt && new Date(w.slaDueAt) < now
      ).length,
      completedInRange: workOrders.filter((w) => w.completedAt && new Date(w.completedAt) >= since).length,
    },
    fuelBurnPctPerHour: fuelBurnRate(
      readings.slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    ),
  };
};

const generatorHistory = async (generatorId, range = '24h', points = 500) => {
  const since = new Date(Date.now() - rangeMs(range));
  const readings = await Reading.find({ generatorId, timestamp: { $gte: since } })
    .sort({ timestamp: 1 })
    .lean();

  if (readings.length <= points) return readings;
  const step = Math.ceil(readings.length / points);
  return readings.filter((_, i) => i % step === 0);
};

const generatorAnalytics = async (generatorId, range = '7d') => {
  const since = new Date(Date.now() - rangeMs(range));
  const [readings, alerts, workOrders] = await Promise.all([
    Reading.find({ generatorId, timestamp: { $gte: since } }).sort({ timestamp: 1 }).lean(),
    Alert.find({ generatorId, firstSeenAt: { $gte: since } }).lean(),
    WorkOrder.find({ generatorId }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  const first = readings[0];
  const last = readings[readings.length - 1];
  return {
    range,
    availabilityPct: availabilityFromReadings(readings),
    runtimeAccruedHours:
      first && last && typeof first.runtimeHours === 'number' && typeof last.runtimeHours === 'number'
        ? round(last.runtimeHours - first.runtimeHours, 2)
        : null,
    fuelConsumedPct:
      first && last && typeof first.fuelLevel === 'number' && typeof last.fuelLevel === 'number'
        ? round(Math.max(0, first.fuelLevel - last.fuelLevel), 1)
        : null,
    fuelBurnPctPerHour: fuelBurnRate(readings),
    alerts: {
      total: alerts.length,
      byType: alerts.reduce((acc, a) => ({ ...acc, [a.type]: (acc[a.type] || 0) + 1 }), {}),
    },
    recentWorkOrders: workOrders.length,
    readingCount: readings.length,
  };
};

module.exports = { fleetSummary, generatorHistory, generatorAnalytics, rangeMs, RANGES };

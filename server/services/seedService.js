const Site = require("../models/Site");
const Generator = require("../models/Generator");
const User = require("../models/User");
const WorkOrder = require("../models/WorkOrder");
const MaintenancePlan = require("../models/MaintenancePlan");
const Alert = require("../models/Alert");
const ThresholdConfig = require("../models/ThresholdConfig");
const Reading = require("../models/Reading");
const Notification = require("../models/Notification");
const AuditEvent = require("../models/AuditEvent");
const ApiKey = require("../models/ApiKey");
const RefreshToken = require("../models/RefreshToken");
const config = require("../config/env");
const bcrypt = require("bcryptjs");
const { sweep } = require("./maintenanceService");
const { sweepAll } = require("./alertService");

/**
 * Wipe domain data and load the demo dataset.
 * @param {{ keepUserId?: any }} opts  keep this user (e.g. the admin who
 *   triggered the API call); when omitted, all users are cleared and only the
 *   demo accounts remain.
 */
const runSeed = async ({ keepUserId } = {}) => {
  await Promise.all([
    Site.deleteMany({}),
    Generator.deleteMany({}),
    WorkOrder.deleteMany({}),
    MaintenancePlan.deleteMany({}),
    Alert.deleteMany({}),
    ThresholdConfig.deleteMany({}),
    Reading.deleteMany({}),
    Notification.deleteMany({}),
    AuditEvent.deleteMany({}),
    ApiKey.deleteMany({}),
    RefreshToken.deleteMany({}),
    User.deleteMany(keepUserId ? { _id: { $ne: keepUserId } } : {}),
  ]);

  // Demo accounts (created only if missing).
  const salt = await bcrypt.genSalt(config.bcryptSaltRounds);
  const adminPw = await bcrypt.hash("admin@123", salt);
  const staffPw = await bcrypt.hash("password@123", salt);
  const ensureUser = async (doc) => {
    if (!(await User.findOne({ email: doc.email }))) await User.create(doc);
  };
  await ensureUser({ name: "System Admin", email: "admin@gensys.com", phone: "+1234567890", role: "Admin", password: adminPw, isActive: true });
  await ensureUser({ name: "Ada Engineer", email: "engineer@gensys.com", role: "Engineer", password: staffPw, isActive: true });
  await ensureUser({ name: "Tolu Technician", email: "tech@gensys.com", role: "Technician", password: staffPw, isActive: true });
  await ensureUser({ name: "Noah NOC", email: "noc@gensys.com", role: "NOC Manager", password: staffPw, isActive: true });

  await ThresholdConfig.create({
    scope: "global",
    lowFuelPct: 20,
    criticalFuelPct: 10,
    lowBatteryV: 11.8,
    criticalBatteryV: 11,
    highTempC: 85,
    criticalTempC: 95,
  });

  const site1 = await Site.create({
    name: "Alpha Tower",
    siteCode: "ALPHA-01",
    location: "New York, NY",
    coordinates: { lat: 40.7128, lng: -74.006 },
    status: "Operational",
  });
  const site2 = await Site.create({
    name: "Beta Station",
    siteCode: "BETA-01",
    location: "Austin, TX",
    coordinates: { lat: 30.2672, lng: -97.7431 },
    status: "Maintenance",
  });

  const gen1 = await Generator.create({
    siteId: site1._id, siteCode: site1.siteCode,
    generatorId: "GEN-1001-A", serialNumber: "SN-1001",
    make: "Cummins", model: "C150D5", capacityKVA: 150, fuelTankSize: 500,
    installationDate: new Date("2020-01-15"),
    status: "Running", fuelLevel: 80, batteryVoltage: 12.4, temperature: 45,
    runtimeHours: 1200, lastMaintenance: new Date(),
  });
  const gen2 = await Generator.create({
    siteId: site1._id, siteCode: site1.siteCode,
    generatorId: "GEN-1002-B", serialNumber: "SN-1002",
    make: "Cummins", model: "C150D5", capacityKVA: 150, fuelTankSize: 500,
    installationDate: new Date("2020-01-15"),
    status: "Fault", fuelLevel: 8, batteryVoltage: 11.4, temperature: 92,
    runtimeHours: 3500, lastMaintenance: new Date(Date.now() - 120 * 24 * 3600e3),
  });
  const gen3 = await Generator.create({
    siteId: site2._id, siteCode: site2.siteCode,
    generatorId: "GEN-2001-C", serialNumber: "SN-2001",
    make: "Caterpillar", model: "C15", capacityKVA: 500, fuelTankSize: 1000,
    installationDate: new Date("2018-05-20"),
    status: "Standby", fuelLevel: 55, batteryVoltage: 12.1, temperature: 30,
    runtimeHours: 5000, lastMaintenance: new Date(Date.now() - 200 * 24 * 3600e3),
  });

  await MaintenancePlan.create([
    {
      generatorId: gen1._id, name: "250-hour service",
      intervalType: "runtimeHours", intervalValue: 250,
      checklist: ["Oil & filter change", "Coolant level", "Belt inspection", "Load bank test"],
      priority: "medium", anchorRuntimeHours: gen1.runtimeHours,
    },
    {
      generatorId: gen3._id, name: "Quarterly inspection",
      intervalType: "days", intervalValue: 90,
      checklist: ["Visual inspection", "Battery test", "Fuel polish", "Transfer switch test"],
      priority: "medium", anchorDate: new Date(Date.now() - 100 * 24 * 3600e3),
    },
  ]);

  await WorkOrder.create({
    generatorId: gen2._id, siteId: site1._id,
    title: "Cooling system fault investigation",
    description: "Unit reporting high temperature and low fuel. Inspect radiator, top up fuel.",
    type: "corrective", priority: "critical", status: "in_progress",
    scheduledDate: new Date(), slaDueAt: new Date(Date.now() + 2 * 24 * 3600e3),
    startedAt: new Date(),
    timeline: [{ at: new Date(), action: "create", note: "Seeded" }],
  });

  // Baseline reading history so analytics/charts render immediately.
  const now = Date.now();
  const readings = [];
  for (const g of [gen1, gen2, gen3]) {
    for (let i = 48; i >= 0; i -= 1) {
      readings.push({
        generatorId: g._id, siteId: g.siteId, siteCode: g.siteCode,
        timestamp: new Date(now - i * 3600e3),
        fuelLevel: Math.max(2, (g.fuelLevel ?? 60) + (Math.random() - 0.3) * 10),
        temperature: (g.temperature ?? 45) + (Math.random() - 0.5) * 8,
        batteryVoltage: (g.batteryVoltage ?? 12) + (Math.random() - 0.5) * 0.4,
        runtimeHours: (g.runtimeHours ?? 0) - i * 0.1,
        status: g.status, source: "simulator",
      });
    }
  }
  await Reading.insertMany(readings);

  // Fire the alert engine + maintenance sweep once so the demo has live signals.
  await sweepAll();
  await sweep();

  const [users, generators, alerts, workOrders, plans] = await Promise.all([
    User.countDocuments(),
    Generator.countDocuments(),
    Alert.countDocuments(),
    WorkOrder.countDocuments(),
    MaintenancePlan.countDocuments(),
  ]);

  return { users, sites: 2, generators, alerts, workOrders, plans, readings: readings.length };
};

module.exports = { runSeed };

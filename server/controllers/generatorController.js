const asyncHandler = require('../utils/asyncHandler');
const Generator = require('../models/Generator');
const { parseNumber } = require('../utils/telemetry');
const { recordReading } = require('../services/telemetryService');
const { generatorHistory } = require('../services/analyticsService');
const { diffObjects } = require('../services/auditService');

const sanitizeGeneratorPayload = (payload = {}) => {
  const cleanedPayload = {
    siteId: payload.siteId,
    siteCode: payload.siteCode?.toString().trim().toUpperCase(),
    generatorId: payload.generatorId?.toString().trim(),
    serialNumber: payload.serialNumber?.toString().trim(),
    make: payload.make?.toString().trim(),
    model: payload.model?.toString().trim(),
    installationDate: payload.installationDate,
    status: payload.status,
    lastMaintenance: payload.lastMaintenance,
  };

  const capacityKVA = parseNumber(payload.capacityKVA);
  if (capacityKVA !== undefined) cleanedPayload.capacityKVA = capacityKVA;

  const fuelTankSize = parseNumber(payload.fuelTankSize);
  if (fuelTankSize !== undefined) cleanedPayload.fuelTankSize = fuelTankSize;

  const fuelLevel = parseNumber(payload.fuelLevel);
  if (fuelLevel !== undefined) cleanedPayload.fuelLevel = fuelLevel;

  const batteryVoltage = parseNumber(payload.batteryVoltage);
  if (batteryVoltage !== undefined) cleanedPayload.batteryVoltage = batteryVoltage;

  const temperature = parseNumber(payload.temperature);
  if (temperature !== undefined) cleanedPayload.temperature = temperature;

  const runtimeHours = parseNumber(payload.runtimeHours);
  if (runtimeHours !== undefined) cleanedPayload.runtimeHours = runtimeHours;

  return Object.fromEntries(
    Object.entries(cleanedPayload).filter(([, value]) => value !== undefined && value !== '')
  );
};

// @desc    Get all generators
// @route   GET /api/generators
// @access  Private
const getGenerators = asyncHandler(async (req, res) => {
  const pageSize = Number(req.query.limit) || 10;
  const page = Number(req.query.page) || 1;

  const filter = {};
  if (req.query.search) {
    filter.$or = [
      { generatorId: { $regex: req.query.search, $options: 'i' } },
      { siteCode: { $regex: req.query.search, $options: 'i' } },
      { make: { $regex: req.query.search, $options: 'i' } },
      { model: { $regex: req.query.search, $options: 'i' } },
    ];
  }
  if (req.query.siteId) filter.siteId = req.query.siteId;
  if (req.query.siteCode) filter.siteCode = req.query.siteCode.toString().trim().toUpperCase();
  if (req.query.status) filter.status = req.query.status;
  if (req.query.isDecommissioned) filter.isDecommissioned = req.query.isDecommissioned === 'true';

  const count = await Generator.countDocuments(filter);
  const generators = await Generator.find(filter)
    .populate('siteId', 'name location')
    .limit(pageSize)
    .skip(pageSize * (page - 1))
    .sort({ createdAt: -1 });

  res.json({
    generators,
    page,
    pages: Math.ceil(count / pageSize),
    total: count,
  });
});

// @desc    Create a generator
// @route   POST /api/generators
// @access  Private/Admin
const createGenerator = asyncHandler(async (req, res) => {
  const payload = sanitizeGeneratorPayload(req.body);
  if (!payload.serialNumber && payload.generatorId) {
    payload.serialNumber = payload.generatorId;
  }
  const generator = await Generator.create(payload);
  await req.audit({
    action: 'create',
    entity: 'Generator',
    entityId: generator._id,
    entityLabel: generator.generatorId,
  });
  res.status(201).json(generator);
});

// @desc    Update a generator
// @route   PUT /api/generators/:id
// @access  Private/Admin,Engineer
const updateGenerator = asyncHandler(async (req, res) => {
  const payload = sanitizeGeneratorPayload(req.body);
  const existing = await Generator.findById(req.params.id);
  if (!existing) {
    res.status(404);
    throw new Error('Generator not found');
  }

  const before = {};
  Object.keys(payload).forEach((k) => {
    before[k] = existing[k];
  });

  const updatedGenerator = await Generator.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  });

  await req.audit({
    action: 'update',
    entity: 'Generator',
    entityId: updatedGenerator._id,
    entityLabel: updatedGenerator.generatorId,
    diff: diffObjects(before, payload),
  });

  res.json(updatedGenerator);
});

// @desc    Receive a monitoring reading and update telemetry/status/runtime
// @route   POST /api/generators/:id/readings
// @access  Private
const ingestMonitoringReading = asyncHandler(async (req, res) => {
  const generator = await Generator.findById(req.params.id).populate('siteId', 'name');

  if (!generator) {
    res.status(404);
    throw new Error('Generator not found');
  }

  if (generator.isDecommissioned) {
    res.status(400);
    throw new Error('Cannot record monitoring readings for a decommissioned generator');
  }

  const { alertResult } = await recordReading(generator, req.body, 'manual');
  res.json({ generator, alerts: alertResult });
});

// @desc    Time-series reading history for a generator
// @route   GET /api/generators/:id/history?range=24h|7d|30d|90d
// @access  Private
const getGeneratorHistoryData = asyncHandler(async (req, res) => {
  const generator = await Generator.findById(req.params.id).select('_id');
  if (!generator) {
    res.status(404);
    throw new Error('Generator not found');
  }
  const readings = await generatorHistory(req.params.id, req.query.range, Number(req.query.points) || 500);
  res.json(readings);
});

// @desc    Decommission a generator
// @route   PATCH /api/generators/:id/decommission
// @access  Private/Admin
const decommissionGenerator = asyncHandler(async (req, res) => {
  const generator = await Generator.findById(req.params.id);

  if (generator) {
    generator.isDecommissioned = !generator.isDecommissioned;
    if (generator.isDecommissioned) {
      generator.status = 'Standby';
    }
    const updatedGenerator = await generator.save();
    await req.audit({
      action: updatedGenerator.isDecommissioned ? 'decommission' : 'recommission',
      entity: 'Generator',
      entityId: updatedGenerator._id,
      entityLabel: updatedGenerator.generatorId,
    });
    res.json(updatedGenerator);
  } else {
    res.status(404);
    throw new Error('Generator not found');
  }
});

// @desc    Current telemetry snapshot for all active generators (read-only).
//          Simulated drift, when enabled, is applied by utils/simulator.js.
// @route   GET /api/generators/realtime
// @access  Private
const getRealtimeData = asyncHandler(async (req, res) => {
  const generators = await Generator.find({ isDecommissioned: false })
    .populate('siteId', 'name')
    .sort({ createdAt: -1 });

  res.json(generators);
});

module.exports = {
  getGenerators,
  createGenerator,
  updateGenerator,
  decommissionGenerator,
  ingestMonitoringReading,
  getGeneratorHistoryData,
  getRealtimeData,
};

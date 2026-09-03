const asyncHandler = require('../utils/asyncHandler');
const ThresholdConfig = require('../models/ThresholdConfig');
const Generator = require('../models/Generator');
const { resolveThresholds, THRESHOLD_FIELDS } = require('../services/thresholdService');

// @desc    List threshold configs (+ built-in defaults)
// @route   GET /api/thresholds
// @access  Private
const getThresholds = asyncHandler(async (req, res) => {
  const configs = await ThresholdConfig.find({})
    .populate('siteId', 'name siteCode')
    .populate('generatorId', 'generatorId')
    .sort({ scope: 1 })
    .lean();
  res.json({ defaults: ThresholdConfig.DEFAULTS, configs });
});

// @desc    Effective (resolved) thresholds for a generator
// @route   GET /api/thresholds/effective/:generatorId
// @access  Private
const getEffectiveThresholds = asyncHandler(async (req, res) => {
  const generator = await Generator.findById(req.params.generatorId);
  if (!generator) {
    res.status(404);
    throw new Error('Generator not found');
  }
  res.json(await resolveThresholds(generator));
});

// @desc    Create or update a threshold config
// @route   PUT /api/thresholds
// @access  Private/Admin,Engineer
const upsertThreshold = asyncHandler(async (req, res) => {
  const { scope, siteId, generatorId } = req.body;
  if (!['global', 'site', 'generator'].includes(scope)) {
    res.status(400);
    throw new Error('scope must be global, site or generator');
  }
  if (scope === 'site' && !siteId) {
    res.status(400);
    throw new Error('siteId is required for site scope');
  }
  if (scope === 'generator' && !generatorId) {
    res.status(400);
    throw new Error('generatorId is required for generator scope');
  }

  const key = {
    scope,
    siteId: scope === 'site' ? siteId : undefined,
    generatorId: scope === 'generator' ? generatorId : undefined,
  };

  const update = { ...key, updatedBy: req.user._id };
  for (const field of THRESHOLD_FIELDS) {
    if (req.body[field] !== undefined && req.body[field] !== null && req.body[field] !== '') {
      update[field] = Number(req.body[field]);
    }
  }

  const before = await ThresholdConfig.findOne(key).lean();
  const config = await ThresholdConfig.findOneAndUpdate(key, update, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });

  await req.audit({
    action: before ? 'update' : 'create',
    entity: 'ThresholdConfig',
    entityId: config._id,
    entityLabel: `${scope} thresholds`,
  });

  res.status(before ? 200 : 201).json(config);
});

// @desc    Delete a threshold config
// @route   DELETE /api/thresholds/:id
// @access  Private/Admin
const deleteThreshold = asyncHandler(async (req, res) => {
  const config = await ThresholdConfig.findByIdAndDelete(req.params.id);
  if (!config) {
    res.status(404);
    throw new Error('Threshold config not found');
  }
  await req.audit({ action: 'delete', entity: 'ThresholdConfig', entityId: config._id, entityLabel: `${config.scope} thresholds` });
  res.json({ success: true });
});

module.exports = { getThresholds, getEffectiveThresholds, upsertThreshold, deleteThreshold };

const asyncHandler = require('../utils/asyncHandler');
const MaintenancePlan = require('../models/MaintenancePlan');
const Generator = require('../models/Generator');
const { computeNextDue, sweep } = require('../services/maintenanceService');
const { diffObjects } = require('../services/auditService');

const EDITABLE = [
  'name',
  'intervalType',
  'intervalValue',
  'checklist',
  'priority',
  'leadTimeDays',
  'slaDays',
  'isActive',
  'anchorDate',
  'anchorRuntimeHours',
];

const withNextDue = (plan) => {
  const generator = plan.generatorId && plan.generatorId.runtimeHours !== undefined ? plan.generatorId : null;
  const next = computeNextDue(plan, generator || {});
  return { ...(plan.toObject ? plan.toObject() : plan), nextDue: next };
};

// @desc    List maintenance plans
// @route   GET /api/maintenance-plans
// @access  Private
const getPlans = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.generatorId) filter.generatorId = req.query.generatorId;
  const plans = await MaintenancePlan.find(filter)
    .populate('generatorId', 'generatorId serialNumber runtimeHours siteCode isDecommissioned')
    .sort({ createdAt: -1 });
  res.json(plans.map(withNextDue));
});

// @desc    Get one plan
// @route   GET /api/maintenance-plans/:id
// @access  Private
const getPlan = asyncHandler(async (req, res) => {
  const plan = await MaintenancePlan.findById(req.params.id).populate(
    'generatorId',
    'generatorId serialNumber runtimeHours'
  );
  if (!plan) {
    res.status(404);
    throw new Error('Plan not found');
  }
  res.json(withNextDue(plan));
});

// @desc    Create a plan
// @route   POST /api/maintenance-plans
// @access  Private/Admin,Engineer
const createPlan = asyncHandler(async (req, res) => {
  const generator = await Generator.findById(req.body.generatorId);
  if (!generator) {
    res.status(404);
    throw new Error('Generator not found');
  }
  if (!['days', 'runtimeHours'].includes(req.body.intervalType)) {
    res.status(400);
    throw new Error('intervalType must be "days" or "runtimeHours"');
  }
  if (!(Number(req.body.intervalValue) > 0)) {
    res.status(400);
    throw new Error('intervalValue must be a positive number');
  }

  const plan = await MaintenancePlan.create({
    generatorId: generator._id,
    name: req.body.name,
    intervalType: req.body.intervalType,
    intervalValue: Number(req.body.intervalValue),
    checklist: Array.isArray(req.body.checklist) ? req.body.checklist.map(String) : [],
    priority: req.body.priority || 'medium',
    leadTimeDays: req.body.leadTimeDays ?? 3,
    slaDays: req.body.slaDays ?? 7,
    anchorRuntimeHours: req.body.anchorRuntimeHours ?? generator.runtimeHours ?? 0,
    createdBy: req.user._id,
  });

  await req.audit({ action: 'create', entity: 'MaintenancePlan', entityId: plan._id, entityLabel: plan.name });
  res.status(201).json(plan);
});

// @desc    Update a plan
// @route   PUT /api/maintenance-plans/:id
// @access  Private/Admin,Engineer
const updatePlan = asyncHandler(async (req, res) => {
  const plan = await MaintenancePlan.findById(req.params.id);
  if (!plan) {
    res.status(404);
    throw new Error('Plan not found');
  }
  const before = {};
  const after = {};
  for (const field of EDITABLE) {
    if (req.body[field] === undefined) continue;
    before[field] = plan[field];
    plan[field] = field === 'checklist' ? req.body.checklist.map(String) : req.body[field];
    after[field] = plan[field];
  }
  await plan.save();
  await req.audit({
    action: 'update',
    entity: 'MaintenancePlan',
    entityId: plan._id,
    entityLabel: plan.name,
    diff: diffObjects(before, after),
  });
  res.json(plan);
});

// @desc    Delete a plan
// @route   DELETE /api/maintenance-plans/:id
// @access  Private/Admin,Engineer
const deletePlan = asyncHandler(async (req, res) => {
  const plan = await MaintenancePlan.findByIdAndDelete(req.params.id);
  if (!plan) {
    res.status(404);
    throw new Error('Plan not found');
  }
  await req.audit({ action: 'delete', entity: 'MaintenancePlan', entityId: plan._id, entityLabel: plan.name });
  res.json({ success: true });
});

// @desc    Run the maintenance sweep now (generate due work orders, flag overdue)
// @route   POST /api/maintenance-plans/run-sweep
// @access  Private/Admin,Engineer
const runSweep = asyncHandler(async (req, res) => {
  const result = await sweep();
  await req.audit({ action: 'update', entity: 'MaintenancePlan', entityLabel: 'manual sweep', meta: result });
  res.json(result);
});

module.exports = { getPlans, getPlan, createPlan, updatePlan, deletePlan, runSweep };

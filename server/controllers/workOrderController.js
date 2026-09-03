const asyncHandler = require('../utils/asyncHandler');
const WorkOrder = require('../models/WorkOrder');
const Generator = require('../models/Generator');
const { applyStatusChange, syncGeneratorStatus, pushTimeline } = require('../services/workOrderService');
const { notifyUser } = require('../services/notificationService');
const { diffObjects } = require('../services/auditService');
const User = require('../models/User');

const DAY_MS = 24 * 60 * 60 * 1000;
const EDITABLE = ['title', 'description', 'type', 'priority', 'scheduledDate', 'slaDueAt', 'laborHours', 'laborRate', 'checklist'];

const populate = (q) =>
  q
    .populate('generatorId', 'generatorId serialNumber siteCode')
    .populate('siteId', 'name')
    .populate('assignee', 'name role')
    .populate('createdBy', 'name')
    .populate('planId', 'name intervalType intervalValue');

// @desc    List work orders
// @route   GET /api/work-orders
// @access  Private
const getWorkOrders = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.generatorId) filter.generatorId = req.query.generatorId;
  if (req.query.siteId) filter.siteId = req.query.siteId;
  if (req.query.mine === 'true') filter.assignee = req.user._id;
  else if (req.query.assignee) filter.assignee = req.query.assignee;
  if (req.query.active === 'true') filter.status = { $in: WorkOrder.ACTIVE_STATUSES };
  if (req.query.overdue === 'true') {
    filter.status = { $in: WorkOrder.ACTIVE_STATUSES };
    filter.slaDueAt = { $lt: new Date() };
  }

  const pageSize = Math.min(Number(req.query.limit) || 20, 200);
  const page = Number(req.query.page) || 1;

  const [total, workOrders] = await Promise.all([
    WorkOrder.countDocuments(filter),
    populate(WorkOrder.find(filter))
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1)),
  ]);

  res.json({ workOrders, page, pages: Math.ceil(total / pageSize) || 1, total });
});

// @desc    Work order counts for badges
// @route   GET /api/work-orders/stats
// @access  Private
const getWorkOrderStats = asyncHandler(async (req, res) => {
  const all = await WorkOrder.find({}).select('status slaDueAt assignee').lean();
  const now = Date.now();
  const active = all.filter((w) => WorkOrder.ACTIVE_STATUSES.includes(w.status));
  res.json({
    open: active.length,
    overdue: active.filter((w) => w.slaDueAt && new Date(w.slaDueAt) < now).length,
    mine: active.filter((w) => String(w.assignee) === String(req.user._id)).length,
    completed: all.filter((w) => w.status === 'completed').length,
  });
});

// @desc    Get one work order
// @route   GET /api/work-orders/:id
// @access  Private
const getWorkOrder = asyncHandler(async (req, res) => {
  const workOrder = await populate(WorkOrder.findById(req.params.id)).populate('timeline.by', 'name');
  if (!workOrder) {
    res.status(404);
    throw new Error('Work order not found');
  }
  res.json(workOrder);
});

// @desc    Create a work order
// @route   POST /api/work-orders
// @access  Private/Admin,Engineer,Technician
const createWorkOrder = asyncHandler(async (req, res) => {
  const generator = await Generator.findById(req.body.generatorId);
  if (!generator) {
    res.status(404);
    throw new Error('Generator not found');
  }
  if (generator.isDecommissioned) {
    res.status(400);
    throw new Error('Cannot open a work order for a decommissioned generator');
  }

  const slaDueAt =
    req.body.slaDueAt ||
    new Date(Date.now() + (Number(req.body.slaDays) || 7) * DAY_MS);

  const workOrder = await WorkOrder.create({
    generatorId: generator._id,
    siteId: generator.siteId,
    title: req.body.title,
    description: req.body.description,
    type: req.body.type || 'corrective',
    priority: req.body.priority || 'medium',
    scheduledDate: req.body.scheduledDate,
    slaDueAt,
    assignee: req.body.assignee || undefined,
    checklist: Array.isArray(req.body.checklist)
      ? req.body.checklist.map((label) => ({ label: String(label), done: false }))
      : [],
    createdBy: req.user._id,
    timeline: [{ at: new Date(), by: req.user._id, byName: req.user.name, action: 'create' }],
  });

  await syncGeneratorStatus(generator._id);
  await req.audit({ action: 'create', entity: 'WorkOrder', entityId: workOrder._id, entityLabel: workOrder.code });

  if (workOrder.assignee) {
    const assignee = await User.findById(workOrder.assignee);
    await notifyUser(assignee, {
      title: `Assigned: ${workOrder.title}`,
      body: `${generator.generatorId} — ${workOrder.code}`,
      type: 'workorder',
      link: '/work-orders',
      workOrderId: workOrder._id,
      severity: 'info',
    });
  }

  res.status(201).json(await populate(WorkOrder.findById(workOrder._id)));
});

// @desc    Update work order fields
// @route   PUT /api/work-orders/:id
// @access  Private/Admin,Engineer,Technician
const updateWorkOrder = asyncHandler(async (req, res) => {
  const workOrder = await WorkOrder.findById(req.params.id);
  if (!workOrder) {
    res.status(404);
    throw new Error('Work order not found');
  }

  const before = {};
  const after = {};
  for (const field of EDITABLE) {
    if (req.body[field] === undefined) continue;
    before[field] = workOrder[field];
    if (field === 'checklist' && Array.isArray(req.body.checklist)) {
      workOrder.checklist = req.body.checklist.map((c) =>
        typeof c === 'string' ? { label: c, done: false } : { label: c.label, done: !!c.done }
      );
    } else {
      workOrder[field] = req.body[field];
    }
    after[field] = workOrder[field];
  }

  await workOrder.save();
  await req.audit({
    action: 'update',
    entity: 'WorkOrder',
    entityId: workOrder._id,
    entityLabel: workOrder.code,
    diff: diffObjects(before, after),
  });
  res.json(await populate(WorkOrder.findById(workOrder._id)));
});

// @desc    Change status
// @route   PATCH /api/work-orders/:id/status
// @access  Private/Admin,Engineer,Technician
const changeStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  if (!WorkOrder.WORK_ORDER_STATUSES.includes(status)) {
    res.status(400);
    throw new Error('Invalid status');
  }
  const workOrder = await WorkOrder.findById(req.params.id);
  if (!workOrder) {
    res.status(404);
    throw new Error('Work order not found');
  }

  const from = workOrder.status;
  await applyStatusChange(workOrder, status, req.user, note);
  await req.audit({
    action: 'status_change',
    entity: 'WorkOrder',
    entityId: workOrder._id,
    entityLabel: workOrder.code,
    diff: { status: { from, to: status } },
  });
  res.json(await populate(WorkOrder.findById(workOrder._id)));
});

// @desc    Assign
// @route   PATCH /api/work-orders/:id/assign
// @access  Private/Admin,Engineer,Technician
const assignWorkOrder = asyncHandler(async (req, res) => {
  const workOrder = await WorkOrder.findById(req.params.id);
  if (!workOrder) {
    res.status(404);
    throw new Error('Work order not found');
  }
  const prev = String(workOrder.assignee || '');
  workOrder.assignee = req.body.assignee || null;
  if (workOrder.status === 'open' && workOrder.assignee) workOrder.status = 'assigned';
  pushTimeline(workOrder, {
    by: req.user._id,
    byName: req.user.name,
    action: 'assign',
    note: req.body.assignee ? 'Assigned' : 'Unassigned',
  });
  await workOrder.save();
  await req.audit({ action: 'assign', entity: 'WorkOrder', entityId: workOrder._id, entityLabel: workOrder.code, meta: { assignee: req.body.assignee } });

  if (workOrder.assignee && String(workOrder.assignee) !== prev) {
    const assignee = await User.findById(workOrder.assignee);
    await notifyUser(assignee, {
      title: `Assigned: ${workOrder.title}`,
      body: workOrder.code,
      type: 'workorder',
      link: '/work-orders',
      workOrderId: workOrder._id,
      severity: 'info',
    });
  }
  res.json(await populate(WorkOrder.findById(workOrder._id)));
});

// @desc    Add a part
// @route   POST /api/work-orders/:id/parts
// @access  Private/Admin,Engineer,Technician
const addPart = asyncHandler(async (req, res) => {
  const workOrder = await WorkOrder.findById(req.params.id);
  if (!workOrder) {
    res.status(404);
    throw new Error('Work order not found');
  }
  if (!req.body.name) {
    res.status(400);
    throw new Error('Part name is required');
  }
  workOrder.parts.push({
    name: req.body.name,
    quantity: Number(req.body.quantity) || 1,
    unitCost: Number(req.body.unitCost) || 0,
  });
  await workOrder.save();
  res.status(201).json(await populate(WorkOrder.findById(workOrder._id)));
});

// @desc    Remove a part
// @route   DELETE /api/work-orders/:id/parts/:partId
// @access  Private/Admin,Engineer,Technician
const removePart = asyncHandler(async (req, res) => {
  const workOrder = await WorkOrder.findById(req.params.id);
  if (!workOrder) {
    res.status(404);
    throw new Error('Work order not found');
  }
  workOrder.parts.id(req.params.partId)?.deleteOne();
  await workOrder.save();
  res.json(await populate(WorkOrder.findById(workOrder._id)));
});

// @desc    Attach a file
// @route   POST /api/work-orders/:id/attachments
// @access  Private/Admin,Engineer,Technician
const addAttachment = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded');
  }
  const workOrder = await WorkOrder.findById(req.params.id);
  if (!workOrder) {
    res.status(404);
    throw new Error('Work order not found');
  }
  workOrder.attachments.push({
    filename: req.file.filename,
    originalName: req.file.originalname,
    url: `/uploads/${req.file.filename}`,
    size: req.file.size,
    mimeType: req.file.mimetype,
    uploadedBy: req.user._id,
  });
  pushTimeline(workOrder, { by: req.user._id, byName: req.user.name, action: 'attachment', note: req.file.originalname });
  await workOrder.save();
  res.status(201).json(await populate(WorkOrder.findById(workOrder._id)));
});

// @desc    Sign off (complete with sign-off record)
// @route   POST /api/work-orders/:id/sign-off
// @access  Private/Admin,Engineer,Technician
const signOff = asyncHandler(async (req, res) => {
  const workOrder = await WorkOrder.findById(req.params.id);
  if (!workOrder) {
    res.status(404);
    throw new Error('Work order not found');
  }
  workOrder.signOff = { by: req.user._id, byName: req.user.name, at: new Date(), notes: req.body.notes };
  pushTimeline(workOrder, { by: req.user._id, byName: req.user.name, action: 'sign_off', note: req.body.notes });
  await applyStatusChange(workOrder, 'completed', req.user, 'Signed off');
  await req.audit({ action: 'sign_off', entity: 'WorkOrder', entityId: workOrder._id, entityLabel: workOrder.code });
  res.json(await populate(WorkOrder.findById(workOrder._id)));
});

// @desc    Delete a work order
// @route   DELETE /api/work-orders/:id
// @access  Private/Admin
const deleteWorkOrder = asyncHandler(async (req, res) => {
  const workOrder = await WorkOrder.findByIdAndDelete(req.params.id);
  if (!workOrder) {
    res.status(404);
    throw new Error('Work order not found');
  }
  await syncGeneratorStatus(workOrder.generatorId);
  await req.audit({ action: 'delete', entity: 'WorkOrder', entityId: workOrder._id, entityLabel: workOrder.code });
  res.json({ success: true });
});

module.exports = {
  getWorkOrders,
  getWorkOrderStats,
  getWorkOrder,
  createWorkOrder,
  updateWorkOrder,
  changeStatus,
  assignWorkOrder,
  addPart,
  removePart,
  addAttachment,
  signOff,
  deleteWorkOrder,
};

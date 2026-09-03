const asyncHandler = require('../utils/asyncHandler');
const Alert = require('../models/Alert');
const realtime = require('../services/realtime');

const SEVERITY_RANK = { critical: 0, warning: 1, info: 2 };

const populateAlert = (query) =>
  query
    .populate('generatorId', 'generatorId serialNumber siteCode status')
    .populate('siteId', 'name')
    .populate('acknowledgedBy', 'name')
    .populate('resolvedBy', 'name')
    .populate('assignee', 'name role');

// @desc    List alerts
// @route   GET /api/alerts
// @access  Private
const getAlerts = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  else filter.status = { $in: ['open', 'acknowledged'] }; // default: active only
  if (req.query.status === 'all') delete filter.status;

  if (req.query.severity) filter.severity = req.query.severity;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.generatorId) filter.generatorId = req.query.generatorId;
  if (req.query.siteId) filter.siteId = req.query.siteId;

  const limit = Math.min(Number(req.query.limit) || 200, 500);
  const alerts = await populateAlert(Alert.find(filter)).limit(limit).lean();

  alerts.sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      new Date(b.lastSeenAt) - new Date(a.lastSeenAt)
  );

  res.json(alerts);
});

// @desc    Alert counts for badges
// @route   GET /api/alerts/stats
// @access  Private
const getAlertStats = asyncHandler(async (req, res) => {
  const active = await Alert.find({ status: { $in: ['open', 'acknowledged'] } }).select('severity status').lean();
  res.json({
    open: active.filter((a) => a.status === 'open').length,
    acknowledged: active.filter((a) => a.status === 'acknowledged').length,
    critical: active.filter((a) => a.severity === 'critical').length,
    warning: active.filter((a) => a.severity === 'warning').length,
    total: active.length,
  });
});

const loadAlert = async (id, res) => {
  const alert = await Alert.findById(id);
  if (!alert) {
    res.status(404);
    throw new Error('Alert not found');
  }
  return alert;
};

// @desc    Acknowledge an alert
// @route   PATCH /api/alerts/:id/acknowledge
// @access  Private/Admin,Engineer,NOC Manager,Technician
const acknowledgeAlert = asyncHandler(async (req, res) => {
  const alert = await loadAlert(req.params.id, res);
  if (alert.status === 'resolved') {
    res.status(400);
    throw new Error('Alert already resolved');
  }
  alert.status = 'acknowledged';
  alert.acknowledgedBy = req.user._id;
  alert.acknowledgedAt = new Date();
  if (req.body.note) {
    alert.notes.push({ body: req.body.note, author: req.user._id, authorName: req.user.name });
  }
  await alert.save();
  await req.audit({ action: 'acknowledge', entity: 'Alert', entityId: alert._id, entityLabel: alert.message });
  realtime.emitAll('alert:updated', alert.toJSON());
  res.json(await populateAlert(Alert.findById(alert._id)));
});

// @desc    Resolve an alert
// @route   PATCH /api/alerts/:id/resolve
// @access  Private/Admin,Engineer,NOC Manager
const resolveAlert = asyncHandler(async (req, res) => {
  const alert = await loadAlert(req.params.id, res);
  alert.status = 'resolved';
  alert.resolvedBy = req.user._id;
  alert.resolvedAt = new Date();
  alert.autoResolved = false;
  if (req.body.note) {
    alert.notes.push({ body: req.body.note, author: req.user._id, authorName: req.user.name });
  }
  await alert.save();
  await req.audit({ action: 'resolve', entity: 'Alert', entityId: alert._id, entityLabel: alert.message });
  realtime.emitAll('alert:updated', alert.toJSON());
  res.json(await populateAlert(Alert.findById(alert._id)));
});

// @desc    Assign an alert to a user
// @route   PATCH /api/alerts/:id/assign
// @access  Private/Admin,Engineer,NOC Manager
const assignAlert = asyncHandler(async (req, res) => {
  const alert = await loadAlert(req.params.id, res);
  alert.assignee = req.body.assignee || null;
  await alert.save();
  await req.audit({ action: 'assign', entity: 'Alert', entityId: alert._id, entityLabel: alert.message, meta: { assignee: req.body.assignee } });
  realtime.emitAll('alert:updated', alert.toJSON());
  res.json(await populateAlert(Alert.findById(alert._id)));
});

// @desc    Add a note to an alert
// @route   POST /api/alerts/:id/notes
// @access  Private/Admin,Engineer,NOC Manager,Technician
const addNote = asyncHandler(async (req, res) => {
  if (!req.body.body) {
    res.status(400);
    throw new Error('Note body is required');
  }
  const alert = await loadAlert(req.params.id, res);
  alert.notes.push({ body: req.body.body, author: req.user._id, authorName: req.user.name });
  await alert.save();
  realtime.emitAll('alert:updated', alert.toJSON());
  res.json(await populateAlert(Alert.findById(alert._id)));
});

module.exports = {
  getAlerts,
  getAlertStats,
  acknowledgeAlert,
  resolveAlert,
  assignAlert,
  addNote,
};

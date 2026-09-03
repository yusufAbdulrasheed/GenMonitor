const asyncHandler = require('../utils/asyncHandler');
const AuditEvent = require('../models/AuditEvent');

// @desc    List audit / activity events
// @route   GET /api/activity
// @access  Private/Admin,NOC Manager
const getActivity = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.entity) filter.entity = req.query.entity;
  if (req.query.entityId) filter.entityId = req.query.entityId;
  if (req.query.action) filter.action = req.query.action;
  if (req.query.actorId) filter['actor.userId'] = req.query.actorId;
  if (req.query.from || req.query.to) {
    filter.at = {};
    if (req.query.from) filter.at.$gte = new Date(req.query.from);
    if (req.query.to) filter.at.$lte = new Date(req.query.to);
  }

  const pageSize = Math.min(Number(req.query.limit) || 50, 200);
  const page = Number(req.query.page) || 1;

  const [total, events] = await Promise.all([
    AuditEvent.countDocuments(filter),
    AuditEvent.find(filter)
      .sort({ at: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .lean(),
  ]);

  res.json({ events, page, pages: Math.ceil(total / pageSize) || 1, total });
});

module.exports = { getActivity };

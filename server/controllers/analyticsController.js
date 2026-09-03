const asyncHandler = require('../utils/asyncHandler');
const { fleetSummary, generatorAnalytics } = require('../services/analyticsService');

// @desc    Fleet-wide KPI summary
// @route   GET /api/analytics/summary?range=24h|7d|30d|90d
// @access  Private
const getSummary = asyncHandler(async (req, res) => {
  res.json(await fleetSummary(req.query.range));
});

// @desc    Per-generator analytics
// @route   GET /api/analytics/generators/:id?range=7d
// @access  Private
const getGeneratorSummary = asyncHandler(async (req, res) => {
  res.json(await generatorAnalytics(req.params.id, req.query.range));
});

module.exports = { getSummary, getGeneratorSummary };

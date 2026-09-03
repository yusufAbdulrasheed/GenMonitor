const asyncHandler = require('../utils/asyncHandler');
const Site = require('../models/Site');

// @desc    Get all sites
// @route   GET /api/sites
// @access  Private
const getSites = asyncHandler(async (req, res) => {
  const sites = await Site.find({}).sort({ name: 1 });
  res.json(sites);
});

// @desc    Create a site
// @route   POST /api/sites
// @access  Private/Admin
const createSite = asyncHandler(async (req, res) => {
  const { name, siteCode, location, coordinates, status } = req.body;

  if (!name || !siteCode || !location) {
    res.status(400);
    throw new Error('name, siteCode and location are required');
  }

  const normalizedCode = siteCode.toString().trim().toUpperCase();
  const existing = await Site.findOne({ siteCode: normalizedCode });
  if (existing) {
    res.status(409);
    throw new Error('A site with that siteCode already exists');
  }

  const site = await Site.create({ name, siteCode: normalizedCode, location, coordinates, status });
  res.status(201).json(site);
});

module.exports = { getSites, createSite };

const asyncHandler = require('../utils/asyncHandler');
const ApiKey = require('../models/ApiKey');
const Generator = require('../models/Generator');

const publicKey = (k) => ({
  id: k._id,
  name: k.name,
  prefix: k.prefix,
  scope: k.scope,
  generatorId: k.generatorId,
  isActive: k.isActive,
  lastUsedAt: k.lastUsedAt,
  expiresAt: k.expiresAt,
  createdAt: k.createdAt,
});

// @desc    List API keys
// @route   GET /api/api-keys
// @access  Private/Admin
const getApiKeys = asyncHandler(async (req, res) => {
  const keys = await ApiKey.find({}).populate('generatorId', 'generatorId').sort({ createdAt: -1 });
  res.json(keys.map((k) => ({ ...publicKey(k), generator: k.generatorId })));
});

// @desc    Create an API key (raw key returned once)
// @route   POST /api/api-keys
// @access  Private/Admin
const createApiKey = asyncHandler(async (req, res) => {
  const { name, scope = 'fleet', generatorId, expiresAt } = req.body;
  if (!name) {
    res.status(400);
    throw new Error('name is required');
  }
  if (scope === 'generator') {
    if (!generatorId || !(await Generator.exists({ _id: generatorId }))) {
      res.status(400);
      throw new Error('valid generatorId is required for generator scope');
    }
  }

  const { raw, keyHash, prefix } = ApiKey.generate();
  const key = await ApiKey.create({
    name,
    keyHash,
    prefix,
    scope,
    generatorId: scope === 'generator' ? generatorId : undefined,
    expiresAt: expiresAt || undefined,
    createdBy: req.user._id,
  });

  await req.audit({ action: 'create', entity: 'ApiKey', entityId: key._id, entityLabel: name });

  // The raw key is shown exactly once.
  res.status(201).json({ ...publicKey(key), key: raw });
});

// @desc    Revoke an API key
// @route   PATCH /api/api-keys/:id/revoke
// @access  Private/Admin
const revokeApiKey = asyncHandler(async (req, res) => {
  const key = await ApiKey.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!key) {
    res.status(404);
    throw new Error('API key not found');
  }
  await req.audit({ action: 'update', entity: 'ApiKey', entityId: key._id, entityLabel: key.name, diff: { isActive: { from: true, to: false } } });
  res.json(publicKey(key));
});

// @desc    Delete an API key
// @route   DELETE /api/api-keys/:id
// @access  Private/Admin
const deleteApiKey = asyncHandler(async (req, res) => {
  const key = await ApiKey.findByIdAndDelete(req.params.id);
  if (!key) {
    res.status(404);
    throw new Error('API key not found');
  }
  await req.audit({ action: 'delete', entity: 'ApiKey', entityId: key._id, entityLabel: key.name });
  res.json({ success: true });
});

module.exports = { getApiKeys, createApiKey, revokeApiKey, deleteApiKey };

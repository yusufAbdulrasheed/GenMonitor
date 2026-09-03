const ApiKey = require('../models/ApiKey');

// Authenticates device / gateway requests via the `x-api-key` header.
const apiKeyAuth = async (req, res, next) => {
  const raw = req.headers['x-api-key'] || req.query.apiKey;
  if (!raw) {
    return res.status(401).json({ message: 'API key required' });
  }

  const key = await ApiKey.findOne({ keyHash: ApiKey.hash(raw), isActive: true });
  if (!key) {
    return res.status(401).json({ message: 'Invalid API key' });
  }
  if (key.expiresAt && key.expiresAt.getTime() < Date.now()) {
    return res.status(401).json({ message: 'API key expired' });
  }

  key.lastUsedAt = new Date();
  key.save().catch(() => {});

  req.apiKey = key;
  next();
};

module.exports = { apiKeyAuth };

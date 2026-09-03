const mongoose = require('mongoose');
const crypto = require('crypto');

// API keys for device / IoT gateway telemetry ingestion. The raw key is shown
// exactly once at creation; only its SHA-256 hash is stored.
const apiKeySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    keyHash: { type: String, required: true, unique: true, index: true },
    prefix: { type: String, required: true }, // first chars, for display
    scope: { type: String, enum: ['fleet', 'generator'], default: 'fleet' },
    generatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Generator' },
    isActive: { type: Boolean, default: true },
    lastUsedAt: { type: Date },
    expiresAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

apiKeySchema.statics.generate = function () {
  const raw = `gmk_${crypto.randomBytes(24).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, keyHash, prefix: raw.slice(0, 12) };
};

apiKeySchema.statics.hash = function (raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
};

module.exports = mongoose.model('ApiKey', apiKeySchema);

const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  isValid: { type: Boolean, default: true }
}, { timestamps: true });

// Check if token is expired
refreshTokenSchema.methods.isExpired = function () {
  return Date.now() >= this.expiresAt.getTime();
};

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);

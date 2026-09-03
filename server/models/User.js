const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, match: [/^\S+@\S+\.\S+$/, 'Invalid email format'] },
  phone: { type: String }, // E.164 format can be validated in controller or here
  role: { type: String, enum: ['Admin', 'Engineer', 'Technician', 'NOC Manager'], required: true },
  password: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  notificationPrefs: {
    emailOnCritical: { type: Boolean, default: true },
    emailOnWarning: { type: Boolean, default: false },
    inApp: { type: Boolean, default: true },
  },
  resetPasswordToken: { type: String },
  resetPasswordExpire: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

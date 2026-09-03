const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    body: { type: String },
    type: { type: String, enum: ['alert', 'workorder', 'maintenance', 'system'], default: 'system' },
    link: { type: String }, // client route, e.g. /alerts?id=...
    read: { type: Boolean, default: false, index: true },
    alertId: { type: mongoose.Schema.Types.ObjectId, ref: 'Alert' },
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder' },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
// Auto-purge notifications after 60 days.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

module.exports = mongoose.model('Notification', notificationSchema);

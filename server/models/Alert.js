const mongoose = require('mongoose');

const ALERT_TYPES = ['Fault', 'LowFuel', 'CriticalFuel', 'LowBattery', 'HighTemp', 'MaintenanceOverdue'];
const ALERT_SEVERITIES = ['critical', 'warning', 'info'];
const ALERT_STATUSES = ['open', 'acknowledged', 'resolved'];

const noteSchema = new mongoose.Schema(
  {
    body: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorName: { type: String },
    at: { type: Date, default: Date.now },
  },
  { _id: true }
);

const alertSchema = new mongoose.Schema(
  {
    generatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Generator', required: true, index: true },
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
    type: { type: String, enum: ALERT_TYPES, required: true },
    severity: { type: String, enum: ALERT_SEVERITIES, required: true },
    status: { type: String, enum: ALERT_STATUSES, default: 'open', index: true },
    message: { type: String, required: true },
    value: { type: Number }, // the reading value that triggered it
    threshold: { type: Number },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    autoResolved: { type: Boolean, default: false },
    notes: [noteSchema],
  },
  { timestamps: true }
);

// At most one non-resolved alert per (generator, type).
alertSchema.index(
  { generatorId: 1, type: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['open', 'acknowledged'] } } }
);

module.exports = mongoose.model('Alert', alertSchema);
module.exports.ALERT_TYPES = ALERT_TYPES;
module.exports.ALERT_SEVERITIES = ALERT_SEVERITIES;
module.exports.ALERT_STATUSES = ALERT_STATUSES;

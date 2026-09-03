const mongoose = require('mongoose');

// Immutable activity record for every mutating action.
const auditEventSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    actor: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String },
      email: { type: String },
      role: { type: String },
    },
    action: {
      type: String,
      enum: [
        'create',
        'update',
        'delete',
        'login',
        'logout',
        'decommission',
        'recommission',
        'acknowledge',
        'resolve',
        'assign',
        'status_change',
        'sign_off',
        'ingest',
      ],
      required: true,
    },
    entity: {
      type: String,
      enum: ['Generator', 'User', 'Site', 'WorkOrder', 'Alert', 'MaintenancePlan', 'ThresholdConfig', 'ApiKey', 'Auth'],
      required: true,
    },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    entityLabel: { type: String },
    diff: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: false }
);

auditEventSchema.index({ entity: 1, entityId: 1, at: -1 });
// Retain audit history for one year.
auditEventSchema.index({ at: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.model('AuditEvent', auditEventSchema);

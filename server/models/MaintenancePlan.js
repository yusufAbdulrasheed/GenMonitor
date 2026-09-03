const mongoose = require('mongoose');

// A recurring preventive-maintenance schedule for a generator. The scheduler
// generates WorkOrders from due plans.
const maintenancePlanSchema = new mongoose.Schema(
  {
    generatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Generator', required: true, index: true },
    name: { type: String, required: true },
    intervalType: { type: String, enum: ['days', 'runtimeHours'], required: true },
    intervalValue: { type: Number, required: true, min: 1 },
    checklist: [{ type: String }],
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    // How far ahead of the due point to open the work order.
    leadTimeDays: { type: Number, default: 3 },
    slaDays: { type: Number, default: 7 },

    isActive: { type: Boolean, default: true },

    // Anchors for the "next due" computation.
    anchorDate: { type: Date, default: Date.now },
    anchorRuntimeHours: { type: Number, default: 0 },

    lastGeneratedAt: { type: Date },
    lastGeneratedRuntimeHours: { type: Number },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MaintenancePlan', maintenancePlanSchema);

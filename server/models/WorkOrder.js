const mongoose = require('mongoose');

const WORK_ORDER_STATUSES = ['open', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled'];
const ACTIVE_STATUSES = ['open', 'assigned', 'in_progress', 'on_hold'];
const WORK_ORDER_TYPES = ['preventive', 'corrective', 'inspection'];
const WORK_ORDER_PRIORITIES = ['low', 'medium', 'high', 'critical'];

const DEFAULT_LABOR_RATE = Number(process.env.DEFAULT_LABOR_RATE) || 50;

const partSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    quantity: { type: Number, default: 1, min: 0 },
    unitCost: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const attachmentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String },
    url: { type: String, required: true },
    size: { type: Number },
    mimeType: { type: String },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const timelineSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    byName: { type: String },
    action: { type: String, required: true },
    note: { type: String },
    fromStatus: { type: String },
    toStatus: { type: String },
  },
  { _id: true }
);

const workOrderSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },
    generatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Generator', required: true, index: true },
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'MaintenancePlan' },

    title: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: WORK_ORDER_TYPES, default: 'corrective' },
    priority: { type: String, enum: WORK_ORDER_PRIORITIES, default: 'medium' },
    status: { type: String, enum: WORK_ORDER_STATUSES, default: 'open', index: true },

    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    scheduledDate: { type: Date },
    slaDueAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },

    checklist: [{ label: String, done: { type: Boolean, default: false } }],
    parts: [partSchema],
    laborHours: { type: Number, default: 0, min: 0 },
    laborRate: { type: Number, default: DEFAULT_LABOR_RATE, min: 0 },
    costTotal: { type: Number, default: 0 },

    attachments: [attachmentSchema],
    timeline: [timelineSchema],
    signOff: {
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      byName: { type: String },
      at: { type: Date },
      notes: { type: String },
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

workOrderSchema.virtual('isOverdue').get(function () {
  return Boolean(
    this.slaDueAt &&
      this.slaDueAt.getTime() < Date.now() &&
      !['completed', 'cancelled'].includes(this.status)
  );
});

// Mongoose 9 middleware: synchronous hooks, no `next` callback.
workOrderSchema.pre('validate', function () {
  if (!this.code) {
    this.code = `WO-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 46656)
      .toString(36)
      .toUpperCase()
      .padStart(3, '0')}`;
  }
});

workOrderSchema.pre('save', function () {
  const partsCost = (this.parts || []).reduce(
    (sum, p) => sum + (p.quantity || 0) * (p.unitCost || 0),
    0
  );
  this.costTotal = Math.round((partsCost + (this.laborHours || 0) * (this.laborRate || 0)) * 100) / 100;
});

module.exports = mongoose.model('WorkOrder', workOrderSchema);
module.exports.WORK_ORDER_STATUSES = WORK_ORDER_STATUSES;
module.exports.ACTIVE_STATUSES = ACTIVE_STATUSES;
module.exports.WORK_ORDER_TYPES = WORK_ORDER_TYPES;
module.exports.WORK_ORDER_PRIORITIES = WORK_ORDER_PRIORITIES;

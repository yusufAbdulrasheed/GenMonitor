const mongoose = require('mongoose');
const config = require('../config/env');

// Time-series telemetry history. One document per reading (simulated, device, or
// manual). A TTL index enforces retention.
const readingSchema = new mongoose.Schema(
  {
    generatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Generator', required: true, index: true },
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
    siteCode: { type: String },
    timestamp: { type: Date, required: true, default: Date.now },
    fuelLevel: { type: Number },
    temperature: { type: Number },
    batteryVoltage: { type: Number },
    runtimeHours: { type: Number },
    status: { type: String, enum: ['Running', 'Standby', 'Fault', 'UnderMaintenance'] },
    source: { type: String, enum: ['simulator', 'device', 'manual'], default: 'manual' },
  },
  { timestamps: true }
);

readingSchema.index({ generatorId: 1, timestamp: -1 });

if (config.readingRetentionDays > 0) {
  readingSchema.index(
    { timestamp: 1 },
    { expireAfterSeconds: config.readingRetentionDays * 24 * 60 * 60 }
  );
}

module.exports = mongoose.model('Reading', readingSchema);

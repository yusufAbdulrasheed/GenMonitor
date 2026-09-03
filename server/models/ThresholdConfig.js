const mongoose = require('mongoose');

// Alert thresholds. Resolution order at evaluation time:
//   generator override -> site override -> global -> built-in DEFAULTS
const thresholdConfigSchema = new mongoose.Schema(
  {
    scope: { type: String, enum: ['global', 'site', 'generator'], required: true },
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
    generatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Generator' },

    lowFuelPct: { type: Number },
    criticalFuelPct: { type: Number },
    lowBatteryV: { type: Number },
    criticalBatteryV: { type: Number },
    highTempC: { type: Number },
    criticalTempC: { type: Number },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

thresholdConfigSchema.index({ scope: 1, siteId: 1, generatorId: 1 }, { unique: true });

const DEFAULTS = Object.freeze({
  lowFuelPct: 20,
  criticalFuelPct: 10,
  lowBatteryV: 11.8,
  criticalBatteryV: 11,
  highTempC: 85,
  criticalTempC: 95,
});

module.exports = mongoose.model('ThresholdConfig', thresholdConfigSchema);
module.exports.DEFAULTS = DEFAULTS;

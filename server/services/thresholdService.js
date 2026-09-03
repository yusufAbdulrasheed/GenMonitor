const ThresholdConfig = require('../models/ThresholdConfig');

const { DEFAULTS } = ThresholdConfig;

const FIELDS = [
  'lowFuelPct',
  'criticalFuelPct',
  'lowBatteryV',
  'criticalBatteryV',
  'highTempC',
  'criticalTempC',
];

const pickDefined = (doc) => {
  if (!doc) return {};
  const out = {};
  for (const f of FIELDS) {
    if (doc[f] !== undefined && doc[f] !== null) out[f] = doc[f];
  }
  return out;
};

/**
 * Effective thresholds for a generator, merging (lowest to highest priority):
 * built-in DEFAULTS <- global config <- site config <- generator config.
 */
const resolveThresholds = async (generator) => {
  const siteId = generator.siteId?._id || generator.siteId;
  const generatorId = generator._id || generator.id;

  const [globalCfg, siteCfg, genCfg] = await Promise.all([
    ThresholdConfig.findOne({ scope: 'global' }).lean(),
    siteId ? ThresholdConfig.findOne({ scope: 'site', siteId }).lean() : null,
    ThresholdConfig.findOne({ scope: 'generator', generatorId }).lean(),
  ]);

  return {
    ...DEFAULTS,
    ...pickDefined(globalCfg),
    ...pickDefined(siteCfg),
    ...pickDefined(genCfg),
  };
};

module.exports = { resolveThresholds, THRESHOLD_FIELDS: FIELDS, DEFAULTS };

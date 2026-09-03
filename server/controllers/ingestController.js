const asyncHandler = require('../utils/asyncHandler');
const Generator = require('../models/Generator');
const { recordReading } = require('../services/telemetryService');
const auditService = require('../services/auditService');

// @desc    Ingest one or more telemetry readings from a device / gateway
// @route   POST /api/ingest/readings
// @access  Device (x-api-key)
//
// Body: a single reading, or { readings: [ ... ] }. Each reading may name its
// generator by `generatorId` or `serialNumber`; a generator-scoped key pins it.
const ingestReadings = asyncHandler(async (req, res) => {
  const batch = Array.isArray(req.body?.readings) ? req.body.readings : [req.body];
  if (!batch.length) {
    res.status(400);
    throw new Error('No readings provided');
  }
  if (batch.length > 500) {
    res.status(413);
    throw new Error('Batch too large (max 500 readings)');
  }

  const pinnedGeneratorId = req.apiKey.scope === 'generator' ? String(req.apiKey.generatorId) : null;
  const results = [];
  const cache = new Map();

  for (const reading of batch) {
    const ref = pinnedGeneratorId || reading.generatorId || reading.serialNumber;
    if (!ref) {
      results.push({ ok: false, error: 'generator reference missing' });
      continue;
    }

    let generator = cache.get(ref);
    if (!generator) {
      generator = pinnedGeneratorId
        ? await Generator.findById(pinnedGeneratorId)
        : await Generator.findOne({
            $or: [
              ...(reading.generatorId && reading.generatorId.match?.(/^[0-9a-fA-F]{24}$/)
                ? [{ _id: reading.generatorId }]
                : []),
              { generatorId: ref },
              { serialNumber: ref },
            ],
          });
      if (generator) cache.set(ref, generator);
    }

    if (!generator) {
      results.push({ ok: false, ref, error: 'generator not found' });
      continue;
    }
    if (generator.isDecommissioned) {
      results.push({ ok: false, ref, error: 'generator decommissioned' });
      continue;
    }

    try {
      const { alertResult } = await recordReading(generator, reading, 'device');
      results.push({ ok: true, generatorId: generator._id, status: generator.status, alerts: alertResult });
    } catch (err) {
      results.push({ ok: false, ref, error: err.message });
    }
  }

  const accepted = results.filter((r) => r.ok).length;
  auditService.record({
    action: 'ingest',
    entity: 'Generator',
    entityLabel: req.apiKey.name,
    meta: { accepted, rejected: results.length - accepted },
    ip: req.ip,
  });

  res.status(accepted ? 202 : 422).json({ accepted, rejected: results.length - accepted, results });
});

module.exports = { ingestReadings };

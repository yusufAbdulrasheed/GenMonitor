// Shared telemetry helpers used by the generator controller (real readings via
// POST /api/generators/:id/readings) and by the background simulator.

const VALID_STATUSES = ['Running', 'Standby', 'Fault', 'UnderMaintenance'];

const parseNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * Mutates `generator` (a Mongoose doc) in place from a monitoring reading.
 * Does not save.
 */
const applyMonitoringReading = (generator, reading = {}) => {
  const fuelLevel = parseNumber(reading.fuelLevel);
  const temperature = parseNumber(reading.temperature);
  const batteryVoltage = parseNumber(reading.batteryVoltage);

  if (fuelLevel !== undefined) {
    generator.fuelLevel = Math.max(0, Math.min(100, fuelLevel));
  }
  if (temperature !== undefined) {
    generator.temperature = temperature;
  }
  if (batteryVoltage !== undefined) {
    generator.batteryVoltage = batteryVoltage;
  }

  const incomingStatus = typeof reading.status === 'string' ? reading.status.trim() : '';
  const statusFromPayload = VALID_STATUSES.includes(incomingStatus) ? incomingStatus : null;
  let nextStatus = statusFromPayload || generator.status;

  if (!statusFromPayload) {
    const effectiveFuel = generator.fuelLevel;
    const effectiveTemp = generator.temperature;
    const effectiveBattery = generator.batteryVoltage;
    const lowFuelFault = typeof effectiveFuel === 'number' && effectiveFuel <= 5;
    const highTempFault = typeof effectiveTemp === 'number' && effectiveTemp >= 90;
    const lowBatteryFault = typeof effectiveBattery === 'number' && effectiveBattery < 11;

    if (lowFuelFault || highTempFault || lowBatteryFault) {
      nextStatus = 'Fault';
    } else if (reading.isRunning === true) {
      nextStatus = 'Running';
    } else if (reading.isRunning === false) {
      nextStatus = 'Standby';
    }
  }

  if (generator.status === 'UnderMaintenance' && nextStatus === 'Running') {
    nextStatus = 'UnderMaintenance';
  }

  if (generator.isDecommissioned) {
    nextStatus = 'Standby';
  }

  const runtimeIncrementHours = parseNumber(reading.runtimeIncrementHours);
  const readingIntervalMinutes = parseNumber(reading.readingIntervalMinutes);
  let runtimeIncrement = runtimeIncrementHours;

  if (runtimeIncrement === undefined && readingIntervalMinutes !== undefined && readingIntervalMinutes > 0) {
    runtimeIncrement = readingIntervalMinutes / 60;
  }

  if (runtimeIncrement === undefined && nextStatus === 'Running') {
    runtimeIncrement = 5 / 60;
  }

  if (nextStatus === 'Running' && runtimeIncrement && runtimeIncrement > 0) {
    generator.runtimeHours = (generator.runtimeHours || 0) + runtimeIncrement;
  }

  generator.status = nextStatus;
  const readingTimestamp = reading.readingTimestamp ? new Date(reading.readingTimestamp) : new Date();
  generator.lastReadingAt = Number.isNaN(readingTimestamp.getTime()) ? new Date() : readingTimestamp;
};

/**
 * Produce a randomised reading that nudges an active generator's telemetry,
 * mimicking a live feed. Returns a reading object for `applyMonitoringReading`.
 */
const buildSimulatedReading = (generator) => {
  const fuel = generator.fuelLevel ?? 100;
  const temp = generator.temperature ?? 40;
  const volt = generator.batteryVoltage ?? 12;

  const newFuel = Math.max(0, fuel - Math.random() * 0.5);
  const newTemp = Math.max(20, Math.min(100, temp + (Math.random() - 0.5) * 5));
  const newVolt = Math.max(10, Math.min(14, volt + (Math.random() - 0.5) * 0.2));

  let status;
  if (newFuel === 0) {
    status = 'Standby'; // out of fuel, stops running
  } else if (newFuel < 10 || newTemp > 85) {
    status = 'Fault';
  }

  return {
    fuelLevel: newFuel,
    temperature: newTemp,
    batteryVoltage: newVolt,
    status,
    runtimeIncrementHours: 0.05,
    readingTimestamp: new Date(),
  };
};

module.exports = {
  VALID_STATUSES,
  parseNumber,
  applyMonitoringReading,
  buildSimulatedReading,
};

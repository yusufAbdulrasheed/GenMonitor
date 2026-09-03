const WorkOrder = require('../models/WorkOrder');
const Generator = require('../models/Generator');
const realtime = require('./realtime');

const { ACTIVE_STATUSES } = WorkOrder;

/**
 * Keep a generator's status in sync with its open work orders:
 * any active work order -> UnderMaintenance; none -> back to Standby.
 */
const syncGeneratorStatus = async (generatorId) => {
  const [generator, activeCount] = await Promise.all([
    Generator.findById(generatorId),
    WorkOrder.countDocuments({ generatorId, status: { $in: ACTIVE_STATUSES } }),
  ]);

  if (!generator || generator.isDecommissioned) return;

  if (activeCount > 0 && generator.status !== 'UnderMaintenance') {
    generator.status = 'UnderMaintenance';
    await generator.save();
    realtime.emitAll('telemetry:update', { generatorId: generator._id, status: generator.status });
  } else if (activeCount === 0 && generator.status === 'UnderMaintenance') {
    generator.status = 'Standby';
    generator.lastMaintenance = new Date();
    await generator.save();
    realtime.emitAll('telemetry:update', { generatorId: generator._id, status: generator.status });
  }
};

const pushTimeline = (workOrder, entry) => {
  workOrder.timeline.push({ at: new Date(), ...entry });
};

/**
 * Transition a work order to a new status, recording the timeline entry and
 * side effects (startedAt / completedAt).
 */
const applyStatusChange = async (workOrder, toStatus, actor, note) => {
  const fromStatus = workOrder.status;
  if (fromStatus === toStatus) return workOrder;

  workOrder.status = toStatus;
  if (toStatus === 'in_progress' && !workOrder.startedAt) workOrder.startedAt = new Date();
  if (toStatus === 'completed') workOrder.completedAt = new Date();

  pushTimeline(workOrder, {
    by: actor?._id,
    byName: actor?.name,
    action: 'status_change',
    fromStatus,
    toStatus,
    note,
  });

  await workOrder.save();
  await syncGeneratorStatus(workOrder.generatorId);
  realtime.emitAll('workorder:updated', { id: workOrder._id, status: toStatus });
  return workOrder;
};

module.exports = { syncGeneratorStatus, applyStatusChange, pushTimeline, ACTIVE_STATUSES };

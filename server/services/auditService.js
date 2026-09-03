const AuditEvent = require('../models/AuditEvent');

/** Field-level diff between two plain objects, limited to `fields`. */
const diffObjects = (before = {}, after = {}, fields) => {
  const keys = fields || Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  const diff = {};
  for (const key of keys) {
    const from = before?.[key];
    const to = after?.[key];
    const norm = (v) => (v instanceof Date ? v.toISOString() : v);
    if (JSON.stringify(norm(from)) !== JSON.stringify(norm(to))) {
      diff[key] = { from: norm(from) ?? null, to: norm(to) ?? null };
    }
  }
  return diff;
};

/** Best-effort audit write — never throws into the request path. */
const record = async ({ actor, action, entity, entityId, entityLabel, diff, ip, meta }) => {
  try {
    await AuditEvent.create({
      at: new Date(),
      actor: actor
        ? { userId: actor._id || actor.userId, name: actor.name, email: actor.email, role: actor.role }
        : undefined,
      action,
      entity,
      entityId,
      entityLabel,
      diff: diff && Object.keys(diff).length ? diff : undefined,
      ip,
      meta,
    });
  } catch (err) {
    console.error('[audit] write failed:', err.message);
  }
};

module.exports = { record, diffObjects };

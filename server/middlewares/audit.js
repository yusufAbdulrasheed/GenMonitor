const auditService = require('../services/auditService');

// Injects req.audit(payload) — a recorder bound to the current actor + IP.
// Safe to mount globally; actor is omitted for unauthenticated calls.
const attachAudit = (req, res, next) => {
  req.audit = (payload) =>
    auditService.record({
      actor: req.user,
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip,
      ...payload,
    });
  next();
};

module.exports = { attachAudit };

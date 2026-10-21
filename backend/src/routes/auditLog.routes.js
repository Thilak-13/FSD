const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

/**
 * Guard for GET /api/audit-log:
 * - If invoiceId is provided, allows any authenticated user through to the controller
 *   for invoice-level access enforcement (Admin/Approver any, Requester own only).
 * - If invoiceId is absent, restricts access strictly to Admin role (returning 403 otherwise).
 */
const auditLogAccessGuard = (req, res, next) => {
  if (!req.query.invoiceId) {
    return requireRole('Admin')(req, res, next);
  }
  next();
};

/**
 * GET /api/audit-log
 * Requires authentication.
 * Query filters: invoiceId, user/performedBy, action
 */
router.get(
  '/',
  requireAuth,
  auditLogAccessGuard,
  auditLogController.getAuditLogs
);

module.exports = router;
module.exports.auditLogRouter = router;

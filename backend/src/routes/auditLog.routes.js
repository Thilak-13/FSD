const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

/**
 * GET /api/audit-log
 * Requires authentication and Admin role only.
 * Query filters: invoiceId, user/performedBy, action
 */
router.get(
  '/',
  requireAuth,
  requireRole('Admin'),
  auditLogController.getAuditLogs
);

module.exports = router;
module.exports.auditLogRouter = router;

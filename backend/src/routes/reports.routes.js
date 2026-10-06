const { Router } = require('express');
const reportsController = require('../controllers/reportsController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

const router = Router();

router.get('/summary', requireAuth, reportsController.getReportsSummary);
router.get(
  '/vendor-breakdown',
  requireAuth,
  requireRole('Admin', 'Approver'),
  reportsController.getVendorBreakdown
);

module.exports = router;

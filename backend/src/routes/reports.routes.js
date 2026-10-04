const { Router } = require('express');
const reportsController = require('../controllers/reportsController');

const router = Router();

router.get('/summary', reportsController.getReportsSummary);
router.get('/vendor-breakdown', reportsController.getVendorBreakdown);

module.exports = router;

const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const vendorController = require('../controllers/vendorController');

const router = Router();

// Require auth for vendor routes
router.get('/', requireAuth, vendorController.getVendors);
router.get('/:id', requireAuth, vendorController.getVendorById);
router.post('/', requireAuth, requireRole('Admin'), vendorController.createVendor);

module.exports = router;

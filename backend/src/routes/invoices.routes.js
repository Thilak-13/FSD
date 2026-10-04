const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const upload = require('../middleware/upload');

// Public or general read endpoints
router.get('/', invoiceController.getInvoices);
router.get('/:id', invoiceController.getInvoiceById);

// Protected mutation endpoints
router.post('/', requireAuth, invoiceController.createInvoice);
router.patch(
  '/:id/status',
  requireAuth,
  requireRole('Admin', 'Approver'),
  invoiceController.updateInvoiceStatus
);
router.post(
  '/:id/attachment',
  upload.single('file'),
  invoiceController.uploadAttachment
);

module.exports = router;
module.exports.router = router;
module.exports.invoicesRouter = router;

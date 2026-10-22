const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const upload = require('../middleware/upload');

// Turns multer errors (bad type, oversize) into a 400 the client can show.
const uploadSingleFile = (req, res, next) =>
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    const error =
      err.code === 'LIMIT_FILE_SIZE' ? 'File too large. Maximum size is 10 MB.' : err.message;
    return res.status(400).json({ error });
  });

// Protected read endpoints
router.get('/', requireAuth, invoiceController.getInvoices);
router.get('/:id/attachment', requireAuth, invoiceController.getInvoiceAttachment);
router.get('/:id', requireAuth, invoiceController.getInvoiceById);

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
  requireAuth,
  uploadSingleFile,
  invoiceController.uploadAttachment
);

module.exports = router;
module.exports.router = router;
module.exports.invoicesRouter = router;

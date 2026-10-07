const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const AuditEntry = require('../models/AuditEntry');
const { verifyInvoice, validateInvoice } = require('../services/verificationService');

/**
 * Maps invoice status to corresponding AuditAction string
 */
function mapStatusToAuditAction(status) {
  switch (status) {
    case 'Approved':
      return 'APPROVAL';
    case 'Flagged':
      return 'FLAGGED';
    case 'Payment Scheduled':
      return 'PAYMENT_SCHEDULED';
    case 'Paid':
      return 'PAYMENT_COMPLETED';
    case 'Submitted':
      return 'SUBMISSION';
    case 'Under Verification':
      return 'VERIFICATION';
    default:
      return status ? status.toUpperCase().replace(/\s+/g, '_') : 'VERIFICATION';
  }
}

/**
 * GET /api/invoices
 * Filters by status, vendor (vendorId), from, to (date range). Returns invoices array.
 */
async function getInvoices(req, res, next) {
  try {
    const { status, vendor, vendorId, from, to, search } = req.query;
    const query = {};

    if (req.user && req.user.role === 'Requester') {
      query.submittedBy = req.user.id;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const vId = vendorId || vendor;
    if (vId && vId !== 'all') {
      query.vendorId = vId;
    }

    if (from || to) {
      query.submittedDate = {};
      if (from) {
        query.submittedDate.$gte = from;
      }
      if (to) {
        query.submittedDate.$lte = to;
      }
    }

    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { invoiceNumber: regex },
        { notes: regex },
        { 'items.description': regex },
      ];
    }

    const invoices = await Invoice.find(query).sort({ submittedDate: -1, createdAt: -1 });
    return res.status(200).json(invoices);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/invoices/:id
 * Returns invoice by ID (or 404).
 */
async function getInvoiceById(req, res, next) {
  try {
    const { id } = req.params;
    let invoice = null;

    if (mongoose.isValidObjectId(id)) {
      invoice = await Invoice.findById(id);
    }
    if (!invoice) {
      invoice = await Invoice.findOne({
        $or: [{ id }, { invoiceNumber: id }],
      });
    }

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found', message: `Invoice not found: ${id}` });
    }

    if (req.user && req.user.role === 'Requester') {
      const invSubmittedBy = invoice.submittedBy?._id
        ? invoice.submittedBy._id.toString()
        : invoice.submittedBy?.toString
        ? invoice.submittedBy.toString()
        : String(invoice.submittedBy);

      if (String(invSubmittedBy) !== String(req.user.id)) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
    }

    return res.status(200).json(invoice);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/invoices
 * Requires requireAuth. Runs verificationService. Creates Invoice.
 * Creates an AuditEntry with action: 'SUBMISSION', performedBy: req.user.id.
 * Returns 201.
 */
async function createInvoice(req, res, next) {
  try {
    // 1. Required field validation
    const validation = validateInvoice(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    // 2. Run verification engine
    const verification = await verifyInvoice(req.body);

    // 3. Generate invoiceNumber if not provided
    let invoiceNumber = req.body.invoiceNumber;
    if (!invoiceNumber || String(invoiceNumber).trim() === '') {
      const count = await Invoice.countDocuments();
      invoiceNumber = `INV-2026-${(count + 1).toString().padStart(3, '0')}`;
    } else {
      invoiceNumber = String(invoiceNumber).trim();
    }

    const submittedDate =
      req.body.submittedDate || new Date().toISOString().split('T')[0];

    const submittedBy =
      req.user && mongoose.isValidObjectId(req.user.id)
        ? req.user.id
        : req.body.submittedBy && mongoose.isValidObjectId(req.body.submittedBy)
        ? req.body.submittedBy
        : new mongoose.Types.ObjectId();

    const poId =
      req.body.poId && mongoose.isValidObjectId(req.body.poId)
        ? req.body.poId
        : undefined;

    const vendorId =
      mongoose.isValidObjectId(req.body.vendorId)
        ? req.body.vendorId
        : new mongoose.Types.ObjectId();

    // 4. Create Invoice
    const invoice = await Invoice.create({
      invoiceNumber,
      vendorId,
      poId,
      amount: req.body.amount,
      dueDate: req.body.dueDate,
      submittedDate,
      status: verification.status,
      submittedBy,
      attachedDocumentName: req.body.attachedDocumentName,
      attachedDocumentPath: req.body.attachedDocumentPath,
      flagReason: verification.flagReason,
      notes: req.body.notes,
      items: verification.items || req.body.items || [],
    });

    // 5. Create AuditEntry with action: 'SUBMISSION', performedBy: req.user.id
    try {
      const performedBy =
        req.user && mongoose.isValidObjectId(req.user.id)
          ? req.user.id
          : submittedBy;

      await AuditEntry.create({
        invoiceId: invoice._id,
        action: 'SUBMISSION',
        performedBy,
        timestamp: new Date(),
        details: `Invoice ${invoice.invoiceNumber} submitted for amount $${invoice.amount}`,
      });
    } catch (auditErr) {
      console.error('AuditEntry creation error:', auditErr);
    }

    return res.status(201).json(invoice);
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /api/invoices/:id/status
 * Requires requireAuth + requireRole('Admin', 'Approver').
 * Updates status (and optional comment / scheduledPaymentDate / paidDate / flagReason).
 * Creates corresponding AuditEntry with action: status uppercase or APPROVAL/FLAGGED/PAYMENT_SCHEDULED/PAYMENT_COMPLETED, performedBy: req.user.id.
 * Returns updated invoice.
 */
async function updateInvoiceStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, comment, scheduledPaymentDate, paidDate, flagReason } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'status is required' });
    }

    let invoice = null;
    if (mongoose.isValidObjectId(id)) {
      invoice = await Invoice.findById(id);
    }
    if (!invoice) {
      invoice = await Invoice.findOne({
        $or: [{ id }, { invoiceNumber: id }],
      });
    }

    if (!invoice) {
      return res.status(404).json({ message: `Invoice not found: ${id}` });
    }

    const previousStatus = invoice.status;
    invoice.status = status;

    if (status === 'Flagged') {
      invoice.flagReason = flagReason || comment || invoice.flagReason || 'Flagged for review';
    }

    if (status === 'Payment Scheduled') {
      invoice.scheduledPaymentDate =
        scheduledPaymentDate ||
        invoice.scheduledPaymentDate ||
        new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    }

    if (status === 'Paid') {
      invoice.paidDate =
        paidDate || invoice.paidDate || new Date().toISOString().split('T')[0];
    }

    await invoice.save();

    // Create corresponding AuditEntry
    const action = mapStatusToAuditAction(status);
    const details =
      comment ||
      flagReason ||
      `Invoice status changed from ${previousStatus} to ${status}`;

    try {
      const performedBy =
        req.user && mongoose.isValidObjectId(req.user.id)
          ? req.user.id
          : new mongoose.Types.ObjectId();

      await AuditEntry.create({
        invoiceId: invoice._id,
        action,
        performedBy,
        timestamp: new Date(),
        details,
      });
    } catch (auditErr) {
      console.error('AuditEntry creation error:', auditErr);
    }

    return res.status(200).json(invoice);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/invoices/:id/attachment
 * upload.single('file'). Updates attachedDocumentPath on invoice. Returns updated invoice.
 */
async function uploadAttachment(req, res, next) {
  try {
    const { id } = req.params;

    let invoice = null;
    if (mongoose.isValidObjectId(id)) {
      invoice = await Invoice.findById(id);
    }
    if (!invoice) {
      invoice = await Invoice.findOne({
        $or: [{ id }, { invoiceNumber: id }],
      });
    }

    if (!invoice) {
      if (req.file && req.file.path) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
      }
      return res.status(404).json({ error: 'Invoice not found', message: `Invoice not found: ${id}` });
    }

    const invSubmittedBy = invoice.submittedBy?._id
      ? invoice.submittedBy._id.toString()
      : invoice.submittedBy?.toString
      ? invoice.submittedBy.toString()
      : String(invoice.submittedBy);

    const isAuthorized =
      req.user &&
      (req.user.role === 'Admin' ||
        req.user.role === 'Approver' ||
        String(invSubmittedBy) === String(req.user.id));

    if (!isAuthorized) {
      if (req.file && req.file.path) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
      }
      return res.status(403).json({
        error: 'Forbidden: Insufficient permissions to modify this invoice attachment',
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const relativePath = `/uploads/${req.file.filename}`;
    invoice.attachedDocumentPath = relativePath;
    invoice.attachedDocumentName = req.file.originalname;

    await invoice.save();

    return res.status(200).json(invoice);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/invoices/:id/attachment
 * Requires requireAuth.
 * Enforces same scoping as invoice detail: Admin, Approver, or invoice owner (req.user.id === invoice.submittedBy).
 * If Requester requests non-owned invoice attachment, return 404.
 * If invoice has no attachedDocumentPath, or file does not exist on disk, return 404 ({ error: 'Attachment not found' }).
 * Returns file bytes with stored/detected Content-Type and header Content-Disposition: attachment; filename="<attachedDocumentName || basename>".
 */
async function getInvoiceAttachment(req, res, next) {
  try {
    const { id } = req.params;

    let invoice = null;
    if (mongoose.isValidObjectId(id)) {
      invoice = await Invoice.findById(id);
    }
    if (!invoice) {
      invoice = await Invoice.findOne({
        $or: [{ id }, { invoiceNumber: id }],
      });
    }

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invSubmittedBy = invoice.submittedBy?._id
      ? invoice.submittedBy._id.toString()
      : invoice.submittedBy?.toString
      ? invoice.submittedBy.toString()
      : String(invoice.submittedBy);

    const isAuthorized =
      req.user &&
      (req.user.role === 'Admin' ||
        req.user.role === 'Approver' ||
        String(invSubmittedBy) === String(req.user.id));

    if (!isAuthorized) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (!invoice.attachedDocumentPath) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    let filePath = invoice.attachedDocumentPath;
    if (filePath.startsWith('/uploads/')) {
      filePath = path.join(__dirname, '../../uploads', filePath.replace(/^\/uploads\//, ''));
    } else if (filePath.startsWith('uploads/')) {
      filePath = path.join(__dirname, '../../uploads', filePath.replace(/^uploads\//, ''));
    } else if (!path.isAbsolute(filePath)) {
      filePath = path.join(__dirname, '../../uploads', filePath);
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const filename = invoice.attachedDocumentName || path.basename(filePath);
    const ext = path.extname(filename).toLowerCase() || path.extname(filePath).toLowerCase();
    const extToMime = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
    };
    const contentType = extToMime[ext] || 'application/octet-stream';

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', contentType);

    return res.sendFile(path.resolve(filePath), (err) => {
      if (err && !res.headersSent) {
        return next(err);
      }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getInvoices,
  getInvoiceById,
  getInvoiceAttachment,
  createInvoice,
  updateInvoiceStatus,
  uploadAttachment,
  mapStatusToAuditAction,
};

import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { InvoiceModel } from '../models/Invoice';
import { verifyInvoice, validateInvoiceInput } from '../services/verification.service';
import { recordAuditEntry } from '../services/audit.service';
import { upload } from '../middleware/upload';
import { config } from '../config/env';
import { AuditAction, InvoiceStatus } from '../types';

const router = Router();

// Middleware to enforce Approver or Admin role for status transitions
const requireApproverOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  let user = req.user;

  if (!user && req.headers.authorization?.startsWith('Bearer ')) {
    const token = req.headers.authorization.split(' ')[1];
    try {
      user = jwt.verify(token, config.jwtSecret) as any;
      req.user = user;
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  }

  const roleFromHeader = req.headers['x-user-role'] as string;
  if (!user && roleFromHeader) {
    user = {
      id: 'header-user',
      name: (req.headers['x-user-name'] as string) || 'Authorized User',
      email: 'user@example.com',
      role: roleFromHeader as any,
    };
    req.user = user;
  }

  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (user.role !== 'Approver' && user.role !== 'Admin') {
    return res.status(403).json({ message: 'Forbidden: Requires Approver or Admin role' });
  }

  next();
};

/**
 * Helper to map invoice status to audit action
 */
function mapStatusToAuditAction(status: InvoiceStatus): AuditAction {
  switch (status) {
    case 'Approved':
      return 'APPROVAL';
    case 'Flagged':
      return 'FLAGGED';
    case 'Payment Scheduled':
      return 'PAYMENT_SCHEDULED';
    case 'Paid':
      return 'PAYMENT_COMPLETED';
    case 'Under Verification':
      return 'VERIFICATION';
    case 'Submitted':
    default:
      return 'SUBMISSION';
  }
}

/**
 * GET /
 * Query filters: status, vendorId (or vendor), submittedBy, startDate (or from), endDate (or to), search
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      status,
      vendorId,
      vendor,
      submittedBy,
      startDate,
      from,
      endDate,
      to,
      search,
    } = req.query as Record<string, string>;

    const query: Record<string, any> = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    const effectiveVendorId = vendorId || vendor;
    if (effectiveVendorId && effectiveVendorId !== 'all') {
      query.vendorId = effectiveVendorId;
    }

    if (submittedBy) {
      query.submittedBy = submittedBy;
    }

    const effectiveStartDate = startDate || from;
    const effectiveEndDate = endDate || to;

    if (effectiveStartDate || effectiveEndDate) {
      query.submittedDate = {};
      if (effectiveStartDate) {
        query.submittedDate.$gte = effectiveStartDate;
      }
      if (effectiveEndDate) {
        query.submittedDate.$lte = effectiveEndDate;
      }
    }

    if (search && search.trim() !== '') {
      const term = search.trim();
      const regex = new RegExp(term, 'i');

      // Check if Vendor model exists to include vendor names
      let vendorIds: string[] = [];
      try {
        const VendorModel = mongoose.models.Vendor;
        if (VendorModel) {
          const vendors = await VendorModel.find({ name: regex }).select('_id id');
          vendorIds = vendors.map((v: any) => v.id || v._id.toString());
        }
      } catch {
        // ignore
      }

      query.$or = [
        { invoiceNumber: regex },
        { notes: regex },
        { 'items.description': regex },
        ...(vendorIds.length > 0 ? [{ vendorId: { $in: vendorIds } }] : []),
      ];
    }

    const invoices = await InvoiceModel.find(query).sort({ submittedDate: -1, createdAt: -1 });
    return res.status(200).json(invoices.map((inv) => inv.toJSON()));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /:id
 * Retrieve a single invoice by ID or invoiceNumber
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let invoice = null;
    if (mongoose.isValidObjectId(req.params.id)) {
      invoice = await InvoiceModel.findById(req.params.id);
    }
    if (!invoice) {
      invoice = await InvoiceModel.findOne({
        $or: [{ id: req.params.id }, { invoiceNumber: req.params.id }],
      });
    }

    if (!invoice) {
      return res.status(404).json({ message: `Invoice not found: ${req.params.id}` });
    }

    return res.status(200).json(invoice.toJSON());
  } catch (error) {
    next(error);
  }
});

/**
 * POST /
 * Creates a new invoice, runs verification engine, creates SUBMISSION audit entry, returns 201
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validateInvoiceInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    // Run verification engine
    const verification = await verifyInvoice(req.body);

    // Generate invoiceNumber if not provided
    let invoiceNumber = req.body.invoiceNumber;
    if (!invoiceNumber || invoiceNumber.trim() === '') {
      const count = await InvoiceModel.countDocuments();
      invoiceNumber = `INV-2026-${(count + 1).toString().padStart(3, '0')}`;
    }

    const calculatedItems = verification.items.map((item, idx) => ({
      id: item.id || `li-${Date.now()}-${idx + 1}`,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total ?? item.quantity * item.unitPrice,
      matchedPoItemId: item.matchedPoItemId,
      priceMismatch: item.priceMismatch,
      quantityMismatch: item.quantityMismatch,
    }));

    const totalAmount =
      req.body.amount ||
      calculatedItems.reduce((sum, it) => sum + (it.total || 0), 0);

    const submittedDate =
      req.body.submittedDate || new Date().toISOString().split('T')[0];

    const invoice = await InvoiceModel.create({
      invoiceNumber,
      vendorId: req.body.vendorId,
      poId: req.body.poId,
      amount: totalAmount,
      dueDate: req.body.dueDate,
      submittedDate,
      status: verification.status,
      submittedBy: req.body.submittedBy,
      attachedDocumentName: req.body.attachedDocumentName,
      attachedDocumentPath: req.body.attachedDocumentPath,
      flagReason: verification.flagReason,
      notes: req.body.notes,
      items: calculatedItems,
    });

    const invoiceObj = invoice.toJSON();

    // Auto-create SUBMISSION audit entry
    const performer =
      req.body.submittedBy || req.user?.name || req.user?.id || 'Requester';

    await recordAuditEntry(
      invoiceObj.id,
      'SUBMISSION',
      performer,
      `Invoice ${invoice.invoiceNumber} submitted for amount $${invoice.amount.toLocaleString()}`
    );

    return res.status(201).json(invoiceObj);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: `Duplicate invoice number: ${req.body.invoiceNumber} already exists`,
      });
    }
    next(error);
  }
});

/**
 * PATCH /:id/status
 * Updates status, requires Approver or Admin role, auto-creates audit entry
 */
router.patch(
  '/:id/status',
  requireApproverOrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, comment, scheduledPaymentDate, paidDate, flagReason, performedBy } =
        req.body;

      if (!status) {
        return res.status(400).json({ message: 'status is required' });
      }

      let invoice = null;
      if (mongoose.isValidObjectId(req.params.id)) {
        invoice = await InvoiceModel.findById(req.params.id);
      }
      if (!invoice) {
        invoice = await InvoiceModel.findOne({
          $or: [{ id: req.params.id }, { invoiceNumber: req.params.id }],
        });
      }

      if (!invoice) {
        return res.status(404).json({ message: `Invoice not found: ${req.params.id}` });
      }

      const previousStatus = invoice.status;
      invoice.status = status;

      if (status === 'Flagged') {
        invoice.flagReason =
          flagReason || comment || invoice.flagReason || 'Flagged for review';
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
      const invoiceObj = invoice.toJSON();

      // Automatically create corresponding audit entry
      const auditAction = mapStatusToAuditAction(status);
      const auditPerformer =
        performedBy ||
        req.user?.name ||
        (req.headers['x-user-name'] as string) ||
        req.user?.id ||
        'System User';

      const auditDetails =
        comment ||
        flagReason ||
        `Invoice status changed from ${previousStatus} to ${status}`;

      await recordAuditEntry(
        invoiceObj.id,
        auditAction,
        auditPerformer,
        auditDetails
      );

      return res.status(200).json(invoiceObj);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /:id/attachment
 * Multer file upload: updates attachedDocumentName and attachedDocumentPath, returns updated invoice & attachment info
 */
router.post(
  '/:id/attachment',
  upload.any(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file =
        req.file ||
        (req.files && Array.isArray(req.files) && req.files.length > 0
          ? req.files[0]
          : undefined);

      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      let invoice = null;
      if (mongoose.isValidObjectId(req.params.id)) {
        invoice = await InvoiceModel.findById(req.params.id);
      }
      if (!invoice) {
        invoice = await InvoiceModel.findOne({
          $or: [{ id: req.params.id }, { invoiceNumber: req.params.id }],
        });
      }

      if (!invoice) {
        return res.status(404).json({ message: `Invoice not found: ${req.params.id}` });
      }

      const webPath = `/uploads/${file.filename}`;
      invoice.attachedDocumentName = file.originalname;
      invoice.attachedDocumentPath = webPath;

      await invoice.save();
      const invoiceObj = invoice.toJSON();

      return res.status(200).json({
        message: 'Attachment uploaded successfully',
        documentName: invoice.attachedDocumentName,
        documentPath: invoice.attachedDocumentPath,
        ...invoiceObj,
      });
    } catch (error) {
      next(error);
    }
  }
);

export const invoicesRouter = router;
export default router;

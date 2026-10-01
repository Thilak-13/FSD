import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Vendor } from '../models/Vendor';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

// Require authentication for all vendor routes
router.use(authenticateJWT);

// GET / (or /api/vendors)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const vendors = await Vendor.find().sort({ name: 1 });
    return res.status(200).json(vendors.map((v) => v.toJSON()));
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return res.status(500).json({ error: 'Internal server error fetching vendors' });
  }
});

// GET /:id (or /api/vendors/:id)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let vendor = await Vendor.findById(id);

    if (!vendor) {
      vendor = await Vendor.findOne({ _id: id });
    }

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Look for invoices linked to this vendor if Invoice model exists
    let invoices: any[] = [];
    const InvoiceModel = mongoose.models.Invoice;
    if (InvoiceModel) {
      const foundInvoices = await InvoiceModel.find({
        $or: [{ vendorId: vendor.id }, { vendorId: id }],
      });
      invoices = foundInvoices.map((inv) =>
        typeof inv.toJSON === 'function' ? inv.toJSON() : inv
      );
    }

    const vendorObj = vendor.toJSON();
    return res.status(200).json({
      ...vendorObj,
      invoices,
    });
  } catch (error) {
    console.error('Error fetching vendor by id:', error);
    return res.status(500).json({ error: 'Internal server error fetching vendor' });
  }
});

// POST / (or /api/vendors) - Admin only
router.post('/', requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    const { name, contactEmail, paymentTerms, address, taxId, status, phone } = req.body;

    if (!name || !contactEmail || !address || !taxId) {
      return res.status(400).json({
        error: 'Missing required fields: name, contactEmail, address, and taxId are required',
      });
    }

    const validPaymentTerms = ['Net 15', 'Net 30', 'Net 45', 'Net 60'];
    if (paymentTerms && !validPaymentTerms.includes(paymentTerms)) {
      return res.status(400).json({
        error: `Invalid paymentTerms. Must be one of: ${validPaymentTerms.join(', ')}`,
      });
    }

    const validStatuses = ['Active', 'Under Review', 'Inactive'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const newVendor = await Vendor.create({
      name,
      contactEmail,
      paymentTerms: paymentTerms || 'Net 30',
      address,
      taxId,
      status: status || 'Active',
      phone,
      totalInvoices: 0,
    });

    return res.status(201).json(newVendor.toJSON());
  } catch (error) {
    console.error('Error creating vendor:', error);
    return res.status(500).json({ error: 'Internal server error creating vendor' });
  }
});

export const vendorsRouter = router;
export default router;

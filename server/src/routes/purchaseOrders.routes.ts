import { Router, Request, Response } from 'express';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

// Require authentication for all purchase order routes
router.use(authenticateJWT);

// GET / (or /api/purchase-orders) - supports ?vendorId= filter
router.get('/', async (req: Request, res: Response) => {
  try {
    const { vendorId } = req.query;

    const filter: Record<string, any> = {};
    if (vendorId && typeof vendorId === 'string' && vendorId !== 'all') {
      filter.vendorId = vendorId;
    }

    const purchaseOrders = await PurchaseOrder.find(filter).sort({ poNumber: 1 });
    return res.status(200).json(purchaseOrders.map((po) => po.toJSON()));
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return res.status(500).json({ error: 'Internal server error fetching purchase orders' });
  }
});

// GET /:id (or /api/purchase-orders/:id)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    let order = await PurchaseOrder.findById(id);

    if (!order) {
      order = await PurchaseOrder.findOne({
        $or: [{ _id: id }, { poNumber: id }],
      });
    }

    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    return res.status(200).json(order.toJSON());
  } catch (error) {
    console.error('Error fetching purchase order by id:', error);
    return res.status(500).json({ error: 'Internal server error fetching purchase order' });
  }
});

// POST / (or /api/purchase-orders) - Helper for creating POs (Admin and Approver)
router.post('/', requireRole(['Admin', 'Approver']), async (req: Request, res: Response) => {
  try {
    const { poNumber, vendorId, amount, description, createdDate, status, items } = req.body;

    if (!poNumber || !vendorId || amount === undefined || !description || !createdDate) {
      return res.status(400).json({
        error: 'Missing required fields: poNumber, vendorId, amount, description, createdDate',
      });
    }

    const existing = await PurchaseOrder.findOne({ poNumber });
    if (existing) {
      return res.status(409).json({ error: `Purchase order with poNumber ${poNumber} already exists` });
    }

    const newPO = await PurchaseOrder.create({
      poNumber,
      vendorId,
      amount,
      description,
      createdDate,
      status: status || 'Open',
      items: items || [],
    });

    return res.status(201).json(newPO.toJSON());
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return res.status(500).json({ error: 'Internal server error creating purchase order' });
  }
});

export const purchaseOrdersRouter = router;
export default router;

const mongoose = require('mongoose');
const PurchaseOrder = require('../models/PurchaseOrder');

const formatPO = (po) => {
  const obj = po.toJSON ? po.toJSON() : (po.toObject ? po.toObject() : { ...po });
  if (!obj.id && obj._id) obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  if (Array.isArray(obj.items)) {
    obj.items = obj.items.map((item) => {
      const it = item && typeof item.toJSON === 'function' ? item.toJSON() : { ...item };
      if (!it.id && it._id) it.id = it._id.toString();
      delete it._id;
      delete it.__v;
      return it;
    });
  }
  return obj;
};

const getPurchaseOrders = async (req, res) => {
  try {
    const { vendorId } = req.query;
    const filter = {};

    if (vendorId && typeof vendorId === 'string' && vendorId !== 'all') {
      filter.vendorId = vendorId;
    }

    const purchaseOrders = await PurchaseOrder.find(filter).sort({ poNumber: 1 });
    return res.status(200).json(purchaseOrders.map(formatPO));
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return res.status(500).json({ error: 'Internal server error fetching purchase orders' });
  }
};

const getPurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    let order = null;

    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);
    if (isValidObjectId) {
      order = await PurchaseOrder.findById(id).catch(() => null);
    }

    if (!order) {
      order = await PurchaseOrder.findOne({ poNumber: id }).catch(() => null);
    }

    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    return res.status(200).json(formatPO(order));
  } catch (error) {
    console.error('Error fetching purchase order by id:', error);
    return res.status(500).json({ error: 'Internal server error fetching purchase order' });
  }
};

const createPurchaseOrder = async (req, res) => {
  try {
    const { poNumber, vendorId, amount, description, createdDate, status, items } = req.body;

    if (!poNumber || !vendorId || amount === undefined || !description) {
      return res.status(400).json({
        error: 'Missing required fields: poNumber, vendorId, amount, description'
      });
    }

    const existing = await PurchaseOrder.findOne({ poNumber });
    if (existing) {
      return res.status(409).json({
        error: `Purchase order with poNumber ${poNumber} already exists`
      });
    }

    const newPO = await PurchaseOrder.create({
      poNumber,
      vendorId,
      amount: Number(amount),
      description,
      createdDate: createdDate || new Date().toISOString().slice(0, 10),
      status: status || 'Open',
      items: items || []
    });

    return res.status(201).json(formatPO(newPO));
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return res.status(500).json({ error: 'Internal server error creating purchase order' });
  }
};

module.exports = {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder
};

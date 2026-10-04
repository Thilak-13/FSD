const mongoose = require('mongoose');
const Vendor = require('../models/Vendor');
const Invoice = require('../models/Invoice');

const formatVendor = (v) => {
  const obj = v.toJSON ? v.toJSON() : (v.toObject ? v.toObject() : { ...v });
  if (!obj.id && obj._id) obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

const getVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ name: 1 });
    // Compute totalInvoices dynamically per vendor from Invoice collection to prevent drift
    const invoiceCounts = await Invoice.aggregate([
      { $group: { _id: '$vendorId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map();
    for (const c of invoiceCounts) {
      if (c._id) {
        countMap.set(c._id.toString(), c.count);
      }
    }

    const formatted = vendors.map((v) => {
      const obj = formatVendor(v);
      const vId = (v._id ? v._id.toString() : obj.id) || obj.id;
      obj.totalInvoices = countMap.get(vId) || 0;
      return obj;
    });

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return res.status(500).json({ error: 'Internal server error fetching vendors' });
  }
};

const getVendorById = async (req, res) => {
  try {
    const { id } = req.params;
    let vendor = null;

    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);
    if (isValidObjectId) {
      vendor = await Vendor.findById(id).catch(() => null);
    }

    if (!vendor) {
      vendor = await Vendor.findOne({ id: id }).catch(() => null);
    }

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const vendorId = vendor.id || (vendor._id ? vendor._id.toString() : id);
    let invoices = [];
    try {
      const queryConditions = [{ vendorId: vendorId }];
      if (vendor._id) {
        queryConditions.push({ vendorId: vendor._id });
      }
      if (isValidObjectId) {
        queryConditions.push({ vendorId: id });
      }
      const foundInvoices = await Invoice.find({ $or: queryConditions });
      invoices = foundInvoices.map((inv) => {
        const item = inv.toJSON ? inv.toJSON() : (inv.toObject ? inv.toObject() : { ...inv });
        if (!item.id && item._id) item.id = item._id.toString();
        delete item._id;
        delete item.__v;
        return item;
      });
    } catch (invErr) {
      console.error('Error fetching vendor invoices:', invErr);
    }

    const vendorObj = formatVendor(vendor);
    vendorObj.totalInvoices = invoices.length; // computed on read
    return res.status(200).json({
      ...vendorObj,
      invoices,
    });
  } catch (error) {
    console.error('Error fetching vendor by id:', error);
    return res.status(500).json({ error: 'Internal server error fetching vendor' });
  }
};

const createVendor = async (req, res) => {
  try {
    const { name, contactEmail, paymentTerms, address, taxId, status, phone } = req.body;

    if (!name || !contactEmail || !paymentTerms || !address) {
      return res.status(400).json({
        error: 'Missing required fields: name, contactEmail, paymentTerms, and address are required',
      });
    }

    const validPaymentTerms = ['Net 15', 'Net 30', 'Net 45', 'Net 60'];
    if (!validPaymentTerms.includes(paymentTerms)) {
      return res.status(400).json({
        error: `Invalid paymentTerms. Must be one of: ${validPaymentTerms.join(', ')}`,
      });
    }

    const vendor = new Vendor({
      name,
      contactEmail,
      paymentTerms,
      address,
      taxId: taxId || '',
      status: status || 'Active',
      phone: phone || '',
      totalInvoices: 0,
    });

    const saved = await vendor.save();
    return res.status(201).json(formatVendor(saved));
  } catch (error) {
    console.error('Error creating vendor:', error);
    return res.status(500).json({ error: 'Internal server error creating vendor' });
  }
};

module.exports = {
  getVendors,
  getVendorById,
  createVendor,
};

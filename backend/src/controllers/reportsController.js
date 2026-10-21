const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Vendor = require('../models/Vendor');
const User = require('../models/User');

const isInvoiceInDateRange = (submittedDate, dueDate, from, to) => {
  const dateStr = submittedDate || dueDate;
  if (!dateStr) return false;

  const invTime = new Date(dateStr).getTime();
  if (isNaN(invTime)) return false;

  if (from) {
    const fromTime = new Date(from).getTime();
    if (!isNaN(fromTime) && invTime < fromTime) {
      return false;
    }
  }

  if (to) {
    let toTime;
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      toTime = new Date(`${to}T23:59:59.999Z`).getTime();
    } else {
      toTime = new Date(to).getTime();
    }

    if (!isNaN(toTime) && invTime > toTime) {
      return false;
    }
  }

  return true;
};

const getReportsSummary = async (req, res) => {
  try {
    const { from, to } = req.query;
    const query = {};
    if (req.user && req.user.role === 'Requester') {
      const matchCriteria = [];
      if (req.user.id) {
        if (mongoose.isValidObjectId(req.user.id)) {
          matchCriteria.push(new mongoose.Types.ObjectId(req.user.id));
        }
        matchCriteria.push(String(req.user.id));
      }
      if (req.user.email) {
        matchCriteria.push(req.user.email);
        matchCriteria.push(req.user.email.toLowerCase());
      }
      try {
        const userObj = await User.findOne({
          $or: [
            ...(req.user.id && mongoose.isValidObjectId(req.user.id) ? [{ _id: req.user.id }] : []),
            ...(req.user.email ? [{ email: req.user.email.toLowerCase() }, { email: req.user.email }] : [])
          ]
        }).lean();
        if (userObj) {
          matchCriteria.push(userObj._id);
          matchCriteria.push(userObj._id.toString());
          if (userObj.email) {
            matchCriteria.push(userObj.email);
            matchCriteria.push(userObj.email.toLowerCase());
          }
        }
      } catch (_) {}

      const uniqueCriteria = [];
      for (const item of matchCriteria) {
        uniqueCriteria.push(item);
        if (typeof item === 'string' && mongoose.isValidObjectId(item)) {
          uniqueCriteria.push(new mongoose.Types.ObjectId(item));
        }
      }
      query.submittedBy = { $in: uniqueCriteria };
    }
    const allInvoices = await Invoice.find(query).lean();

    let invoicesToProcess = allInvoices;
    if (req.user && req.user.role === 'Requester') {
      invoicesToProcess = invoicesToProcess.filter((inv) => {
        const sId = inv.submittedBy?._id
          ? inv.submittedBy._id.toString()
          : inv.submittedBy?.toString
          ? inv.submittedBy.toString()
          : String(inv.submittedBy);
        return (
          (req.user.id && sId === String(req.user.id)) ||
          (req.user.email && (
            sId.toLowerCase() === req.user.email.toLowerCase() ||
            (inv.submittedBy?.email && inv.submittedBy.email.toLowerCase() === req.user.email.toLowerCase())
          ))
        );
      });
    }

    const filteredInvoices = invoicesToProcess.filter((inv) =>
      isInvoiceInDateRange(inv.submittedDate, inv.dueDate, from, to)
    );

    let totalBilled = 0;
    let totalPaid = 0;
    let spendPending = 0;
    let requiresApprovalCount = 0;
    let flaggedCount = 0;
    let scheduledDisbursements = 0;

    for (const inv of filteredInvoices) {
      const amount = Number(inv.amount) || 0;
      totalBilled += amount;

      if (inv.status === 'Paid') {
        totalPaid += amount;
      }

      if (
        inv.status === 'Submitted' ||
        inv.status === 'Under Verification' ||
        inv.status === 'Flagged'
      ) {
        spendPending += amount;
      }

      if (inv.status === 'Submitted') {
        requiresApprovalCount += 1;
      }

      if (inv.status === 'Flagged') {
        flaggedCount += 1;
      }

      if (inv.status === 'Payment Scheduled') {
        scheduledDisbursements += amount;
      }
    }

    const pendingBalance = Math.max(0, Math.round((totalBilled - totalPaid) * 100) / 100);

    return res.status(200).json({
      totalBilled: Math.round(totalBilled * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      pendingBalance,
      spendPending: Math.round(spendPending * 100) / 100,
      requiresApprovalCount,
      flaggedCount,
      scheduledDisbursements: Math.round(scheduledDisbursements * 100) / 100
    });
  } catch (error) {
    console.error('Error getting reports summary:', error);
    return res.status(500).json({ error: 'Internal server error calculating reports summary' });
  }
};

const getVendorBreakdown = async (req, res) => {
  try {
    if (req.user && req.user.role === 'Requester') {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    const { from, to } = req.query;
    const [vendors, allInvoices] = await Promise.all([
      Vendor.find().lean(),
      Invoice.find().lean()
    ]);

    const filteredInvoices = allInvoices.filter((inv) =>
      isInvoiceInDateRange(inv.submittedDate, inv.dueDate, from, to)
    );

    const rows = vendors.map((vendor) => {
      const vendorId = vendor.id || (vendor._id ? vendor._id.toString() : '');
      const vendorInvoices = filteredInvoices.filter((inv) => {
        const invVendorId = inv.vendorId ? (inv.vendorId.toString ? inv.vendorId.toString() : String(inv.vendorId)) : '';
        return (
          invVendorId === vendorId ||
          (vendor._id && invVendorId === vendor._id.toString())
        );
      });

      let totalBilled = 0;
      let totalPaid = 0;
      let totalDays = 0;
      let completedInvoices = 0;

      for (const inv of vendorInvoices) {
        const amount = Number(inv.amount) || 0;
        totalBilled += amount;

        if (inv.status === 'Paid') {
          totalPaid += amount;

          const start = new Date(inv.submittedDate).getTime();
          const end = new Date(inv.paidDate || inv.dueDate).getTime();
          if (!isNaN(start) && !isNaN(end) && end >= start) {
            totalDays += (end - start) / (1000 * 60 * 60 * 24);
            completedInvoices += 1;
          }
        }
      }

      const avgProcessingDays =
        completedInvoices > 0 ? Number((totalDays / completedInvoices).toFixed(1)) : 4.0;
      const pendingBalance = Math.max(0, Math.round((totalBilled - totalPaid) * 100) / 100);

      return {
        vendorId,
        vendorName: vendor.name,
        taxId: vendor.taxId || '',
        status: vendor.status || 'Active',
        paymentTerms: vendor.paymentTerms || 'Net 30',
        invoiceCount: vendorInvoices.length,
        totalBilled: Math.round(totalBilled * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        pendingBalance,
        avgProcessingDays
      };
    });

    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error getting vendor breakdown:', error);
    return res.status(500).json({ error: 'Internal server error calculating vendor breakdown' });
  }
};

module.exports = {
  isInvoiceInDateRange,
  getReportsSummary,
  getVendorBreakdown
};

const mongoose = require('mongoose');
const AuditEntry = require('../models/AuditEntry');
const Invoice = require('../models/Invoice');
const User = require('../models/User');

/**
 * Controller to retrieve audit logs with role check and optional filtering.
 * Filter query parameters:
 * - invoiceId: filter by specific invoice
 * - action: filter by action type (SUBMISSION, APPROVAL, FLAGGED, etc.)
 * - user / performedBy: filter by user name, email, or user ID
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const { invoiceId, user, performedBy, action } = req.query;
    const filter = {};

    // Without invoiceId: require Admin role (Requester and Approver get 403)
    if (!invoiceId) {
      if (!req.user || req.user.role !== 'Admin') {
        return res
          .status(403)
          .json({ error: 'Forbidden: Insufficient permissions' });
      }
    }

    if (action) {
      filter.action = action;
    }

    if (invoiceId) {
      let targetInvoice = null;
      if (mongoose.Types.ObjectId.isValid(invoiceId)) {
        targetInvoice = await Invoice.findById(invoiceId);
      }
      if (!targetInvoice) {
        targetInvoice = await Invoice.findOne({
          $or: [{ id: invoiceId }, { invoiceNumber: invoiceId }],
        });
      }

      // If the invoice does not exist at all, return 404
      if (!targetInvoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Scoped access: Admin and Approver may view any; Requester only their own, else 404
      if (req.user && req.user.role === 'Requester') {
        const invSubmittedBy = targetInvoice.submittedBy?._id
          ? targetInvoice.submittedBy._id.toString()
          : targetInvoice.submittedBy?.toString
          ? targetInvoice.submittedBy.toString()
          : String(targetInvoice.submittedBy);

        let isOwner = false;
        if (req.user.id && String(invSubmittedBy) === String(req.user.id)) {
          isOwner = true;
        }
        if (req.user.email) {
          if (String(invSubmittedBy).toLowerCase() === String(req.user.email).toLowerCase()) {
            isOwner = true;
          }
          if (
            targetInvoice.submittedBy?.email &&
            String(targetInvoice.submittedBy.email).toLowerCase() === String(req.user.email).toLowerCase()
          ) {
            isOwner = true;
          }
        }

        if (!isOwner && mongoose.isValidObjectId(invSubmittedBy)) {
          try {
            const ownerUser = await User.findById(invSubmittedBy).lean();
            if (ownerUser) {
              if (req.user.email && ownerUser.email?.toLowerCase() === String(req.user.email).toLowerCase()) {
                isOwner = true;
              }
              if (req.user.id && ownerUser._id?.toString() === String(req.user.id)) {
                isOwner = true;
              }
            }
          } catch (_) {}
        }

        if (!isOwner) {
          return res.status(404).json({ error: 'Invoice not found' });
        }
      } else if (!req.user || !['Admin', 'Approver'].includes(req.user.role)) {
        return res
          .status(403)
          .json({ error: 'Forbidden: Insufficient permissions' });
      }

      filter.invoiceId = targetInvoice._id;
    }

    const userFilter = user || performedBy;
    if (userFilter) {
      const orConditions = [];

      if (mongoose.Types.ObjectId.isValid(userFilter)) {
        orConditions.push({ performedBy: userFilter });
      }

      try {
        const matchingUsers = await User.find({
          $or: [
            { name: { $regex: userFilter, $options: 'i' } },
            { email: { $regex: userFilter, $options: 'i' } },
          ],
        }).select('_id');

        if (matchingUsers.length > 0) {
          orConditions.push({
            performedBy: { $in: matchingUsers.map((u) => u._id) },
          });
        }
      } catch {
        // user query error fallback
      }

      // Also check details field
      orConditions.push({ details: { $regex: userFilter, $options: 'i' } });

      if (orConditions.length === 1) {
        Object.assign(filter, orConditions[0]);
      } else if (orConditions.length > 1) {
        filter.$or = orConditions;
      }
    }

    const entries = await AuditEntry.find(filter)
      .populate('performedBy', 'name email role')
      .sort({ timestamp: -1, createdAt: -1 })
      .lean();

    const formatted = entries.map((entry) => ({
      id: entry.id || entry._id?.toString(),
      invoiceId: entry.invoiceId?._id
        ? entry.invoiceId._id.toString()
        : entry.invoiceId?.toString(),
      action: entry.action,
      performedBy:
        entry.performedBy?.name ||
        (entry.performedBy?._id
          ? entry.performedBy._id.toString()
          : entry.performedBy?.toString() || 'System'),
      timestamp: entry.timestamp
        ? new Date(entry.timestamp).toISOString()
        : new Date().toISOString(),
      details: entry.details,
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

/**
 * Programmatic audit entry logger for internal service use.
 */
const recordAuditEntry = async (invoiceId, action, performedBy, details) => {
  let finalPerformedBy = performedBy;
  if (!mongoose.Types.ObjectId.isValid(performedBy)) {
    try {
      const user = await User.findOne({
        $or: [{ name: performedBy }, { email: performedBy }],
      });
      if (user) {
        finalPerformedBy = user._id;
      }
    } catch {
      // fallback
    }
  }

  const entry = await AuditEntry.create({
    invoiceId,
    action,
    performedBy: finalPerformedBy,
    timestamp: new Date(),
    details,
  });

  return {
    id: entry.id || entry._id.toString(),
    invoiceId: entry.invoiceId?.toString(),
    action: entry.action,
    performedBy: entry.performedBy?.toString(),
    timestamp: entry.timestamp?.toISOString(),
    details: entry.details,
  };
};

module.exports = {
  getAuditLogs,
  recordAuditEntry,
};

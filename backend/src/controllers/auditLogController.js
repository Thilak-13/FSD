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

    if (action) {
      filter.action = action;
    }

    if (invoiceId) {
      if (mongoose.Types.ObjectId.isValid(invoiceId)) {
        filter.invoiceId = invoiceId;
      } else {
        // Try looking up Invoice by invoiceNumber
        try {
          const inv = await Invoice.findOne({ invoiceNumber: invoiceId });
          if (inv) {
            filter.invoiceId = inv._id;
          } else {
            return res.status(200).json([]);
          }
        } catch {
          return res.status(200).json([]);
        }
      }
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

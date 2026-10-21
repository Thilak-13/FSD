const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const PurchaseOrder = require('../models/PurchaseOrder');

/**
 * Validates required fields for an invoice
 * Required: vendorId, amount, dueDate
 */
function validateInvoice(invoiceData) {
  const errors = [];

  if (!invoiceData || typeof invoiceData !== 'object') {
    return { valid: false, errors: ['Invoice data is required'] };
  }

  if (!invoiceData.vendorId || String(invoiceData.vendorId).trim() === '') {
    errors.push('vendorId is required');
  }

  if (
    invoiceData.amount === undefined ||
    invoiceData.amount === null ||
    typeof invoiceData.amount !== 'number' ||
    isNaN(invoiceData.amount)
  ) {
    errors.push('amount is required and must be a number');
  } else if (invoiceData.amount < 0) {
    errors.push('amount cannot be negative');
  }

  if (!invoiceData.dueDate || String(invoiceData.dueDate).trim() === '') {
    errors.push('dueDate is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Verifies an invoice against PO and checks for duplicates.
 *
 * Rules:
 * 1. Amount vs PO match: tolerance of ±$0.01. If Math.abs(invoice.amount - po.amount) > 0.01, flagged.
 * 2. Duplicate invoice-number check: check if invoiceNumber already exists in DB. If yes, flag as duplicate.
 * 3. Required field validation: vendorId, amount, dueDate.
 * 4. Status outcome:
 *    - discrepancies exist -> 'Flagged' (set flagReason)
 *    - cleanly matches PO -> 'Under Verification'
 *    - no PO -> 'Submitted'
 *
 * @param {Object} invoiceData
 * @param {Object} [poDoc]
 * @param {string} [currentInvoiceId]
 * @returns {Promise<Object>}
 */
async function verifyInvoice(invoiceData, poDoc, currentInvoiceId) {
  const validation = validateInvoice(invoiceData);
  const discrepancies = [];

  if (!validation.valid) {
    return {
      isValid: false,
      errors: validation.errors,
      status: 'Flagged',
      flagReason: validation.errors.join('; '),
      discrepancies: validation.errors,
      items: invoiceData.items || [],
      po: null,
    };
  }

  // 1. Duplicate invoice-number check scoped to (vendorId, invoiceNumber) pair
  if (
    invoiceData.invoiceNumber &&
    String(invoiceData.invoiceNumber).trim() !== '' &&
    invoiceData.vendorId
  ) {
    try {
      const query = {
        invoiceNumber: String(invoiceData.invoiceNumber).trim(),
        vendorId: invoiceData.vendorId,
      };
      if (currentInvoiceId) {
        query._id = { $ne: currentInvoiceId };
      }
      const existing = await Invoice.findOne(query);
      if (existing) {
        discrepancies.push(
          `Duplicate invoice number: Invoice "${invoiceData.invoiceNumber}" already exists for this vendor`
        );
      }
    } catch (err) {
      // If DB error occurs (e.g. model not compiled yet), log and continue
    }
  }

  // 2. Resolve PO if not passed directly but poId is provided
  let po = poDoc || null;
  if (!po && invoiceData.poId) {
    try {
      po = await PurchaseOrder.findOne({
        $or: [
          ...(mongoose.isValidObjectId(invoiceData.poId) ? [{ _id: invoiceData.poId }] : []),
          { id: invoiceData.poId },
          { poNumber: invoiceData.poId },
        ],
      }).lean();
      if (!po) {
        discrepancies.push(`Linked Purchase Order "${invoiceData.poId}" not found`);
      }
    } catch (err) {
      // ignore
    }
  }

  // 3. Amount vs PO match with tolerance of ±$0.01
  if (po && po.amount !== undefined && po.amount !== null) {
    const amountDifference = Math.abs(invoiceData.amount - po.amount);
    // Allow precision up to 0.01 inclusive
    if (amountDifference > 0.010001) {
      discrepancies.push(
        `Amount mismatch: Invoice amount $${invoiceData.amount.toFixed(2)} differs from PO amount $${po.amount.toFixed(2)} (variance: $${amountDifference.toFixed(2)} exceeds ±$0.01 tolerance)`
      );
    }
  }

  // 4. Process line items if provided
  const rawItems = invoiceData.items || [];
  const processedItems = [];

  if (po && Array.isArray(po.items) && po.items.length > 0) {
    for (let idx = 0; idx < rawItems.length; idx++) {
      const item = rawItems[idx];
      const matchedPoItem = po.items.find(
        (poi) =>
          (item.matchedPoItemId && (String(poi.id) === String(item.matchedPoItemId) || String(poi._id) === String(item.matchedPoItemId))) ||
          (poi.description && item.description && poi.description.trim().toLowerCase() === item.description.trim().toLowerCase())
      );

      let priceMismatch = false;
      let quantityMismatch = false;
      let matchedPoItemId = item.matchedPoItemId;

      if (matchedPoItem) {
        matchedPoItemId = matchedPoItem.id || (matchedPoItem._id ? matchedPoItem._id.toString() : undefined);
        if (Math.abs(item.unitPrice - matchedPoItem.unitPrice) > 0.01) {
          priceMismatch = true;
        }
        if (item.quantity > matchedPoItem.quantity) {
          quantityMismatch = true;
        }
      }

      processedItems.push({
        id: item.id || `li-${Date.now()}-${idx + 1}`,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total !== undefined ? item.total : item.quantity * item.unitPrice,
        matchedPoItemId,
        priceMismatch,
        quantityMismatch,
      });
    }
  } else {
    for (let idx = 0; idx < rawItems.length; idx++) {
      const item = rawItems[idx];
      processedItems.push({
        id: item.id || `li-${Date.now()}-${idx + 1}`,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total !== undefined ? item.total : item.quantity * item.unitPrice,
        matchedPoItemId: item.matchedPoItemId,
        priceMismatch: !!item.priceMismatch,
        quantityMismatch: !!item.quantityMismatch,
      });
    }
  }

  // 5. Determine status outcome
  let status = 'Submitted';
  let flagReason = undefined;

  if (discrepancies.length > 0) {
    status = 'Flagged';
    flagReason = discrepancies.join('; ');
  } else if (po) {
    status = 'Under Verification';
  } else {
    status = 'Submitted';
  }

  return {
    isValid: true,
    status,
    flagReason,
    discrepancies,
    items: processedItems,
    po,
  };
}

module.exports = {
  validateInvoice,
  validateInvoiceInput: validateInvoice,
  verifyInvoice,
};

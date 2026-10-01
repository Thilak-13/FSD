import mongoose from 'mongoose';
import { InvoiceModel } from '../models/Invoice';
import {
  Invoice,
  NewInvoiceInput,
  InvoiceLineItem,
  InvoiceStatus,
  PurchaseOrder,
} from '../types';

export interface VerificationResult {
  status: InvoiceStatus;
  flagReason?: string;
  items: InvoiceLineItem[];
  discrepancies: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateInvoiceInput(
  input: Partial<NewInvoiceInput>
): ValidationResult {
  const errors: string[] = [];

  if (!input.vendorId || typeof input.vendorId !== 'string' || input.vendorId.trim() === '') {
    errors.push('vendorId is required');
  }

  if (
    input.amount === undefined ||
    input.amount === null ||
    typeof input.amount !== 'number' ||
    isNaN(input.amount)
  ) {
    errors.push('amount is required and must be a number');
  } else if (input.amount < 0) {
    errors.push('amount cannot be negative');
  }

  if (!input.dueDate || typeof input.dueDate !== 'string' || input.dueDate.trim() === '') {
    errors.push('dueDate is required');
  }

  if (
    !input.submittedBy ||
    typeof input.submittedBy !== 'string' ||
    input.submittedBy.trim() === ''
  ) {
    errors.push('submittedBy is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export async function verifyInvoice(
  input: NewInvoiceInput | Invoice,
  linkedPo?: PurchaseOrder | null,
  currentInvoiceId?: string
): Promise<VerificationResult> {
  const discrepancies: string[] = [];

  // 1. Check duplicate invoice number in DB
  if (input.invoiceNumber && input.invoiceNumber.trim() !== '') {
    const query: Record<string, any> = { invoiceNumber: input.invoiceNumber };
    if (currentInvoiceId) {
      query._id = { $ne: currentInvoiceId };
    }
    const existing = await InvoiceModel.findOne(query);
    if (existing) {
      discrepancies.push(
        `Duplicate invoice number: Invoice "${input.invoiceNumber}" already exists in the system`
      );
    }
  }

  // 2. Resolve linked PO if poId is provided and linkedPo not explicitly passed
  let po = linkedPo;
  if (!po && input.poId) {
    try {
      const POModel = mongoose.models.PurchaseOrder;
      if (POModel) {
        po = (await POModel.findOne({
          $or: [
            ...(mongoose.isValidObjectId(input.poId) ? [{ _id: input.poId }] : []),
            { id: input.poId },
            { poNumber: input.poId },
          ],
        }).lean()) as unknown as PurchaseOrder;
      }
    } catch {
      // ignore
    }
    if (!po) {
      discrepancies.push(`Linked Purchase Order "${input.poId}" not found`);
    }
  }

  // 3. Process line items and check against PO if PO exists
  const rawItems = input.items || [];
  const processedItems: InvoiceLineItem[] = [];

  if (po) {
    // 3a. PO Amount tolerance check: ±$0.01 tolerance
    const amountDifference = Math.abs(input.amount - po.amount);
    // Allow precision tolerance up to 0.01 inclusive
    if (amountDifference > 0.010001) {
      discrepancies.push(
        `PO amount mismatch: Invoiced amount $${input.amount.toFixed(2)} differs from PO amount $${po.amount.toFixed(2)} (variance: $${amountDifference.toFixed(2)} exceeds ±$0.01 tolerance)`
      );
    }

    // 3b. Line items checks
    for (let idx = 0; idx < rawItems.length; idx++) {
      const item = rawItems[idx];
      const matchedPoItem = po.items.find(
        (poi) =>
          (item.matchedPoItemId && (poi.id === item.matchedPoItemId || (poi as any)._id?.toString() === item.matchedPoItemId)) ||
          poi.description.trim().toLowerCase() === item.description.trim().toLowerCase()
      );

      let priceMismatch = false;
      let quantityMismatch = false;
      let matchedPoItemId = item.matchedPoItemId;

      if (matchedPoItem) {
        matchedPoItemId = matchedPoItem.id || (matchedPoItem as any)._id?.toString();

        // Unit price tolerance: difference must be <= 0.001
        const priceDiff = Math.abs(item.unitPrice - matchedPoItem.unitPrice);
        if (priceDiff > 0.0010001) {
          priceMismatch = true;
          discrepancies.push(
            `Unit price discrepancy on "${item.description}": invoiced unit price $${item.unitPrice} differs from PO unit price $${matchedPoItem.unitPrice}`
          );
        }

        // Quantity check: item.quantity <= poItem.quantity
        if (item.quantity > matchedPoItem.quantity) {
          quantityMismatch = true;
          discrepancies.push(
            `Quantity mismatch on "${item.description}": invoiced quantity ${item.quantity} exceeds authorized PO quantity ${matchedPoItem.quantity}`
          );
        }
      } else {
        discrepancies.push(
          `Unmatched item: "${item.description}" could not be matched with any item on PO ${po.poNumber || po.id}`
        );
      }

      processedItems.push({
        id: item.id || `li-${Date.now()}-${idx + 1}`,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total ?? item.quantity * item.unitPrice,
        matchedPoItemId,
        priceMismatch,
        quantityMismatch,
      });
    }
  } else {
    // No PO: just process line items normally
    for (let idx = 0; idx < rawItems.length; idx++) {
      const item = rawItems[idx];
      processedItems.push({
        id: item.id || `li-${Date.now()}-${idx + 1}`,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total ?? item.quantity * item.unitPrice,
        matchedPoItemId: item.matchedPoItemId,
        priceMismatch: item.priceMismatch || false,
        quantityMismatch: item.quantityMismatch || false,
      });
    }
  }

  // 4. Return status
  // If any discrepancies or duplicates: status = 'Flagged'
  // If cleanly matched with PO: status = 'Under Verification'
  // If no PO: status = 'Submitted'
  let status: InvoiceStatus = 'Submitted';
  let flagReason: string | undefined = undefined;

  if (discrepancies.length > 0) {
    status = 'Flagged';
    flagReason = discrepancies.join('; ');
  } else if (po) {
    status = 'Under Verification';
  } else {
    status = 'Submitted';
  }

  return {
    status,
    flagReason,
    items: processedItems,
    discrepancies,
  };
}

import { InvoiceModel } from '../models/Invoice';
import { Vendor } from '../models/Vendor';

export interface ReportsSummary {
  totalBilled: number;
  totalPaid: number;
  pendingBalance: number;
  spendPending: number;
  requiresApprovalCount: number;
  flaggedCount: number;
  scheduledDisbursements: number;
}

export interface VendorReportRow {
  vendorId: string;
  vendorName: string;
  taxId: string;
  status: string;
  paymentTerms: string;
  invoiceCount: number;
  totalBilled: number;
  totalPaid: number;
  pendingBalance: number;
  avgProcessingDays: number;
}

/**
 * Helper to check whether an invoice falls within the given date range.
 * Evaluates against submittedDate or dueDate.
 */
export const isInvoiceInDateRange = (
  submittedDate?: string,
  dueDate?: string,
  from?: string,
  to?: string
): boolean => {
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
    let toTime: number;
    // If 'to' is a YYYY-MM-DD date string without time, include up to the end of that day
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

/**
 * Calculates high-level summary KPIs with optional date range filter.
 */
export const getReportsSummary = async (from?: string, to?: string): Promise<ReportsSummary> => {
  const allInvoices = await InvoiceModel.find();

  const filteredInvoices = allInvoices.filter((inv) =>
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

  return {
    totalBilled: Math.round(totalBilled * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    pendingBalance,
    spendPending: Math.round(spendPending * 100) / 100,
    requiresApprovalCount,
    flaggedCount,
    scheduledDisbursements: Math.round(scheduledDisbursements * 100) / 100,
  };
};

/**
 * Calculates breakdown statistics per vendor with optional date range filter.
 */
export const getVendorBreakdown = async (
  from?: string,
  to?: string
): Promise<VendorReportRow[]> => {
  const [vendors, allInvoices] = await Promise.all([
    Vendor.find().lean(),
    InvoiceModel.find().lean(),
  ]);

  const filteredInvoices = allInvoices.filter((inv) =>
    isInvoiceInDateRange(inv.submittedDate, inv.dueDate, from, to)
  );

  return vendors.map((vendor: any) => {
    const vendorId = vendor.id || vendor._id.toString();
    const vendorInvoices = filteredInvoices.filter(
      (inv) => inv.vendorId === vendorId || inv.vendorId === vendor._id?.toString()
    );

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
      taxId: vendor.taxId,
      status: vendor.status,
      paymentTerms: vendor.paymentTerms,
      invoiceCount: vendorInvoices.length,
      totalBilled: Math.round(totalBilled * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      pendingBalance,
      avgProcessingDays,
    };
  });
};

// src/services/mockApi/reports.ts
import { ReportsSummaryResponse, VendorReportRow } from '../api/reports';
import { simulateDelay } from './delay';
import { getInvoices } from './invoices';
import { INITIAL_VENDORS } from './vendors';

export const getReportsSummary = async (
  from?: string,
  to?: string
): Promise<ReportsSummaryResponse> => {
  await simulateDelay();
  const allInvoices = await getInvoices();

  let filtered = allInvoices;
  if (from || to) {
    filtered = allInvoices.filter((inv) => {
      const invDate = inv.submittedDate || inv.dueDate;
      if (from && invDate < from) return false;
      if (to && invDate > to) return false;
      return true;
    });
  }

  let totalBilled = 0;
  let totalPaid = 0;
  let spendPending = 0;
  let requiresApprovalCount = 0;
  let flaggedCount = 0;
  let scheduledDisbursements = 0;

  for (const inv of filtered) {
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

export const getVendorBreakdown = async (
  from?: string,
  to?: string
): Promise<VendorReportRow[]> => {
  await simulateDelay();
  const allInvoices = await getInvoices();
  const vendors = INITIAL_VENDORS;

  let filtered = allInvoices;
  if (from || to) {
    filtered = allInvoices.filter((inv) => {
      const invDate = inv.submittedDate || inv.dueDate;
      if (from && invDate < from) return false;
      if (to && invDate > to) return false;
      return true;
    });
  }

  return vendors.map((vendor) => {
    const vInvoices = filtered.filter((inv) => inv.vendorId === vendor.id);
    let totalBilled = 0;
    let totalPaid = 0;
    let totalDays = 0;
    let completedInvoices = 0;

    vInvoices.forEach((inv) => {
      totalBilled += inv.amount;
      if (inv.status === 'Paid') {
        totalPaid += inv.amount;
        const start = new Date(inv.submittedDate).getTime();
        const end = new Date(inv.dueDate).getTime();
        if (!isNaN(start) && !isNaN(end) && end >= start) {
          totalDays += (end - start) / (1000 * 60 * 60 * 24);
          completedInvoices += 1;
        }
      }
    });

    const pendingBalance = Math.max(0, Math.round((totalBilled - totalPaid) * 100) / 100);
    const avgProcessingDays =
      completedInvoices > 0 ? Math.round(totalDays / completedInvoices) : 0;

    return {
      vendorId: vendor.id,
      vendorName: vendor.name,
      taxId: vendor.taxId,
      status: vendor.status,
      paymentTerms: vendor.paymentTerms,
      invoiceCount: vInvoices.length,
      totalBilled: Math.round(totalBilled * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      pendingBalance,
      avgProcessingDays,
    };
  });
};

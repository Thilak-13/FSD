// src/services/api/reports.ts
import { apiFetch } from './client';

export interface ReportsSummaryResponse {
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

export const getReportsSummary = async (
  from?: string,
  to?: string
): Promise<ReportsSummaryResponse> => {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<ReportsSummaryResponse>(`/reports/summary${query}`);
};

export const getVendorBreakdown = async (
  from?: string,
  to?: string
): Promise<VendorReportRow[]> => {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<VendorReportRow[]>(`/reports/vendor-breakdown${query}`);
};

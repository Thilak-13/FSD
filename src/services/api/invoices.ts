// src/services/api/invoices.ts
import { Invoice, NewInvoiceInput, InvoiceFilters, InvoiceStatus } from '../../types';
import { apiFetch, ApiError, API_BASE_URL, getStoredToken } from './client';

export const getInvoices = async (
  filters?: InvoiceFilters
): Promise<Invoice[]> => {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters?.vendorId && filters.vendorId !== 'all') params.append('vendorId', filters.vendorId);
  if (filters?.submittedBy) params.append('submittedBy', filters.submittedBy);
  if (filters?.search) params.append('search', filters.search);
  const fromDate = filters?.startDate || (filters as any)?.from;
  if (fromDate) params.append('from', fromDate);
  const toDate = filters?.endDate || (filters as any)?.to;
  if (toDate) params.append('to', toDate);

  const query = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<Invoice[]>(`/invoices${query}`);
};

export const getInvoiceById = async (id: string): Promise<Invoice | null> => {
  try {
    return await apiFetch<Invoice>(`/invoices/${id}`);
  } catch (err: unknown) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
};

export const createInvoice = async (
  input: NewInvoiceInput
): Promise<Invoice> => {
  return apiFetch<Invoice>('/invoices', {
    method: 'POST',
    body: JSON.stringify(input),
  });
};

export const updateInvoiceStatus = async (
  id: string,
  status: InvoiceStatus,
  comment?: string,
  performedBy?: string,
  extra?: {
    scheduledPaymentDate?: string;
    paidDate?: string;
    flagReason?: string;
  }
): Promise<Invoice> => {
  return apiFetch<Invoice>(`/invoices/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      status,
      comment,
      performedBy,
      ...extra,
    }),
  });
};

export const uploadInvoiceAttachment = async (
  id: string,
  file: File
): Promise<Invoice> => {
  const formData = new FormData();
  formData.append('file', file);

  return apiFetch<Invoice>(`/invoices/${id}/attachment`, {
    method: 'POST',
    body: formData,
  });
};

export const downloadInvoiceAttachment = async (id: string): Promise<Blob> => {
  const url = `${API_BASE_URL}/invoices/${id}/attachment`;
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new ApiError(res.status, `Failed to download attachment: ${res.statusText}`);
  }
  return res.blob();
};

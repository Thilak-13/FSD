// src/services/api/auditLog.ts
import { AuditEntry } from '../../types';
import { apiFetch } from './client';

export const getAuditLog = async (
  invoiceId?: string
): Promise<AuditEntry[]> => {
  const query = invoiceId ? `?invoiceId=${encodeURIComponent(invoiceId)}` : '';
  return apiFetch<AuditEntry[]>(`/audit-log${query}`);
};

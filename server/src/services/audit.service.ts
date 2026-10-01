import { AuditEntryModel } from '../models/AuditEntry';
import { AuditAction, AuditEntry } from '../types';

export const recordAuditEntry = async (
  invoiceId: string,
  action: AuditAction,
  performedBy: string,
  details?: string
): Promise<AuditEntry> => {
  const entry = await AuditEntryModel.create({
    invoiceId,
    action,
    performedBy,
    timestamp: new Date().toISOString(),
    details,
  });

  return entry.toJSON() as AuditEntry;
};

export interface AuditLogFilters {
  invoiceId?: string;
  user?: string;
  action?: string;
}

export const getAuditLog = async (
  filters?: AuditLogFilters
): Promise<AuditEntry[]> => {
  const query: Record<string, any> = {};

  if (filters?.invoiceId) {
    query.invoiceId = filters.invoiceId;
  }

  if (filters?.user) {
    // Support matching by user/performedBy (case-insensitive substring or exact)
    query.performedBy = { $regex: filters.user, $options: 'i' };
  }

  if (filters?.action) {
    query.action = filters.action;
  }

  const entries = await AuditEntryModel.find(query).sort({ timestamp: -1, createdAt: -1 });
  return entries.map((e) => e.toJSON() as AuditEntry);
};

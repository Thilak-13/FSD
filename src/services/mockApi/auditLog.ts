import { AuditEntry } from '../../types';
import { simulateDelay } from './delay';

export const INITIAL_AUDIT_LOG: AuditEntry[] = [
  {
    id: 'audit-1',
    invoiceId: 'inv-1',
    action: 'SUBMISSION',
    performedBy: 'Elena Rodriguez',
    timestamp: '2026-09-02T09:30:00Z',
    details: 'Invoice INV-2026-001 submitted for Apex Cloud Services',
  },
  {
    id: 'audit-2',
    invoiceId: 'inv-4',
    action: 'SUBMISSION',
    performedBy: 'Elena Rodriguez',
    timestamp: '2026-08-25T11:15:00Z',
    details: 'Invoice INV-2026-004 submitted for Northwest Logistics',
  },
  {
    id: 'audit-3',
    invoiceId: 'inv-4',
    action: 'VERIFICATION',
    performedBy: 'System Auto-Matcher',
    timestamp: '2026-08-25T11:16:00Z',
    details: 'PO match verified against PO-2026-003',
  },
  {
    id: 'audit-4',
    invoiceId: 'inv-7',
    action: 'SUBMISSION',
    performedBy: 'Elena Rodriguez',
    timestamp: '2026-08-18T14:20:00Z',
    details: 'Invoice INV-2026-007 submitted for ByteForce Technologies',
  },
  {
    id: 'audit-5',
    invoiceId: 'inv-7',
    action: 'APPROVAL',
    performedBy: 'Marcus Vance',
    timestamp: '2026-08-19T10:00:00Z',
    details: 'Invoice approved following PO line item validation',
  },
  {
    id: 'audit-6',
    invoiceId: 'inv-11',
    action: 'SUBMISSION',
    performedBy: 'Elena Rodriguez',
    timestamp: '2026-09-05T08:45:00Z',
    details: 'Invoice INV-2026-011 submitted for Summit Creative',
  },
  {
    id: 'audit-7',
    invoiceId: 'inv-11',
    action: 'FLAGGED',
    performedBy: 'Marcus Vance',
    timestamp: '2026-09-06T13:30:00Z',
    details: 'Unit price discrepancy on Design System Component Library UI',
  },
  {
    id: 'audit-8',
    invoiceId: 'inv-14',
    action: 'APPROVAL',
    performedBy: 'Marcus Vance',
    timestamp: '2026-08-10T16:00:00Z',
    details: 'Approved for disbursement',
  },
  {
    id: 'audit-9',
    invoiceId: 'inv-14',
    action: 'PAYMENT_SCHEDULED',
    performedBy: 'Sarah Chen',
    timestamp: '2026-08-12T09:00:00Z',
    details: 'Scheduled payment date set to 2026-09-18 via ACH',
  },
  {
    id: 'audit-10',
    invoiceId: 'inv-17',
    action: 'APPROVAL',
    performedBy: 'Marcus Vance',
    timestamp: '2026-07-28T10:00:00Z',
    details: 'Approved for payment',
  },
  {
    id: 'audit-11',
    invoiceId: 'inv-17',
    action: 'PAYMENT_COMPLETED',
    performedBy: 'Sarah Chen',
    timestamp: '2026-08-15T15:30:00Z',
    details: 'Settlement confirmed via Wire Transfer reference #WT-948201',
  },
];

let auditLogStore: AuditEntry[] = [...INITIAL_AUDIT_LOG];

export const resetAuditLog = (): void => {
  auditLogStore = [...INITIAL_AUDIT_LOG];
};

export const getAuditLog = async (invoiceId?: string): Promise<AuditEntry[]> => {
  await simulateDelay();
  if (invoiceId) {
    return auditLogStore.filter((entry) => entry.invoiceId === invoiceId);
  }
  return [...auditLogStore];
};

export const addAuditEntry = async (
  entry: Omit<AuditEntry, 'id' | 'timestamp'> & { timestamp?: string }
): Promise<AuditEntry> => {
  const newEntry: AuditEntry = {
    id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: entry.timestamp || new Date().toISOString(),
    invoiceId: entry.invoiceId,
    action: entry.action,
    performedBy: entry.performedBy,
    details: entry.details,
  };
  auditLogStore = [...auditLogStore, newEntry];
  return { ...newEntry };
};

// server/src/types/index.ts
export type Role = 'Admin' | 'Approver' | 'Requester';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  department?: string;
}

export type PaymentTerms = 'Net 15' | 'Net 30' | 'Net 45' | 'Net 60';
export type VendorStatus = 'Active' | 'Under Review' | 'Inactive';

export interface Vendor {
  id: string;
  name: string;
  contactEmail: string;
  paymentTerms: PaymentTerms;
  address: string;
  taxId: string;
  status: VendorStatus;
  phone?: string;
  totalInvoices?: number;
}

export interface NewVendorInput {
  name: string;
  contactEmail: string;
  paymentTerms: PaymentTerms;
  address: string;
  taxId: string;
  status?: VendorStatus;
  phone?: string;
}

export interface PurchaseOrderItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  amount: number;
  description: string;
  items: PurchaseOrderItem[];
  createdDate: string;
  status?: 'Open' | 'Partially Invoiced' | 'Fulfilled' | 'Closed';
}

export type InvoiceStatus =
  | 'Submitted'
  | 'Under Verification'
  | 'Approved'
  | 'Flagged'
  | 'Payment Scheduled'
  | 'Paid';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  matchedPoItemId?: string;
  priceMismatch?: boolean;
  quantityMismatch?: boolean;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  vendorId: string;
  poId?: string;
  amount: number;
  dueDate: string;
  submittedDate: string;
  status: InvoiceStatus;
  submittedBy: string;
  attachedDocumentName?: string;
  attachedDocumentPath?: string;
  flagReason?: string;
  scheduledPaymentDate?: string;
  paidDate?: string;
  items: InvoiceLineItem[];
  notes?: string;
}

export interface NewInvoiceInput {
  invoiceNumber?: string;
  vendorId: string;
  poId?: string;
  amount: number;
  dueDate: string;
  submittedDate?: string;
  submittedBy: string;
  attachedDocumentName?: string;
  notes?: string;
  items: Array<{
    id?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total?: number;
    matchedPoItemId?: string;
    priceMismatch?: boolean;
    quantityMismatch?: boolean;
  }>;
}

export interface InvoiceFilters {
  search?: string;
  status?: InvoiceStatus | 'all';
  vendorId?: string | 'all';
  submittedBy?: string;
  startDate?: string;
  endDate?: string;
}

export type AuditAction =
  | 'SUBMISSION'
  | 'VERIFICATION'
  | 'APPROVAL'
  | 'FLAGGED'
  | 'PAYMENT_SCHEDULED'
  | 'PAYMENT_COMPLETED';

export interface AuditEntry {
  id: string;
  invoiceId: string;
  action: AuditAction | string;
  performedBy: string;
  timestamp: string;
  details?: string;
}

export type NotificationType =
  | 'pending_approval'
  | 'due_soon'
  | 'overdue'
  | 'flagged'
  | 'paid';

export interface Notification {
  id: string;
  type: NotificationType;
  invoiceId: string;
  message: string;
  read: boolean;
  createdAt: string;
  userId?: string;
}

export interface AuthUserPayload {
  id: string;
  email: string;
  role: Role;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

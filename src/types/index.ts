// src/types/index.ts

/**
 * User Roles within the Invoice Verification Platform
 */
export type Role = 'Admin' | 'Approver' | 'Requester';

/**
 * User profile definition
 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  department?: string;
}

/**
 * Standard B2B Vendor Payment Terms
 */
export type PaymentTerms = 'Net 15' | 'Net 30' | 'Net 45' | 'Net 60';

/**
 * Vendor Status
 */
export type VendorStatus = 'Active' | 'Under Review' | 'Inactive';

/**
 * Vendor entity
 */
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

/**
 * Input for creating a new vendor
 */
export interface NewVendorInput {
  name: string;
  contactEmail: string;
  paymentTerms: PaymentTerms;
  address: string;
  taxId: string;
  status?: VendorStatus;
  phone?: string;
}

/**
 * Purchase Order item breakdown
 */
export interface PurchaseOrderItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

/**
 * Purchase Order entity
 */
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

/**
 * Six distinct invoice lifecycle statuses
 */
export type InvoiceStatus =
  | 'Submitted'
  | 'Under Verification'
  | 'Approved'
  | 'Flagged'
  | 'Payment Scheduled'
  | 'Paid';

/**
 * Invoice line item with 3-way matching annotations
 */
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

/**
 * Full Invoice domain entity
 */
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
  flagReason?: string;
  scheduledPaymentDate?: string;
  paidDate?: string;
  items: InvoiceLineItem[];
  notes?: string;
}

/**
 * Input for creating an invoice
 */
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

/**
 * Filtering options for invoice queries
 */
export interface InvoiceFilters {
  search?: string;
  status?: InvoiceStatus | 'all';
  vendorId?: string | 'all';
  submittedBy?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * System audit action types
 */
export type AuditAction =
  | 'SUBMISSION'
  | 'VERIFICATION'
  | 'APPROVAL'
  | 'FLAGGED'
  | 'PAYMENT_SCHEDULED'
  | 'PAYMENT_COMPLETED';

/**
 * Immutable audit entry record
 */
export interface AuditEntry {
  id: string;
  invoiceId: string;
  action: AuditAction | string;
  performedBy: string;
  timestamp: string;
  details?: string;
}

/**
 * Notification category types
 */
export type NotificationType =
  | 'pending_approval'
  | 'due_soon'
  | 'overdue'
  | 'flagged'
  | 'paid';

/**
 * Derived or direct notification
 */
export interface Notification {
  id: string;
  type: NotificationType;
  invoiceId: string;
  message: string;
  read: boolean;
  createdAt: string;
  userId?: string;
}

/**
 * Spectrum Status Light variant mapping
 */
export type StatusLightVariant = 'positive' | 'notice' | 'negative' | 'info';

// src/services/mockApi/invoices.ts
import {
  Invoice,
  NewInvoiceInput,
  InvoiceFilters,
  InvoiceStatus,
  AuditAction,
} from '../../types';
import { simulateDelay } from './delay';
import { addAuditEntry } from './auditLog';
import { INITIAL_VENDORS } from './vendors';

export const daysFromNow = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-001',
    vendorId: 'vendor-1', // Apex Cloud Services
    poId: 'po-1',
    amount: 6500,
    dueDate: daysFromNow(20),
    submittedDate: daysFromNow(-2),
    status: 'Submitted',
    submittedBy: 'user-3',
    attachedDocumentName: 'INV-2026-001_Apex.pdf',
    items: [
      {
        id: 'li-101',
        description: 'Cloud Compute Instances Tier 3',
        quantity: 1,
        unitPrice: 4000,
        total: 4000,
        matchedPoItemId: 'poi-101',
      },
      {
        id: 'li-102',
        description: '24/7 Enterprise Cloud Support SLA',
        quantity: 1,
        unitPrice: 2500,
        total: 2500,
        matchedPoItemId: 'poi-102',
      },
    ],
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-2026-002',
    vendorId: 'vendor-2', // Northwest Logistics
    poId: 'po-4',
    amount: 4800,
    dueDate: daysFromNow(20),
    submittedDate: daysFromNow(-2),
    status: 'Submitted',
    submittedBy: 'user-3',
    attachedDocumentName: 'INV-2026-002_Northwest.pdf',
    items: [
      {
        id: 'li-201',
        description: 'Dedicated Van Day Routes',
        quantity: 32,
        unitPrice: 150,
        total: 4800,
        matchedPoItemId: 'poi-401',
      },
    ],
  },
  {
    id: 'inv-3',
    invoiceNumber: 'INV-2026-003',
    vendorId: 'vendor-3', // ByteForce Technologies
    poId: 'po-6',
    amount: 2600,
    dueDate: daysFromNow(20),
    submittedDate: daysFromNow(-2),
    status: 'Submitted',
    submittedBy: 'user-3',
    attachedDocumentName: 'INV-2026-003_ByteForce.pdf',
    items: [
      {
        id: 'li-301',
        description: 'High-Density Patch Panels & Optics Cabling',
        quantity: 13,
        unitPrice: 200,
        total: 2600,
        matchedPoItemId: 'poi-602',
      },
    ],
  },
  {
    id: 'inv-4',
    invoiceNumber: 'INV-2026-004',
    vendorId: 'vendor-1', // Apex Cloud Services
    poId: 'po-2',
    amount: 7200,
    dueDate: daysFromNow(20),
    submittedDate: daysFromNow(-2),
    status: 'Under Verification',
    submittedBy: 'user-3',
    attachedDocumentName: 'INV-2026-004_Apex.pdf',
    items: [
      {
        id: 'li-401',
        description: 'Database Architecture Consulting Hours',
        quantity: 40,
        unitPrice: 180,
        total: 7200,
        matchedPoItemId: 'poi-201',
      },
    ],
  },
  {
    id: 'inv-5',
    invoiceNumber: 'INV-2026-005',
    vendorId: 'vendor-2', // Northwest Logistics
    poId: 'po-3',
    amount: 8000,
    dueDate: daysFromNow(20),
    submittedDate: daysFromNow(-2),
    status: 'Under Verification',
    submittedBy: 'user-3',
    attachedDocumentName: 'INV-2026-005_NWL.pdf',
    items: [
      {
        id: 'li-501',
        description: 'Pallet Shipping - Zone 1 Standard Delivery',
        quantity: 50,
        unitPrice: 160,
        total: 8000,
        matchedPoItemId: 'poi-301',
      },
    ],
  },
  {
    id: 'inv-6',
    invoiceNumber: 'INV-2026-006',
    vendorId: 'vendor-5', // Pioneer Industrial
    poId: 'po-8',
    amount: 14400,
    dueDate: daysFromNow(20),
    submittedDate: daysFromNow(-2),
    status: 'Under Verification',
    submittedBy: 'user-1',
    attachedDocumentName: 'INV-2026-006_Pioneer.pdf',
    items: [
      {
        id: 'li-601',
        description: 'HEPA Industrial Clean Air Filtration System',
        quantity: 4,
        unitPrice: 3600,
        total: 14400,
        matchedPoItemId: 'poi-801',
      },
    ],
  },
  {
    id: 'inv-7',
    invoiceNumber: 'INV-2026-007',
    vendorId: 'vendor-3', // ByteForce Technologies
    poId: 'po-5',
    amount: 14000,
    dueDate: daysFromNow(14),
    submittedDate: daysFromNow(-15),
    status: 'Approved',
    submittedBy: 'user-3',
    attachedDocumentName: 'INV-2026-007_ByteForce.pdf',
    items: [
      {
        id: 'li-701',
        description: 'High-Performance Developer Laptops (64GB RAM)',
        quantity: 5,
        unitPrice: 2800,
        total: 14000,
        matchedPoItemId: 'poi-501',
      },
    ],
  },
  {
    id: 'inv-8',
    invoiceNumber: 'INV-2026-008',
    vendorId: 'vendor-1', // Apex Cloud Services
    poId: 'po-2',
    amount: 1000,
    dueDate: daysFromNow(-10), // overdue
    submittedDate: daysFromNow(-25),
    status: 'Approved',
    submittedBy: 'user-3',
    attachedDocumentName: 'INV-2026-008_Apex.pdf',
    items: [
      {
        id: 'li-801',
        description: 'Cross-Region Storage Replication Tier 1',
        quantity: 2,
        unitPrice: 500,
        total: 1000,
        matchedPoItemId: 'poi-202',
      },
    ],
  },
  {
    id: 'inv-9',
    invoiceNumber: 'INV-2026-009',
    vendorId: 'vendor-2', // Northwest Logistics
    poId: 'po-4',
    amount: 1600,
    dueDate: daysFromNow(5),
    submittedDate: daysFromNow(-15),
    status: 'Approved',
    submittedBy: 'user-3',
    attachedDocumentName: 'INV-2026-009_NWL.pdf',
    items: [
      {
        id: 'li-901',
        description: 'Fuel Surcharge & Toll Reimbursement',
        quantity: 1,
        unitPrice: 1600,
        total: 1600,
        matchedPoItemId: 'poi-402',
      },
    ],
  },
  {
    id: 'inv-10',
    invoiceNumber: 'INV-2026-010',
    vendorId: 'vendor-5', // Pioneer Industrial
    poId: 'po-8',
    amount: 8000,
    dueDate: daysFromNow(25),
    submittedDate: daysFromNow(-10),
    status: 'Approved',
    submittedBy: 'user-1',
    attachedDocumentName: 'INV-2026-010_Pioneer.pdf',
    items: [
      {
        id: 'li-1001',
        description: 'OSHA-Certified Fall Protection & Rigging Harnesses',
        quantity: 16,
        unitPrice: 500,
        total: 8000,
        matchedPoItemId: 'poi-802',
      },
    ],
  },
  {
    id: 'inv-11',
    invoiceNumber: 'INV-2026-011',
    vendorId: 'vendor-4', // Summit Creative
    poId: 'po-7',
    amount: 11000,
    dueDate: daysFromNow(20),
    submittedDate: daysFromNow(-5),
    status: 'Flagged',
    submittedBy: 'user-3',
    attachedDocumentName: 'INV-2026-011_Summit.pdf',
    flagReason:
      'Unit price discrepancy: invoiced rate ₹11,000 exceeds PO rate ₹9,500',
    items: [
      {
        id: 'li-1101',
        description:
          'Design System Component Specification & Figma UI Kit',
        quantity: 1,
        unitPrice: 11000,
        total: 11000,
        matchedPoItemId: 'poi-701',
        priceMismatch: true,
      },
    ],
  },
  {
    id: 'inv-12',
    invoiceNumber: 'INV-2026-012',
    vendorId: 'vendor-2', // Northwest Logistics
    poId: 'po-3',
    amount: 6000,
    dueDate: daysFromNow(20),
    submittedDate: daysFromNow(-10),
    status: 'Flagged',
    submittedBy: 'user-3',
    attachedDocumentName: 'INV-2026-012_NWL.pdf',
    flagReason:
      'Quantity overbill: invoiced for 12 shipments, but PO authorization limit is 8',
    items: [
      {
        id: 'li-1201',
        description: 'Expedited Temperature Controlled Transport',
        quantity: 12,
        unitPrice: 500,
        total: 6000,
        matchedPoItemId: 'poi-302',
        quantityMismatch: true,
      },
    ],
  },
  {
    id: 'inv-13',
    invoiceNumber: 'INV-2026-013',
    vendorId: 'vendor-3', // ByteForce Technologies
    poId: 'po-6',
    amount: 8400,
    dueDate: daysFromNow(20),
    submittedDate: daysFromNow(-7),
    status: 'Flagged',
    submittedBy: 'user-3',
    attachedDocumentName: 'INV-2026-013_ByteForce.pdf',
    flagReason:
      'Unit price mismatch on 48-Port Switches (₹2,100 invoiced vs ₹1,800 PO rate)',
    items: [
      {
        id: 'li-1301',
        description: 'Managed 48-Port Gigabit PoE+ Switches',
        quantity: 4,
        unitPrice: 2100,
        total: 8400,
        matchedPoItemId: 'poi-601',
        priceMismatch: true,
      },
    ],
  },
  {
    id: 'inv-14',
    invoiceNumber: 'INV-2026-014',
    vendorId: 'vendor-1', // Apex Cloud Services
    poId: 'po-1',
    amount: 8000,
    dueDate: daysFromNow(15),
    submittedDate: daysFromNow(-20),
    status: 'Payment Scheduled',
    submittedBy: 'user-3',
    attachedDocumentName: 'INV-2026-014_Apex.pdf',
    scheduledPaymentDate: daysFromNow(10),
    items: [
      {
        id: 'li-1401',
        description: 'Cloud Compute Instances Tier 3',
        quantity: 2,
        unitPrice: 4000,
        total: 8000,
        matchedPoItemId: 'poi-101',
      },
    ],
  },
  {
    id: 'inv-15',
    invoiceNumber: 'INV-2026-015',
    vendorId: 'vendor-3', // ByteForce Technologies
    poId: 'po-5',
    amount: 4500,
    dueDate: daysFromNow(18),
    submittedDate: daysFromNow(-18),
    status: 'Payment Scheduled',
    submittedBy: 'user-3',
    attachedDocumentName: 'INV-2026-015_ByteForce.pdf',
    scheduledPaymentDate: daysFromNow(10),
    items: [
      {
        id: 'li-1501',
        description: '4K IPS 32-inch Dual Monitor Setup',
        quantity: 10,
        unitPrice: 450,
        total: 4500,
        matchedPoItemId: 'poi-502',
      },
    ],
  },
  {
    id: 'inv-16',
    invoiceNumber: 'INV-2026-016',
    vendorId: 'vendor-4', // Summit Creative
    poId: 'po-7',
    amount: 5500,
    dueDate: daysFromNow(22),
    submittedDate: daysFromNow(-15),
    status: 'Payment Scheduled',
    submittedBy: 'user-3',
    attachedDocumentName: 'INV-2026-016_Summit.pdf',
    scheduledPaymentDate: daysFromNow(10),
    items: [
      {
        id: 'li-1601',
        description: 'Brand Guidelines & Iconography Set',
        quantity: 1,
        unitPrice: 5500,
        total: 5500,
        matchedPoItemId: 'poi-702',
      },
    ],
  },
  {
    id: 'inv-17',
    invoiceNumber: 'INV-2026-017',
    vendorId: 'vendor-2', // Northwest Logistics
    poId: 'po-3',
    amount: 4000,
    dueDate: daysFromNow(-15),
    submittedDate: daysFromNow(-30),
    status: 'Paid',
    submittedBy: 'user-3',
    attachedDocumentName: 'INV-2026-017_NWL.pdf',
    scheduledPaymentDate: daysFromNow(-6),
    paidDate: daysFromNow(-5),
    items: [
      {
        id: 'li-1701',
        description: 'Expedited Temperature Controlled Transport',
        quantity: 8,
        unitPrice: 500,
        total: 4000,
        matchedPoItemId: 'poi-302',
      },
    ],
  },
  {
    id: 'inv-18',
    invoiceNumber: 'INV-2026-018',
    vendorId: 'vendor-1', // Apex Cloud Services
    poId: 'po-1',
    amount: 2500,
    dueDate: daysFromNow(-12),
    submittedDate: daysFromNow(-25),
    status: 'Paid',
    submittedBy: 'user-3',
    attachedDocumentName: 'INV-2026-018_Apex.pdf',
    scheduledPaymentDate: daysFromNow(-6),
    paidDate: daysFromNow(-5),
    items: [
      {
        id: 'li-1801',
        description: '24/7 Enterprise Cloud Support SLA',
        quantity: 1,
        unitPrice: 2500,
        total: 2500,
        matchedPoItemId: 'poi-102',
      },
    ],
  },
];

let invoicesStore: Invoice[] = [...INITIAL_INVOICES];

export const resetInvoices = (): void => {
  invoicesStore = [...INITIAL_INVOICES];
};

export const getInvoices = async (
  filters?: InvoiceFilters
): Promise<Invoice[]> => {
  await simulateDelay();
  let results = [...invoicesStore];

  if (!filters) {
    return results;
  }

  if (filters.status && filters.status !== 'all') {
    results = results.filter((i) => i.status === filters.status);
  }

  if (filters.vendorId && filters.vendorId !== 'all') {
    results = results.filter((i) => i.vendorId === filters.vendorId);
  }

  if (filters.submittedBy) {
    results = results.filter((i) => i.submittedBy === filters.submittedBy);
  }

  if (filters.search && filters.search.trim() !== '') {
    const term = filters.search.toLowerCase().trim();
    // Resolve vendor names for quick search matching
    const vendorMap = new Map(INITIAL_VENDORS.map((v) => [v.id, v.name.toLowerCase()]));

    results = results.filter((i) => {
      const vendorName = vendorMap.get(i.vendorId) || '';
      return (
        i.invoiceNumber.toLowerCase().includes(term) ||
        vendorName.includes(term) ||
        i.items.some((item) => item.description.toLowerCase().includes(term))
      );
    });
  }

  if (filters.startDate) {
    results = results.filter((i) => i.submittedDate >= filters.startDate!);
  }

  if (filters.endDate) {
    results = results.filter((i) => i.submittedDate <= filters.endDate!);
  }

  return results;
};

export const getInvoiceById = async (id: string): Promise<Invoice | null> => {
  await simulateDelay();
  const invoice = invoicesStore.find((i) => i.id === id);
  return invoice ? { ...invoice, items: invoice.items.map((it) => ({ ...it })) } : null;
};

export const createInvoice = async (
  input: NewInvoiceInput
): Promise<Invoice> => {
  await simulateDelay();

  const generatedId = `inv-${Date.now()}`;
  const generatedNumber =
    input.invoiceNumber ||
    `INV-2026-${(invoicesStore.length + 1).toString().padStart(3, '0')}`;

  const calculatedItems = input.items.map((item, idx) => ({
    id: item.id || `li-${Date.now()}-${idx + 1}`,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.total ?? item.quantity * item.unitPrice,
    matchedPoItemId: item.matchedPoItemId,
    priceMismatch: item.priceMismatch,
    quantityMismatch: item.quantityMismatch,
  }));

  const totalAmount =
    input.amount ||
    calculatedItems.reduce((acc, item) => acc + item.total, 0);

  const newInvoice: Invoice = {
    id: generatedId,
    invoiceNumber: generatedNumber,
    vendorId: input.vendorId,
    poId: input.poId,
    amount: totalAmount,
    dueDate: input.dueDate,
    submittedDate:
      input.submittedDate || new Date().toISOString().split('T')[0],
    status: 'Submitted',
    submittedBy: input.submittedBy,
    attachedDocumentName: input.attachedDocumentName,
    notes: input.notes,
    items: calculatedItems,
  };

  invoicesStore = [newInvoice, ...invoicesStore];

  // Record audit entry
  await addAuditEntry({
    invoiceId: newInvoice.id,
    action: 'SUBMISSION',
    performedBy: input.submittedBy || 'Requester',
    details: `Invoice ${newInvoice.invoiceNumber} submitted for amount ₹${newInvoice.amount.toLocaleString('en-IN')}`,
  });

  return { ...newInvoice };
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
  await simulateDelay();

  const index = invoicesStore.findIndex((i) => i.id === id);
  if (index === -1) {
    throw new Error(`Invoice with id ${id} not found`);
  }

  const existing = invoicesStore[index];
  const updated: Invoice = {
    ...existing,
    status,
    ...(status === 'Flagged' && {
      flagReason: extra?.flagReason || comment || 'Flagged for review',
    }),
    ...(status === 'Payment Scheduled' && {
      scheduledPaymentDate:
        extra?.scheduledPaymentDate ||
        new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    }),
    ...(status === 'Paid' && {
      paidDate:
        extra?.paidDate || new Date().toISOString().split('T')[0],
    }),
  };

  invoicesStore[index] = updated;

  // Map status to audit action
  let action: AuditAction = 'VERIFICATION';
  if (status === 'Approved') action = 'APPROVAL';
  else if (status === 'Flagged') action = 'FLAGGED';
  else if (status === 'Payment Scheduled') action = 'PAYMENT_SCHEDULED';
  else if (status === 'Paid') action = 'PAYMENT_COMPLETED';
  else if (status === 'Submitted') action = 'SUBMISSION';

  await addAuditEntry({
    invoiceId: id,
    action,
    performedBy: performedBy || 'System User',
    details: comment || `Invoice status changed from ${existing.status} to ${status}`,
  });

  return { ...updated };
};

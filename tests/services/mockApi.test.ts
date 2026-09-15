// tests/services/mockApi.test.ts
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { setMockDelayEnabled } from '../../src/services/mockApi/delay';
import {
  getInvoices,
  getInvoiceById,
  updateInvoiceStatus,
  createInvoice,
  resetInvoices,
} from '../../src/services/mockApi/invoices';
import {
  getVendors,
  getVendorById,
  createVendor,
  resetVendors,
} from '../../src/services/mockApi/vendors';
import {
  getPurchaseOrders,
  getPurchaseOrderById,
  resetPurchaseOrders,
} from '../../src/services/mockApi/purchaseOrders';
import { getUsers, resetUsers } from '../../src/services/mockApi/users';
import { getAuditLog, resetAuditLog } from '../../src/services/mockApi/auditLog';
import {
  getNotifications,
  resetReadNotifications,
} from '../../src/services/mockApi/notifications';

describe('Mock Data Layer', () => {
  beforeAll(() => {
    setMockDelayEnabled(false);
  });

  afterAll(() => {
    setMockDelayEnabled(true);
  });

  beforeEach(() => {
    resetInvoices();
    resetVendors();
    resetPurchaseOrders();
    resetUsers();
    resetAuditLog();
    resetReadNotifications();
  });

  it('should fetch seeded invoices spanning all statuses', async () => {
    const invoices = await getInvoices();
    expect(invoices.length).toBeGreaterThanOrEqual(15);
    const statuses = new Set(invoices.map((i) => i.status));
    expect(statuses.has('Submitted')).toBe(true);
    expect(statuses.has('Under Verification')).toBe(true);
    expect(statuses.has('Approved')).toBe(true);
    expect(statuses.has('Flagged')).toBe(true);
    expect(statuses.has('Payment Scheduled')).toBe(true);
    expect(statuses.has('Paid')).toBe(true);
  });

  it('should update invoice status and persist in memory', async () => {
    const invoices = await getInvoices();
    const target = invoices[0];
    const updated = await updateInvoiceStatus(target.id, 'Approved', 'Test approval', 'user-2');
    expect(updated.status).toBe('Approved');
    const fetched = await getInvoiceById(target.id);
    expect(fetched?.status).toBe('Approved');

    // Audit entry should be recorded
    const auditEntries = await getAuditLog(target.id);
    expect(auditEntries.length).toBeGreaterThan(0);
    expect(auditEntries[auditEntries.length - 1].action).toBe('APPROVAL');
  });

  it('should derive runtime notifications from invoice states', async () => {
    const notifications = await getNotifications();
    expect(notifications.length).toBeGreaterThan(0);

    const types = new Set(notifications.map((n) => n.type));
    // Seeded data contains overdue, flagged, and pending invoices
    expect(types.has('flagged') || types.has('overdue') || types.has('pending_approval')).toBe(true);
  });

  it('should filter notifications by role when userId is provided', async () => {
    // Approver (user-2) must see notifications across all invoices
    const approverNotifs = await getNotifications('user-2');
    expect(approverNotifs.length).toBeGreaterThan(0);

    // Admin (user-1) must see notifications across all invoices
    const adminNotifs = await getNotifications('user-1');
    expect(adminNotifs.length).toBeGreaterThan(0);
    expect(adminNotifs.length).toBe(approverNotifs.length);

    // Requester (user-3) must only see notifications for invoices they submitted
    const requesterNotifs = await getNotifications('user-3');
    expect(requesterNotifs.length).toBeGreaterThan(0);
    expect(requesterNotifs.every((n) => n.userId === 'user-3')).toBe(true);

    // Unfiltered returns all
    const allNotifs = await getNotifications();
    expect(allNotifs.length).toBeGreaterThanOrEqual(requesterNotifs.length);
  });

  it('should fetch seeded vendors including the 5 specified vendors', async () => {
    const vendors = await getVendors();
    expect(vendors.length).toBe(5);

    const names = vendors.map((v) => v.name);
    expect(names).toContain('Apex Cloud Services');
    expect(names).toContain('Northwest Logistics');
    expect(names).toContain('ByteForce Technologies');
    expect(names).toContain('Summit Creative');
    expect(names).toContain('Pioneer Industrial');
  });

  it('should create a new vendor and persist in memory', async () => {
    const newVendor = await createVendor({
      name: 'Acme Solutions',
      contactEmail: 'billing@acme.com',
      paymentTerms: 'Net 30',
      address: '100 Main St, Tech City, CA 94016',
      taxId: 'XX-1234567',
      status: 'Active',
    });

    expect(newVendor.id).toBeDefined();
    expect(newVendor.name).toBe('Acme Solutions');

    const fetched = await getVendorById(newVendor.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe('Acme Solutions');

    const allVendors = await getVendors();
    expect(allVendors.length).toBe(6);
  });

  it('should fetch seeded purchase orders with line items', async () => {
    const pos = await getPurchaseOrders();
    expect(pos.length).toBe(8);
    for (const po of pos) {
      expect(po.items.length).toBeGreaterThan(0);
      expect(po.amount).toBeGreaterThan(0);
      expect(po.poNumber).toBeDefined();
    }

    const firstPo = await getPurchaseOrderById(pos[0].id);
    expect(firstPo).not.toBeNull();
    expect(firstPo?.id).toBe(pos[0].id);
  });

  it('should fetch seeded users for Admin, Approver, and Requester roles', async () => {
    const users = await getUsers();
    expect(users.length).toBe(3);

    const roles = users.map((u) => u.role);
    expect(roles).toContain('Admin');
    expect(roles).toContain('Approver');
    expect(roles).toContain('Requester');
  });

  it('should create a new invoice and persist in memory', async () => {
    const vendors = await getVendors();
    const pos = await getPurchaseOrders();

    const created = await createInvoice({
      vendorId: vendors[0].id,
      poId: pos[0].id,
      amount: 1500,
      dueDate: '2026-10-15',
      submittedBy: 'user-3',
      attachedDocumentName: 'invoice_test.pdf',
      items: [
        {
          description: 'Consulting Services',
          quantity: 10,
          unitPrice: 150,
          matchedPoItemId: pos[0].items[0]?.id,
        },
      ],
    });

    expect(created.id).toBeDefined();
    expect(created.invoiceNumber).toBeDefined();
    expect(created.status).toBe('Submitted');
    expect(created.items.length).toBe(1);

    const fetched = await getInvoiceById(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(created.id);

    const invoices = await getInvoices();
    expect(invoices.some((i) => i.id === created.id)).toBe(true);
  });

  it('should filter invoices by status, search, and vendor', async () => {
    const submittedInvoices = await getInvoices({ status: 'Submitted' });
    expect(submittedInvoices.every((i) => i.status === 'Submitted')).toBe(true);

    const first = (await getInvoices())[0];
    const filteredByVendor = await getInvoices({ vendorId: first.vendorId });
    expect(filteredByVendor.every((i) => i.vendorId === first.vendorId)).toBe(true);

    const searched = await getInvoices({ search: first.invoiceNumber });
    expect(searched.some((i) => i.id === first.id)).toBe(true);
  });
});

// backend/scripts/adapterConformance.ts
// Live conformance testing of frontend API adapters against backend implementation

// 1. Shims for Node.js environment
const storage = new Map<string, string>();
const sessionStorageShim = {
  getItem: (key: string): string | null => (storage.has(key) ? storage.get(key)! : null),
  setItem: (key: string, value: string): void => {
    storage.set(key, String(value));
  },
  removeItem: (key: string): void => {
    storage.delete(key);
  },
  clear: (): void => {
    storage.clear();
  },
  get length(): number {
    return storage.size;
  },
  key: (index: number): string | null => Array.from(storage.keys())[index] ?? null,
};

(globalThis as any).sessionStorage = sessionStorageShim;
(globalThis as any).window = globalThis;
(globalThis as any).window.sessionStorage = sessionStorageShim;
(globalThis as any).document = {};

import http from 'http';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../src/app';
import { seedDatabase } from '../src/config/seed';

import * as authApi from '../../src/services/api/auth';
import * as usersApi from '../../src/services/api/users';
import * as vendorsApi from '../../src/services/api/vendors';
import * as purchaseOrdersApi from '../../src/services/api/purchaseOrders';
import * as invoicesApi from '../../src/services/api/invoices';
import * as reportsApi from '../../src/services/api/reports';
import * as notificationsApi from '../../src/services/api/notifications';
import * as auditLogApi from '../../src/services/api/auditLog';
import { getStoredToken } from '../../src/services/api/client';

import {
  User,
  Vendor,
  PurchaseOrder,
  Invoice,
  ReportsSummaryResponse,
  VendorReportRow,
  Notification,
  AuditEntry,
} from '../../src/types';

// Validators
function validateUser(data: any): string[] {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') return ['Expected object for User'];
  if (typeof data.id !== 'string') errors.push('User.id must be string');
  if (typeof data.name !== 'string') errors.push('User.name must be string');
  if (typeof data.email !== 'string') errors.push('User.email must be string');
  if (!['Admin', 'Approver', 'Requester'].includes(data.role)) {
    errors.push(`User.role invalid: ${data.role}`);
  }
  if (data.avatarUrl !== undefined && typeof data.avatarUrl !== 'string') {
    errors.push('User.avatarUrl must be string if defined');
  }
  if (data.department !== undefined && typeof data.department !== 'string') {
    errors.push('User.department must be string if defined');
  }
  return errors;
}

function validateVendor(data: any): string[] {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') return ['Expected object for Vendor'];
  if (typeof data.id !== 'string') errors.push('Vendor.id must be string');
  if (typeof data.name !== 'string') errors.push('Vendor.name must be string');
  if (typeof data.contactEmail !== 'string') errors.push('Vendor.contactEmail must be string');
  if (!['Net 15', 'Net 30', 'Net 45', 'Net 60'].includes(data.paymentTerms)) {
    errors.push(`Vendor.paymentTerms invalid: ${data.paymentTerms}`);
  }
  if (typeof data.address !== 'string') errors.push('Vendor.address must be string');
  if (typeof data.taxId !== 'string') errors.push('Vendor.taxId must be string');
  if (!['Active', 'Under Review', 'Inactive'].includes(data.status)) {
    errors.push(`Vendor.status invalid: ${data.status}`);
  }
  if (data.phone !== undefined && typeof data.phone !== 'string') {
    errors.push('Vendor.phone must be string if defined');
  }
  if (data.totalInvoices !== undefined && typeof data.totalInvoices !== 'number') {
    errors.push('Vendor.totalInvoices must be number if defined');
  }
  return errors;
}

function validatePurchaseOrder(data: any): string[] {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') return ['Expected object for PurchaseOrder'];
  if (typeof data.id !== 'string') errors.push('PurchaseOrder.id must be string');
  if (typeof data.poNumber !== 'string') errors.push('PurchaseOrder.poNumber must be string');
  if (typeof data.vendorId !== 'string') errors.push('PurchaseOrder.vendorId must be string');
  if (typeof data.amount !== 'number') errors.push('PurchaseOrder.amount must be number');
  if (typeof data.description !== 'string') errors.push('PurchaseOrder.description must be string');
  if (typeof data.createdDate !== 'string') errors.push('PurchaseOrder.createdDate must be string');
  if (data.status !== undefined && !['Open', 'Partially Invoiced', 'Fulfilled', 'Closed'].includes(data.status)) {
    errors.push(`PurchaseOrder.status invalid: ${data.status}`);
  }
  if (!Array.isArray(data.items)) {
    errors.push('PurchaseOrder.items must be array');
  } else {
    data.items.forEach((item: any, i: number) => {
      if (typeof item.description !== 'string') errors.push(`items[${i}].description must be string`);
      if (typeof item.quantity !== 'number') errors.push(`items[${i}].quantity must be number`);
      if (typeof item.unitPrice !== 'number') errors.push(`items[${i}].unitPrice must be number`);
      if (typeof item.total !== 'number') errors.push(`items[${i}].total must be number`);
    });
  }
  return errors;
}

function validateInvoice(data: any): string[] {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') return ['Expected object for Invoice'];
  if (typeof data.id !== 'string') errors.push('Invoice.id must be string');
  if (typeof data.invoiceNumber !== 'string') errors.push('Invoice.invoiceNumber must be string');
  if (typeof data.vendorId !== 'string') errors.push('Invoice.vendorId must be string');
  if (typeof data.amount !== 'number') errors.push('Invoice.amount must be number');
  if (typeof data.dueDate !== 'string') errors.push('Invoice.dueDate must be string');
  if (typeof data.submittedDate !== 'string') errors.push('Invoice.submittedDate must be string');
  const validStatuses = ['Submitted', 'Under Verification', 'Approved', 'Flagged', 'Payment Scheduled', 'Paid'];
  if (!validStatuses.includes(data.status)) {
    errors.push(`Invoice.status invalid: ${data.status}`);
  }
  if (typeof data.submittedBy !== 'string') errors.push('Invoice.submittedBy must be string');
  if (!Array.isArray(data.items)) {
    errors.push('Invoice.items must be array');
  }
  return errors;
}

function validateReportsSummary(data: any): string[] {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') return ['Expected object for ReportsSummaryResponse'];
  const keys = [
    'totalBilled',
    'totalPaid',
    'pendingBalance',
    'spendPending',
    'requiresApprovalCount',
    'flaggedCount',
    'scheduledDisbursements',
  ];
  for (const k of keys) {
    if (typeof data[k] !== 'number') errors.push(`ReportsSummary.${k} must be number`);
  }
  return errors;
}

function validateVendorBreakdown(data: any): string[] {
  const errors: string[] = [];
  if (!Array.isArray(data)) return ['Expected array for VendorReportRow[]'];
  data.forEach((row: any, i: number) => {
    if (typeof row.vendorId !== 'string') errors.push(`rows[${i}].vendorId must be string`);
    if (typeof row.vendorName !== 'string') errors.push(`rows[${i}].vendorName must be string`);
    if (typeof row.taxId !== 'string') errors.push(`rows[${i}].taxId must be string`);
    if (typeof row.status !== 'string') errors.push(`rows[${i}].status must be string`);
    if (typeof row.paymentTerms !== 'string') errors.push(`rows[${i}].paymentTerms must be string`);
    if (typeof row.invoiceCount !== 'number') errors.push(`rows[${i}].invoiceCount must be number`);
    if (typeof row.totalBilled !== 'number') errors.push(`rows[${i}].totalBilled must be number`);
    if (typeof row.totalPaid !== 'number') errors.push(`rows[${i}].totalPaid must be number`);
    if (typeof row.pendingBalance !== 'number') errors.push(`rows[${i}].pendingBalance must be number`);
    if (typeof row.avgProcessingDays !== 'number') errors.push(`rows[${i}].avgProcessingDays must be number`);
  });
  return errors;
}

function validateNotification(data: any): string[] {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') return ['Expected object for Notification'];
  if (typeof data.id !== 'string') errors.push('Notification.id must be string');
  if (!['pending_approval', 'due_soon', 'overdue', 'flagged', 'paid'].includes(data.type)) {
    errors.push(`Notification.type invalid: ${data.type}`);
  }
  if (typeof data.invoiceId !== 'string') errors.push('Notification.invoiceId must be string');
  if (typeof data.message !== 'string') errors.push('Notification.message must be string');
  if (typeof data.read !== 'boolean') errors.push('Notification.read must be boolean');
  if (typeof data.createdAt !== 'string') errors.push('Notification.createdAt must be string');
  return errors;
}

function validateAuditEntry(data: any): string[] {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') return ['Expected object for AuditEntry'];
  if (typeof data.id !== 'string') errors.push('AuditEntry.id must be string');
  if (typeof data.invoiceId !== 'string') errors.push('AuditEntry.invoiceId must be string');
  if (typeof data.action !== 'string') errors.push('AuditEntry.action must be string');
  if (typeof data.performedBy !== 'string') errors.push('AuditEntry.performedBy must be string');
  if (typeof data.timestamp !== 'string') errors.push('AuditEntry.timestamp must be string');
  return errors;
}

async function runConformance(): Promise<void> {
  console.log('====================================================');
  console.log('PAYVERIFY ADAPTER CONFORMANCE SUITE');
  console.log('====================================================');

  // Start in-memory MongoDB
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  process.env.SEED_DEMO_DATA = 'true';

  await seedDatabase({ force: true });

  // Start server on port 5000
  let server: http.Server;
  await new Promise<void>((resolve) => {
    server = app.listen(5000, () => {
      resolve();
    });
  });

  let adminUser: User | null = null;
  let sampleVendor: Vendor | null = null;
  let samplePO: PurchaseOrder | null = null;
  let sampleInvoice: Invoice | null = null;
  let sampleNotificationId: string | null = null;

  try {
    // -------------------------------------------------------------------------
    // 1. authApi.login - Test object signature vs positional signature
    // -------------------------------------------------------------------------
    console.log('\n--- FUNCTION: authApi.login ---');
    // Test 1a: Calling with object payload as written in prompt: login({ email, password })
    try {
      await (authApi.login as any)({
        email: 'admin@payverify.local',
        password: 'AdminPass123!',
      });
      console.log('authApi.login (object argument { email, password }): PASS');
    } catch (err: any) {
      console.log(
        `authApi.login (object argument { email, password }): FAIL - ${err.message}`
      );
      console.log('  -> Defect location: Adapter (src/services/api/auth.ts:10 defines positional args (email, password), serializing object argument as { email: { ... }, password: "password123" }, rejected with HTTP 400).');
    }

    // Test 1b: Positional call: login(email, password) to properly set token in sessionStorage
    try {
      const loginRes = await authApi.login(
        'admin@payverify.local',
        'AdminPass123!'
      );
      const valErrors = validateUser(loginRes.user);
      if (typeof loginRes.token !== 'string' || !loginRes.token) {
        valErrors.push('LoginResponse.token must be non-empty string');
      }
      if (valErrors.length > 0) {
        console.log(
          `authApi.login (positional args): FAIL - Schema validation failed: ${valErrors.join(', ')}`
        );
      } else {
        console.log('authApi.login (positional args): PASS');
        adminUser = loginRes.user;
      }
    } catch (err: any) {
      console.log(`authApi.login (positional args): FAIL - ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // 2. authApi.getMe (adapter export: getCurrentUser)
    // -------------------------------------------------------------------------
    console.log('\n--- FUNCTION: authApi.getMe ---');
    try {
      const me = await authApi.getCurrentUser();
      if (!me) {
        console.log('authApi.getMe: FAIL - returned null');
      } else {
        const valErrors = validateUser(me);
        if (valErrors.length > 0) {
          console.log(`authApi.getMe: FAIL - ${valErrors.join(', ')}`);
        } else {
          console.log('authApi.getMe: PASS');
          adminUser = me;
        }
      }
    } catch (err: any) {
      console.log(`authApi.getMe: FAIL - ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // 3. authApi.logout
    // -------------------------------------------------------------------------
    console.log('\n--- FUNCTION: authApi.logout ---');
    try {
      await authApi.logout();
      const tokenAfterLogout = getStoredToken();
      if (tokenAfterLogout !== null) {
        console.log('authApi.logout: FAIL - token still present in storage');
      } else {
        console.log('authApi.logout: PASS');
      }
      // Re-login so subsequent authenticated calls proceed
      await authApi.login('admin@payverify.local', 'AdminPass123!');
    } catch (err: any) {
      console.log(`authApi.logout: FAIL - ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // 4. usersApi.getUsers
    // -------------------------------------------------------------------------
    console.log('\n--- FUNCTION: usersApi.getUsers ---');
    try {
      const users = await usersApi.getUsers();
      if (!Array.isArray(users) || users.length === 0) {
        console.log('usersApi.getUsers: FAIL - Expected non-empty array of users');
      } else {
        let allValid = true;
        for (const u of users) {
          const errs = validateUser(u);
          if (errs.length > 0) {
            allValid = false;
            console.log(`usersApi.getUsers: FAIL - ${errs.join(', ')}`);
            break;
          }
        }
        if (allValid) {
          console.log(`usersApi.getUsers: PASS (retrieved ${users.length} users)`);
        }
      }
    } catch (err: any) {
      console.log(`usersApi.getUsers: FAIL - ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // 5. usersApi.getUserById
    // -------------------------------------------------------------------------
    console.log('\n--- FUNCTION: usersApi.getUserById ---');
    try {
      const targetId = adminUser ? adminUser.id : 'unknown';
      const u = await usersApi.getUserById(targetId);
      if (!u) {
        console.log(`usersApi.getUserById: FAIL - User ${targetId} not found`);
      } else {
        const valErrors = validateUser(u);
        if (valErrors.length > 0) {
          console.log(`usersApi.getUserById: FAIL - ${valErrors.join(', ')}`);
        } else {
          console.log('usersApi.getUserById: PASS');
        }
      }
    } catch (err: any) {
      console.log(`usersApi.getUserById: FAIL - ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // 6. vendorsApi.getVendors
    // -------------------------------------------------------------------------
    console.log('\n--- FUNCTION: vendorsApi.getVendors ---');
    try {
      const vendors = await vendorsApi.getVendors();
      if (!Array.isArray(vendors) || vendors.length === 0) {
        console.log('vendorsApi.getVendors: FAIL - Expected non-empty array of vendors');
      } else {
        let allValid = true;
        for (const v of vendors) {
          const errs = validateVendor(v);
          if (errs.length > 0) {
            allValid = false;
            console.log(`vendorsApi.getVendors: FAIL - ${errs.join(', ')}`);
            break;
          }
        }
        if (allValid) {
          console.log(`vendorsApi.getVendors: PASS (retrieved ${vendors.length} vendors)`);
          sampleVendor = vendors[0];
        }
      }
    } catch (err: any) {
      console.log(`vendorsApi.getVendors: FAIL - ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // 7. vendorsApi.getVendorById
    // -------------------------------------------------------------------------
    console.log('\n--- FUNCTION: vendorsApi.getVendorById ---');
    try {
      const targetId = sampleVendor ? sampleVendor.id : 'unknown';
      const v = await vendorsApi.getVendorById(targetId);
      if (!v) {
        console.log(`vendorsApi.getVendorById: FAIL - Vendor ${targetId} not found`);
      } else {
        const valErrors = validateVendor(v);
        // Note: backend includes extra property 'invoices' on getVendorById
        if (valErrors.length > 0) {
          console.log(`vendorsApi.getVendorById: FAIL - ${valErrors.join(', ')}`);
        } else {
          console.log('vendorsApi.getVendorById: PASS');
        }
      }
    } catch (err: any) {
      console.log(`vendorsApi.getVendorById: FAIL - ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // 8. vendorsApi.createVendor
    // -------------------------------------------------------------------------
    console.log('\n--- FUNCTION: vendorsApi.createVendor ---');
    try {
      const newVendor = await vendorsApi.createVendor({
        name: 'Conformance Test Vendor LLC',
        contactEmail: 'conformance@testvendor.com',
        paymentTerms: 'Net 30',
        address: '100 Conformance Way, Suite 200, Austin, TX 78701',
        taxId: '88-1234567',
        status: 'Active',
        phone: '+1 (512) 555-0199',
      });
      const valErrors = validateVendor(newVendor);
      if (valErrors.length > 0) {
        console.log(`vendorsApi.createVendor: FAIL - ${valErrors.join(', ')}`);
      } else {
        console.log('vendorsApi.createVendor: PASS');
      }
    } catch (err: any) {
      console.log(`vendorsApi.createVendor: FAIL - ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // 9. purchaseOrdersApi.getPurchaseOrders
    // -------------------------------------------------------------------------
    console.log('\n--- FUNCTION: purchaseOrdersApi.getPurchaseOrders ---');
    try {
      const pos = await purchaseOrdersApi.getPurchaseOrders();
      if (!Array.isArray(pos) || pos.length === 0) {
        console.log('purchaseOrdersApi.getPurchaseOrders: FAIL - Expected non-empty array');
      } else {
        let allValid = true;
        for (const po of pos) {
          const errs = validatePurchaseOrder(po);
          if (errs.length > 0) {
            allValid = false;
            console.log(`purchaseOrdersApi.getPurchaseOrders: FAIL - ${errs.join(', ')}`);
            break;
          }
        }
        if (allValid) {
          console.log(`purchaseOrdersApi.getPurchaseOrders: PASS (retrieved ${pos.length} POs)`);
          samplePO = pos[0];
        }
      }
    } catch (err: any) {
      console.log(`purchaseOrdersApi.getPurchaseOrders: FAIL - ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // 10. purchaseOrdersApi.getPurchaseOrderById
    // -------------------------------------------------------------------------
    console.log('\n--- FUNCTION: purchaseOrdersApi.getPurchaseOrderById ---');
    try {
      const targetId = samplePO ? samplePO.id : 'unknown';
      const po = await purchaseOrdersApi.getPurchaseOrderById(targetId);
      if (!po) {
        console.log(`purchaseOrdersApi.getPurchaseOrderById: FAIL - PO ${targetId} not found`);
      } else {
        const valErrors = validatePurchaseOrder(po);
        if (valErrors.length > 0) {
          console.log(`purchaseOrdersApi.getPurchaseOrderById: FAIL - ${valErrors.join(', ')}`);
        } else {
          console.log('purchaseOrdersApi.getPurchaseOrderById: PASS');
        }
      }
    } catch (err: any) {
      console.log(`purchaseOrdersApi.getPurchaseOrderById: FAIL - ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // 11. invoicesApi.getInvoices
    // -------------------------------------------------------------------------
    console.log('\n--- FUNCTION: invoicesApi.getInvoices ---');
    try {
      const invoices = await invoicesApi.getInvoices();
      if (!Array.isArray(invoices)) {
        console.log('invoicesApi.getInvoices: FAIL - Expected array');
      } else {
        let allValid = true;
        for (const inv of invoices) {
          const errs = validateInvoice(inv);
          if (errs.length > 0) {
            allValid = false;
            console.log(`invoicesApi.getInvoices: FAIL - ${errs.join(', ')}`);
            break;
          }
        }
        if (allValid) {
          console.log(`invoicesApi.getInvoices: PASS (retrieved ${invoices.length} invoices)`);
        }
      }
    } catch (err: any) {
      console.log(`invoicesApi.getInvoices: FAIL - ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // 12. invoicesApi.createInvoice
    // -------------------------------------------------------------------------
    console.log('\n--- FUNCTION: invoicesApi.createInvoice ---');
    try {
      const vId = sampleVendor ? sampleVendor.id : 'unknown';
      const pId = samplePO ? samplePO.id : undefined;
      const subBy = adminUser ? adminUser.id : 'unknown';

      const inv = await invoicesApi.createInvoice({
        vendorId: vId,
        poId: pId,
        amount: 14500,
        dueDate: '2026-11-30',
        submittedDate: '2026-10-01',
        submittedBy: subBy,
        notes: 'Conformance automated test invoice',
        items: [
          {
            description: 'Cloud Compute Instances Tier 3',
            quantity: 3,
            unitPrice: 4000,
            total: 12000,
          },
          {
            description: '24/7 Enterprise Cloud Support SLA',
            quantity: 1,
            unitPrice: 2500,
            total: 2500,
          },
        ],
      });
      const valErrors = validateInvoice(inv);
      if (valErrors.length > 0) {
        console.log(`invoicesApi.createInvoice: FAIL - ${valErrors.join(', ')}`);
      } else {
        console.log('invoicesApi.createInvoice: PASS');
        sampleInvoice = inv;
      }
    } catch (err: any) {
      console.log(`invoicesApi.createInvoice: FAIL - ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // 13. invoicesApi.getInvoiceById
    // -------------------------------------------------------------------------
    console.log('\n--- FUNCTION: invoicesApi.getInvoiceById ---');
    try {
      const targetId = sampleInvoice ? sampleInvoice.id : 'unknown';
      const inv = await invoicesApi.getInvoiceById(targetId);
      if (!inv) {
        console.log(`invoicesApi.getInvoiceById: FAIL - Invoice ${targetId} not found`);
      } else {
        const valErrors = validateInvoice(inv);
        if (valErrors.length > 0) {
          console.log(`invoicesApi.getInvoiceById: FAIL - ${valErrors.join(', ')}`);
        } else {
          console.log('invoicesApi.getInvoiceById: PASS');
        }
      }
    } catch (err: any) {
      console.log(`invoicesApi.getInvoiceById: FAIL - ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // 14. invoicesApi.updateInvoiceStatus
    // -------------------------------------------------------------------------
    console.log('\n--- FUNCTION: invoicesApi.updateInvoiceStatus ---');
    try {
      const targetId = sampleInvoice ? sampleInvoice.id : 'unknown';
      // Transition to Flagged to enable notifications test
      const updated = await invoicesApi.updateInvoiceStatus(
        targetId,
        'Flagged',
        'Conformance inspection flag',
        adminUser?.id,
        { flagReason: 'Price verification discrepancy' }
      );
      const valErrors = validateInvoice(updated);
      if (updated.status !== 'Flagged') {
        valErrors.push(`Expected status 'Flagged', got '${updated.status}'`);
      }
      if (valErrors.length > 0) {
        console.log(`invoicesApi.updateInvoiceStatus: FAIL - ${valErrors.join(', ')}`);
      } else {
        console.log('invoicesApi.updateInvoiceStatus: PASS');
        sampleInvoice = updated;
      }
    } catch (err: any) {
      console.log(`invoicesApi.updateInvoiceStatus: FAIL - ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // 14b. invoicesApi.uploadInvoiceAttachment (supplementary adapter function)
    // -------------------------------------------------------------------------
    console.log('\n--- FUNCTION: invoicesApi.uploadInvoiceAttachment ---');
    try {
      const targetId = sampleInvoice ? sampleInvoice.id : 'unknown';
      const fileBlob = new Blob(['sample pdf content'], { type: 'application/pdf' });
      const testFile = new File([fileBlob], 'test-invoice.pdf', { type: 'application/pdf' });
      const uploaded = await invoicesApi.uploadInvoiceAttachment(targetId, testFile);
      if (!uploaded) {
        console.log('invoicesApi.uploadInvoiceAttachment: FAIL - Returned undefined (backend returns Invoice root, adapter expects { invoice: Invoice })');
        console.log('  -> Defect location: Adapter (src/services/api/invoices.ts:69 unpacks res.invoice, but backend res.status(200).json(invoice) returns root object).');
      } else {
        const valErrors = validateInvoice(uploaded);
        if (valErrors.length > 0) {
          console.log(`invoicesApi.uploadInvoiceAttachment: FAIL - ${valErrors.join(', ')}`);
        } else {
          console.log('invoicesApi.uploadInvoiceAttachment: PASS');
        }
      }
    } catch (err: any) {
      console.log(`invoicesApi.uploadInvoiceAttachment: FAIL - ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // 15. reportsApi.getReportsSummary
    // -------------------------------------------------------------------------
    console.log('\n--- FUNCTION: reportsApi.getReportsSummary ---');
    try {
      const summary = await reportsApi.getReportsSummary();
      const valErrors = validateReportsSummary(summary);
      if (valErrors.length > 0) {
        console.log(`reportsApi.getReportsSummary: FAIL - ${valErrors.join(', ')}`);
      } else {
        console.log('reportsApi.getReportsSummary: PASS');
      }
    } catch (err: any) {
      console.log(`reportsApi.getReportsSummary: FAIL - ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // 16. reportsApi.getVendorBreakdown
    // -------------------------------------------------------------------------
    console.log('\n--- FUNCTION: reportsApi.getVendorBreakdown ---');
    try {
      const breakdown = await reportsApi.getVendorBreakdown();
      const valErrors = validateVendorBreakdown(breakdown);
      if (valErrors.length > 0) {
        console.log(`reportsApi.getVendorBreakdown: FAIL - ${valErrors.join(', ')}`);
      } else {
        console.log(`reportsApi.getVendorBreakdown: PASS (retrieved ${breakdown.length} rows)`);
      }
    } catch (err: any) {
      console.log(`reportsApi.getVendorBreakdown: FAIL - ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // 17. notificationsApi.getNotifications
    // -------------------------------------------------------------------------
    console.log('\n--- FUNCTION: notificationsApi.getNotifications ---');
    try {
      const notifs = await notificationsApi.getNotifications();
      if (!Array.isArray(notifs)) {
        console.log('notificationsApi.getNotifications: FAIL - Expected array');
      } else {
        let allValid = true;
        for (const n of notifs) {
          const errs = validateNotification(n);
          if (errs.length > 0) {
            allValid = false;
            console.log(`notificationsApi.getNotifications: FAIL - ${errs.join(', ')}`);
            break;
          }
        }
        if (allValid) {
          console.log(`notificationsApi.getNotifications: PASS (retrieved ${notifs.length} notifications)`);
          if (notifs.length > 0) {
            sampleNotificationId = notifs[0].id;
          }
        }
      }
    } catch (err: any) {
      console.log(`notificationsApi.getNotifications: FAIL - ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // 18. notificationsApi.markAsRead
    // -------------------------------------------------------------------------
    console.log('\n--- FUNCTION: notificationsApi.markAsRead ---');
    try {
      if (!sampleNotificationId) {
        console.log('notificationsApi.markAsRead: FAIL - No notification available to mark as read');
      } else {
        await notificationsApi.markNotificationAsRead(sampleNotificationId);
        console.log('notificationsApi.markAsRead: PASS');
      }
    } catch (err: any) {
      console.log(`notificationsApi.markAsRead: FAIL - ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // 19. notificationsApi.markAllAsRead
    // -------------------------------------------------------------------------
    console.log('\n--- FUNCTION: notificationsApi.markAllAsRead ---');
    try {
      await notificationsApi.markAllNotificationsAsRead();
      console.log('notificationsApi.markAllAsRead: PASS');
    } catch (err: any) {
      console.log(`notificationsApi.markAllAsRead: FAIL - ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // 20. auditLogApi.getAuditLog
    // -------------------------------------------------------------------------
    console.log('\n--- FUNCTION: auditLogApi.getAuditLog ---');
    try {
      const entries = await auditLogApi.getAuditLog();
      if (!Array.isArray(entries)) {
        console.log('auditLogApi.getAuditLog: FAIL - Expected array');
      } else {
        let allValid = true;
        for (const e of entries) {
          const errs = validateAuditEntry(e);
          if (errs.length > 0) {
            allValid = false;
            console.log(`auditLogApi.getAuditLog: FAIL - ${errs.join(', ')}`);
            break;
          }
        }
        if (allValid) {
          console.log(`auditLogApi.getAuditLog: PASS (retrieved ${entries.length} entries)`);
        }
      }
    } catch (err: any) {
      console.log(`auditLogApi.getAuditLog: FAIL - ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // 20b. auditLogApi.addAuditEntry (supplementary adapter function)
    // -------------------------------------------------------------------------
    console.log('\n--- FUNCTION: auditLogApi.addAuditEntry ---');
    try {
      const entry = await auditLogApi.addAuditEntry({
        invoiceId: sampleInvoice ? sampleInvoice.id : 'unknown',
        action: 'VERIFICATION',
        performedBy: adminUser ? adminUser.id : 'System',
        details: 'Automated conformance test entry',
      });
      const valErrors = validateAuditEntry(entry);
      if (valErrors.length > 0) {
        console.log(`auditLogApi.addAuditEntry: FAIL - ${valErrors.join(', ')}`);
      } else {
        console.log('auditLogApi.addAuditEntry: PASS');
      }
    } catch (err: any) {
      console.log(`auditLogApi.addAuditEntry: FAIL - ${err.message}`);
      console.log('  -> Defect location: Backend (backend/src/routes/auditLog.routes.js does not expose POST /api/audit-log, returns HTTP 404).');
    }
  } finally {
    // Cleanup
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    await mongoose.disconnect();
    await mongod.stop();
    console.log('\n=== Conformance execution complete. Resources cleaned up. ===');
  }
}

runConformance().catch((err) => {
  console.error('Unhandled fatal error in conformance suite:', err);
  process.exit(1);
});

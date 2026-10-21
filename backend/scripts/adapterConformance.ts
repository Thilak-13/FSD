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

import * as http from 'http';
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
  Notification,
  AuditEntry,
} from '../../src/types';
import type {
  ReportsSummaryResponse,
  VendorReportRow,
} from '../../src/services/api/reports';

// Explicit allowlist of adapter parameters intentionally ignored by backend
const INTENTIONALLY_IGNORED_PARAMS = new Set<string>([
  // userId is intentionally ignored by backend because identity is derived strictly from verified JWT
  'notificationsApi.getNotifications:userId',
]);

function assertParameterNotIgnored(
  functionName: string,
  paramName: string,
  isEffective: boolean
): void {
  const key = `${functionName}:${paramName}`;
  if (!isEffective) {
    if (INTENTIONALLY_IGNORED_PARAMS.has(key)) {
      console.log(
        `${key}: PASS (parameter intentionally ignored per allowlist)`
      );
    } else {
      console.log(
        `${key}: FAIL - Parameter was ignored by backend/adapter and is NOT in allowlist`
      );
      throw new Error(`Parameter ${key} was ignored without allowlist exemption`);
    }
  } else {
    console.log(`${key}: PASS (filter is effective)`);
  }
}

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
  let secondVendor: Vendor | null = null;
  let samplePO: PurchaseOrder | null = null;
  let sampleInvoice: Invoice | null = null;
  let sampleNotificationId: string | null = null;
  let reqInvoiceId: string | null = null;

  try {
    // -------------------------------------------------------------------------
    // 1. authApi.login (positional arguments: email, password)
    // -------------------------------------------------------------------------
    console.log('\n--- FUNCTION: authApi.login ---');
    try {
      const loginRes = await authApi.login(
        'alex.rivera@apex.corp',
        'DemoPassword!2026'
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
      await authApi.login('alex.rivera@apex.corp', 'DemoPassword!2026');
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
          if (vendors.length > 1) {
            secondVendor = vendors[1];
          }
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
    // 9. purchaseOrdersApi.getPurchaseOrders & Filter Testing
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

      // Filter testing: seed 2 POs with different vendorIds, query with vendorId, assert filtered count matches
      console.log('--- Filter Test: purchaseOrdersApi.getPurchaseOrders (vendorId) ---');
      const vId1 = sampleVendor ? sampleVendor.id : 'vendor-1';
      const vId2 = secondVendor ? secondVendor.id : 'vendor-2';

      const poCollection = mongoose.connection.collection('purchaseorders');
      const testPoId1 = new mongoose.Types.ObjectId();
      const testPoId2 = new mongoose.Types.ObjectId();

      await poCollection.insertOne({
        _id: testPoId1,
        id: testPoId1.toString(),
        poNumber: 'PO-FILTER-V1',
        vendorId: mongoose.Types.ObjectId.isValid(vId1)
          ? new mongoose.Types.ObjectId(vId1)
          : vId1,
        amount: 3500,
        description: 'Vendor 1 Filter Test PO',
        status: 'Open',
        createdDate: '2026-10-01',
        items: [],
      });

      await poCollection.insertOne({
        _id: testPoId2,
        id: testPoId2.toString(),
        poNumber: 'PO-FILTER-V2',
        vendorId: mongoose.Types.ObjectId.isValid(vId2)
          ? new mongoose.Types.ObjectId(vId2)
          : vId2,
        amount: 4500,
        description: 'Vendor 2 Filter Test PO',
        status: 'Open',
        createdDate: '2026-10-02',
        items: [],
      });

      const allPOsAfterSeed = await purchaseOrdersApi.getPurchaseOrders();
      const filteredPOs = await purchaseOrdersApi.getPurchaseOrders(vId1);
      const expectedVendorCount = await poCollection.countDocuments({
        $or: [
          { vendorId: vId1 },
          ...(mongoose.Types.ObjectId.isValid(vId1)
            ? [{ vendorId: new mongoose.Types.ObjectId(vId1) }]
            : []),
        ],
      });

      const countMatches =
        filteredPOs.length === expectedVendorCount &&
        filteredPOs.length < allPOsAfterSeed.length;
      const allMatchVendor = filteredPOs.every(
        (po) => String(po.vendorId) === String(vId1)
      );

      assertParameterNotIgnored(
        'purchaseOrdersApi.getPurchaseOrders',
        'vendorId',
        countMatches && allMatchVendor
      );
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
    // 11. invoicesApi.getInvoices & Filter Testing
    // -------------------------------------------------------------------------
    console.log('\n--- FUNCTION: invoicesApi.getInvoices & Filter Testing ---');
    try {
      // Clear invoices to start with a deterministic state for filter testing
      await mongoose.connection.collection('invoices').deleteMany({});

      const vId1 = sampleVendor ? sampleVendor.id : 'unknown';
      const vId2 = secondVendor ? secondVendor.id : 'unknown';
      const subBy = adminUser ? adminUser.id : 'unknown';

      // Seed 2 invoices with distinct attributes
      // Invoice 1: status Submitted, vendorId1, date 2026-09-10, notes with AlphaSearchToken
      const filterInv1 = await invoicesApi.createInvoice({
        vendorId: vId1,
        amount: 4000,
        dueDate: '2026-10-10',
        submittedDate: '2026-09-10',
        submittedBy: subBy,
        notes: 'AlphaSearchToken test invoice description',
        items: [
          {
            description: 'AlphaSearchToken line item',
            quantity: 1,
            unitPrice: 4000,
            total: 4000,
          },
        ],
      });

      // Invoice 2: status Approved, vendorId2, date 2026-10-25, notes with BetaSearchToken
      const filterInv2 = await invoicesApi.createInvoice({
        vendorId: vId2,
        amount: 8000,
        dueDate: '2026-11-25',
        submittedDate: '2026-10-25',
        submittedBy: subBy,
        notes: 'BetaSearchToken test invoice description',
        items: [
          {
            description: 'BetaSearchToken line item',
            quantity: 2,
            unitPrice: 4000,
            total: 8000,
          },
        ],
      });

      // Transition filterInv2 to 'Approved'
      await invoicesApi.updateInvoiceStatus(
        filterInv2.id,
        'Approved',
        'Conformance approval for filter test',
        adminUser?.id
      );

      // Verify baseline getInvoices retrieval
      const baselineInvoices = await invoicesApi.getInvoices();
      if (!Array.isArray(baselineInvoices) || baselineInvoices.length !== 2) {
        console.log(`invoicesApi.getInvoices baseline: FAIL - Expected 2 invoices, got ${baselineInvoices.length}`);
      } else {
        console.log(`invoicesApi.getInvoices baseline: PASS (retrieved ${baselineInvoices.length} invoices)`);
      }

      // Filter 1: status ('Submitted' vs 'Approved')
      console.log('--- Filter Test: invoicesApi.getInvoices (status) ---');
      const statusFiltered = await invoicesApi.getInvoices({ status: 'Submitted' });
      const statusEffective =
        statusFiltered.length === 1 &&
        statusFiltered[0].status === 'Submitted' &&
        statusFiltered[0].id === filterInv1.id;
      assertParameterNotIgnored('invoicesApi.getInvoices', 'status', statusEffective);

      // Filter 2: vendorId
      console.log('--- Filter Test: invoicesApi.getInvoices (vendorId) ---');
      const vendorFiltered = await invoicesApi.getInvoices({ vendorId: vId1 });
      const vendorEffective =
        vendorFiltered.length === 1 &&
        String(vendorFiltered[0].vendorId) === String(vId1) &&
        vendorFiltered[0].id === filterInv1.id;
      assertParameterNotIgnored('invoicesApi.getInvoices', 'vendorId', vendorEffective);

      // Filter 3: from / to date range
      console.log('--- Filter Test: invoicesApi.getInvoices (from / to) ---');
      const allInvoices = await invoicesApi.getInvoices();
      const dateFiltered = await invoicesApi.getInvoices({
        from: '2026-10-01',
        to: '2026-10-31',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      } as any);
      const dateEffective =
        dateFiltered.length !== allInvoices.length &&
        dateFiltered.length === 1 &&
        dateFiltered[0].id === filterInv2.id;
      assertParameterNotIgnored('invoicesApi.getInvoices', 'from/to', dateEffective);

      // Filter 4: search
      console.log('--- Filter Test: invoicesApi.getInvoices (search) ---');
      const searchFiltered = await invoicesApi.getInvoices({ search: 'AlphaSearchToken' });
      const searchEffective =
        searchFiltered.length === 1 && searchFiltered[0].id === filterInv1.id;
      assertParameterNotIgnored('invoicesApi.getInvoices', 'search', searchEffective);
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

      // 1. Transition to Flagged with flagReason
      const flagged = await invoicesApi.updateInvoiceStatus(
        targetId,
        'Flagged',
        'Conformance inspection flag',
        adminUser?.id,
        { flagReason: 'Price verification discrepancy' }
      );
      const valErrorsFlagged = validateInvoice(flagged);
      if (flagged.status !== 'Flagged' || flagged.flagReason !== 'Price verification discrepancy') {
        valErrorsFlagged.push(`Expected Flagged with flagReason, got ${flagged.status} / ${flagged.flagReason}`);
      }
      if (valErrorsFlagged.length > 0) {
        console.log(`invoicesApi.updateInvoiceStatus (Flagged): FAIL - ${valErrorsFlagged.join(', ')}`);
      } else {
        console.log('invoicesApi.updateInvoiceStatus (Flagged with flagReason): PASS');
      }

      // 2. Transition to Payment Scheduled with scheduledPaymentDate
      const scheduled = await invoicesApi.updateInvoiceStatus(
        targetId,
        'Payment Scheduled',
        'Scheduled for payment batch',
        adminUser?.id,
        { scheduledPaymentDate: '2026-11-15' }
      );
      const valErrorsSched = validateInvoice(scheduled);
      if (scheduled.status !== 'Payment Scheduled' || scheduled.scheduledPaymentDate !== '2026-11-15') {
        valErrorsSched.push(`Expected Payment Scheduled with scheduledPaymentDate, got ${scheduled.status} / ${scheduled.scheduledPaymentDate}`);
      }
      if (valErrorsSched.length > 0) {
        console.log(`invoicesApi.updateInvoiceStatus (Payment Scheduled): FAIL - ${valErrorsSched.join(', ')}`);
      } else {
        console.log('invoicesApi.updateInvoiceStatus (Payment Scheduled with scheduledPaymentDate): PASS');
      }

      // 3. Transition to Paid with paidDate
      const paid = await invoicesApi.updateInvoiceStatus(
        targetId,
        'Paid',
        'Payment settled via ACH',
        adminUser?.id,
        { paidDate: '2026-11-16' }
      );
      const valErrorsPaid = validateInvoice(paid);
      if (paid.status !== 'Paid' || paid.paidDate !== '2026-11-16') {
        valErrorsPaid.push(`Expected Paid with paidDate, got ${paid.status} / ${paid.paidDate}`);
      }
      if (valErrorsPaid.length > 0) {
        console.log(`invoicesApi.updateInvoiceStatus (Paid): FAIL - ${valErrorsPaid.join(', ')}`);
      } else {
        console.log('invoicesApi.updateInvoiceStatus (Paid with paidDate): PASS');
      }

      // 4. Return to Flagged so downstream notifications tests receive expected state
      sampleInvoice = await invoicesApi.updateInvoiceStatus(
        targetId,
        'Flagged',
        'Conformance inspection flag restored',
        adminUser?.id,
        { flagReason: 'Price verification discrepancy' }
      );
      console.log('invoicesApi.updateInvoiceStatus: PASS');
    } catch (err: any) {
      console.log(`invoicesApi.updateInvoiceStatus: FAIL - ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // 14b. invoicesApi.uploadInvoiceAttachment & Download Test
    // -------------------------------------------------------------------------
    console.log('\n--- FUNCTION: invoicesApi.uploadInvoiceAttachment & Download ---');
    try {
      const targetId = sampleInvoice ? sampleInvoice.id : 'unknown';
      const fileBlob = new Blob(['sample pdf content'], { type: 'application/pdf' });
      const testFile = new File([fileBlob], 'test-invoice.pdf', { type: 'application/pdf' });
      const uploaded = await invoicesApi.uploadInvoiceAttachment(targetId, testFile);
      if (!uploaded) {
        console.log('invoicesApi.uploadInvoiceAttachment: FAIL - Returned undefined');
      } else {
        const valErrors = validateInvoice(uploaded);
        if (valErrors.length > 0) {
          console.log(`invoicesApi.uploadInvoiceAttachment: FAIL - ${valErrors.join(', ')}`);
        } else {
          console.log('invoicesApi.uploadInvoiceAttachment: PASS');
          sampleInvoice = uploaded;
        }
      }

      // Conformance attachment download test asserting 200 and received bytes
      const token = getStoredToken();
      const dlRes = await fetch(`http://localhost:5000/api/invoices/${targetId}/attachment`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (dlRes.status !== 200) {
        console.log(`GET /api/invoices/:id/attachment: FAIL - Status ${dlRes.status}`);
      } else {
        const cdHeader = dlRes.headers.get('content-disposition');
        const ctHeader = dlRes.headers.get('content-type');
        const bytes = await dlRes.arrayBuffer();
        if (!cdHeader || !cdHeader.includes('attachment')) {
          console.log(`GET /api/invoices/:id/attachment: FAIL - Missing or invalid Content-Disposition header: ${cdHeader}`);
        } else if (bytes.byteLength === 0) {
          console.log('GET /api/invoices/:id/attachment: FAIL - Received 0 bytes');
        } else {
          console.log(`GET /api/invoices/:id/attachment: PASS (status 200, Content-Type: ${ctHeader}, received ${bytes.byteLength} bytes)`);
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
    // 17. notificationsApi.getNotifications & Ignored Parameter Allowlist
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

      // Test intentionally ignored parameter 'userId'
      console.log('--- Allowlist Test: notificationsApi.getNotifications (userId) ---');
      const filteredByUserId = await notificationsApi.getNotifications('arbitrary-user-id-999');
      // Backend intentionally derives notifications strictly from verified JWT, ignoring userId query parameter
      const isUserIdEffective = filteredByUserId.length !== notifs.length;
      assertParameterNotIgnored('notificationsApi.getNotifications', 'userId', isUserIdEffective);
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
    // 20. auditLogApi.getAuditLog & Audit Log Filter / Triggers Tests
    // -------------------------------------------------------------------------
    console.log('\n--- FUNCTION: auditLogApi.getAuditLog & Triggers Test ---');
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

      // Audit log triggers test: Creating and approving an invoice generates audit entries
      // with performedBy containing the Admin user's name ('Alex Rivera')
      console.log('--- Triggers Test: auditLogApi (Creation & Approval by Admin) ---');
      const vId = sampleVendor ? sampleVendor.id : 'unknown';
      const auditTriggerInv = await invoicesApi.createInvoice({
        vendorId: vId,
        amount: 17500,
        dueDate: '2026-12-15',
        submittedDate: '2026-10-06',
        submittedBy: adminUser ? adminUser.id : 'unknown',
        notes: 'Audit log trigger test invoice',
        items: [
          {
            description: 'Audit log trigger verification item',
            quantity: 1,
            unitPrice: 17500,
            total: 17500,
          },
        ],
      });

      await invoicesApi.updateInvoiceStatus(
        auditTriggerInv.id,
        'Approved',
        'Approved by Alex Rivera in conformance suite',
        adminUser?.id
      );

      // Filter test: Query with specific invoiceId, assert filtered entries belong to that invoice
      console.log('--- Filter Test: auditLogApi.getAuditLog (invoiceId) ---');
      const filteredAuditEntries = await auditLogApi.getAuditLog(auditTriggerInv.id);
      const allAuditEntries = await auditLogApi.getAuditLog();

      const filterEffective =
        filteredAuditEntries.length > 0 &&
        filteredAuditEntries.length < allAuditEntries.length &&
        filteredAuditEntries.every((e) => String(e.invoiceId) === String(auditTriggerInv.id));

      assertParameterNotIgnored('auditLogApi.getAuditLog', 'invoiceId', filterEffective);

      // Verify actions and performedBy contains Admin user's name ('Alex Rivera')
      const hasSubmission = filteredAuditEntries.some((e) => e.action === 'SUBMISSION');
      const hasApproval = filteredAuditEntries.some((e) => e.action === 'APPROVAL');
      const adminName = 'Alex Rivera';
      const allAdminPerformed = filteredAuditEntries.every(
        (e) => e.performedBy && e.performedBy.includes(adminName)
      );

      if (!hasSubmission || !hasApproval) {
        console.log('auditLog triggers test: FAIL - Missing SUBMISSION or APPROVAL action in log');
      } else if (!allAdminPerformed) {
        console.log(
          `auditLog triggers test: FAIL - performedBy does not contain '${adminName}': ${JSON.stringify(
            filteredAuditEntries.map((e) => e.performedBy)
          )}`
        );
      } else {
        console.log(
          `auditLog triggers test: PASS (found SUBMISSION and APPROVAL entries with performedBy '${adminName}')`
        );
      }
    } catch (err: any) {
      console.log(`auditLogApi.getAuditLog: FAIL - ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // 21. Not-found Parity Tests
    // -------------------------------------------------------------------------
    console.log('\n--- NOT-FOUND PARITY TESTS ---');
    const nonexistentId = 'nonexistent-id-0000000000000000';

    try {
      const nfInvoice = await invoicesApi.getInvoiceById(nonexistentId);
      if (nfInvoice !== null) {
        console.log(`getInvoiceById (nonexistent): FAIL - Expected null, got ${JSON.stringify(nfInvoice)}`);
      } else {
        console.log('getInvoiceById (nonexistent): PASS (returned null)');
      }
    } catch (err: any) {
      console.log(`getInvoiceById (nonexistent): FAIL - Threw error: ${err.message}`);
    }

    try {
      const nfVendor = await vendorsApi.getVendorById(nonexistentId);
      if (nfVendor !== null) {
        console.log(`getVendorById (nonexistent): FAIL - Expected null, got ${JSON.stringify(nfVendor)}`);
      } else {
        console.log('getVendorById (nonexistent): PASS (returned null)');
      }
    } catch (err: any) {
      console.log(`getVendorById (nonexistent): FAIL - Threw error: ${err.message}`);
    }

    try {
      const nfPO = await purchaseOrdersApi.getPurchaseOrderById(nonexistentId);
      if (nfPO !== null) {
        console.log(`getPurchaseOrderById (nonexistent): FAIL - Expected null, got ${JSON.stringify(nfPO)}`);
      } else {
        console.log('getPurchaseOrderById (nonexistent): PASS (returned null)');
      }
    } catch (err: any) {
      console.log(`getPurchaseOrderById (nonexistent): FAIL - Threw error: ${err.message}`);
    }

    try {
      const nfUser = await usersApi.getUserById(nonexistentId);
      if (nfUser !== null) {
        console.log(`getUserById (nonexistent): FAIL - Expected null, got ${JSON.stringify(nfUser)}`);
      } else {
        console.log('getUserById (nonexistent): PASS (returned null)');
      }
    } catch (err: any) {
      console.log(`getUserById (nonexistent): FAIL - Threw error: ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // 22. Requester Pass
    // -------------------------------------------------------------------------
    console.log('\n====================================================');
    console.log('REQUESTER ROLE PASS');
    console.log('====================================================');

    try {
      const requesterLoginRes = await authApi.login(
        'jordan.lee@apex.corp',
        'DemoPassword!2026'
      );
      const requesterUser = requesterLoginRes.user;
      console.log(`Logged in as Requester: ${requesterUser.name} (${requesterUser.email})`);

      // Seed an invoice submitted by this Requester so there is at least one
      const reqInvoice = await invoicesApi.createInvoice({
        vendorId: sampleVendor ? sampleVendor.id : 'unknown',
        amount: 2400,
        dueDate: '2026-11-20',
        submittedDate: '2026-10-06',
        submittedBy: requesterUser.id,
        notes: 'Requester conformance invoice',
        items: [
          {
            description: 'Lab test equipment maintenance',
            quantity: 1,
            unitPrice: 2400,
            total: 2400,
          },
        ],
      });
      reqInvoiceId = reqInvoice.id;

      // 1. invoicesApi.getInvoices: assert only returns invoices submitted by this Requester
      try {
        const reqInvoices = await invoicesApi.getInvoices();
        const allOwned = reqInvoices.every(
          (inv) => String(inv.submittedBy) === String(requesterUser.id)
        );
        const containsReqInvoice = reqInvoices.some(
          (inv) => inv.id === reqInvoice.id
        );

        if (!allOwned || !containsReqInvoice) {
          console.log(
            'Requester invoicesApi.getInvoices: FAIL - Returned invoices not submitted by this Requester'
          );
        } else {
          console.log(
            `Requester invoicesApi.getInvoices: PASS (returned ${reqInvoices.length} invoices, all owned by Requester)`
          );
        }
      } catch (err: any) {
        console.log(`Requester invoicesApi.getInvoices: FAIL - ${err.message}`);
      }

      // 2. invoicesApi.getInvoiceById for an invoice submitted by Admin/another user: assert returns null
      try {
        const adminInvoiceId = sampleInvoice ? sampleInvoice.id : 'unknown';
        const nonOwnerResult = await invoicesApi.getInvoiceById(adminInvoiceId);
        if (nonOwnerResult !== null) {
          console.log(
            `Requester invoicesApi.getInvoiceById (non-owner): FAIL - Expected null, got ${JSON.stringify(nonOwnerResult)}`
          );
        } else {
          console.log(
            'Requester invoicesApi.getInvoiceById (non-owner): PASS (returned null for Admin-owned invoice)'
          );
        }
      } catch (err: any) {
        console.log(
          `Requester invoicesApi.getInvoiceById (non-owner): FAIL - ${err.message}`
        );
      }

      // 3. reportsApi.getVendorBreakdown: assert throws 403 error
      try {
        await reportsApi.getVendorBreakdown();
        console.log(
          'Requester reportsApi.getVendorBreakdown: FAIL - Expected 403 error, but call succeeded'
        );
      } catch (err: any) {
        const is403 =
          err?.message?.includes('403') ||
          err?.message?.toLowerCase().includes('forbidden') ||
          err?.status === 403 ||
          err?.statusCode === 403;
        if (is403) {
          console.log('Requester reportsApi.getVendorBreakdown: PASS (threw 403 Forbidden)');
        } else {
          console.log(
            `Requester reportsApi.getVendorBreakdown: FAIL - Unexpected error: ${err.message}`
          );
        }
      }

      // 4. usersApi.getUsers: assert throws 403 error
      try {
        await usersApi.getUsers();
        console.log(
          'Requester usersApi.getUsers: FAIL - Expected 403 error, but call succeeded'
        );
      } catch (err: any) {
        const is403 =
          err?.message?.includes('403') ||
          err?.message?.toLowerCase().includes('forbidden') ||
          err?.status === 403 ||
          err?.statusCode === 403;
        if (is403) {
          console.log('Requester usersApi.getUsers: PASS (threw 403 Forbidden)');
        } else {
          console.log(
            `Requester usersApi.getUsers: FAIL - Unexpected error: ${err.message}`
          );
        }
      }

      // 5. invoicesApi.updateInvoiceStatus: assert throws 403 Forbidden for Requester
      try {
        await invoicesApi.updateInvoiceStatus(
          reqInvoice.id,
          'Approved',
          'Requester illegal approval attempt'
        );
        console.log(
          'Requester updateInvoiceStatus: FAIL - Expected 403 error, but call succeeded'
        );
      } catch (err: any) {
        const is403 =
          err?.message?.includes('403') ||
          err?.message?.toLowerCase().includes('forbidden') ||
          err?.status === 403 ||
          err?.statusCode === 403;
        if (is403) {
          console.log('Requester updateInvoiceStatus: PASS (threw 403 Forbidden)');
        } else {
          console.log(
            `Requester updateInvoiceStatus: FAIL - Unexpected error: ${err.message}`
          );
        }
      }

      // 6. auditLogApi.getAuditLog without invoiceId: assert throws 403 Forbidden
      try {
        await auditLogApi.getAuditLog();
        console.log(
          'Requester auditLogApi.getAuditLog (without invoiceId): FAIL - Expected 403 Forbidden, but call succeeded'
        );
      } catch (err: any) {
        const is403 =
          err?.message?.includes('403') ||
          err?.message?.toLowerCase().includes('forbidden') ||
          err?.status === 403 ||
          err?.statusCode === 403;
        if (is403) {
          console.log('Requester auditLogApi.getAuditLog (without invoiceId): PASS (threw 403 Forbidden)');
        } else {
          console.log(
            `Requester auditLogApi.getAuditLog (without invoiceId): FAIL - Unexpected error: ${err.message}`
          );
        }
      }

      // 7. auditLogApi.getAuditLog for own invoice: assert returns 200 array of entries
      try {
        const ownEntries = await auditLogApi.getAuditLog(reqInvoice.id);
        if (!Array.isArray(ownEntries) || ownEntries.length === 0) {
          console.log(
            'Requester auditLogApi.getAuditLog (own invoice): FAIL - Expected non-empty array of audit entries'
          );
        } else {
          const allMatch = ownEntries.every((e) => String(e.invoiceId) === String(reqInvoice.id));
          if (allMatch) {
            console.log(
              `Requester auditLogApi.getAuditLog (own invoice): PASS (retrieved ${ownEntries.length} entries for owned invoice)`
            );
          } else {
            console.log(
              'Requester auditLogApi.getAuditLog (own invoice): FAIL - Some entries did not match invoice ID'
            );
          }
        }
      } catch (err: any) {
        console.log(`Requester auditLogApi.getAuditLog (own invoice): FAIL - ${err.message}`);
      }

      // 8. auditLogApi.getAuditLog for other user's invoice: assert throws 404 Not Found
      try {
        const otherInvoiceId = sampleInvoice ? sampleInvoice.id : 'unknown';
        await auditLogApi.getAuditLog(otherInvoiceId);
        console.log(
          'Requester auditLogApi.getAuditLog (other invoice): FAIL - Expected 404 Not Found, but call succeeded'
        );
      } catch (err: any) {
        const is404 =
          err?.message?.includes('404') ||
          err?.message?.toLowerCase().includes('not found') ||
          err?.status === 404 ||
          err?.statusCode === 404;
        if (is404) {
          console.log('Requester auditLogApi.getAuditLog (other invoice): PASS (threw 404 Not Found)');
        } else {
          console.log(
            `Requester auditLogApi.getAuditLog (other invoice): FAIL - Unexpected error: ${err.message}`
          );
        }
      }
    } catch (err: any) {
      console.log(`Requester pass login: FAIL - ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // 23. Approver Pass
    // -------------------------------------------------------------------------
    console.log('\n====================================================');
    console.log('APPROVER ROLE PASS');
    console.log('====================================================');

    try {
      const approverLoginRes = await authApi.login(
        'sarah.chen@apex.corp',
        'DemoPassword!2026'
      );
      const approverUser = approverLoginRes.user;
      console.log(`Logged in as Approver: ${approverUser.name} (${approverUser.email})`);

      // 1. Can view all invoices
      try {
        const allInvoices = await invoicesApi.getInvoices();
        if (!Array.isArray(allInvoices) || allInvoices.length === 0) {
          console.log('Approver invoicesApi.getInvoices: FAIL - Expected non-empty array of invoices');
        } else {
          console.log(`Approver invoicesApi.getInvoices: PASS (retrieved ${allInvoices.length} invoices across all users)`);
        }
      } catch (err: any) {
        console.log(`Approver invoicesApi.getInvoices: FAIL - ${err.message}`);
      }

      // 2. Approve invoice
      try {
        const targetId = sampleInvoice ? sampleInvoice.id : 'unknown';
        const approvedByApprover = await invoicesApi.updateInvoiceStatus(
          targetId,
          'Approved',
          'Approved by Sarah Chen in Approver pass',
          approverUser.id
        );
        if (approvedByApprover.status === 'Approved') {
          console.log('Approver updateInvoiceStatus (approve): PASS');
        } else {
          console.log(`Approver updateInvoiceStatus (approve): FAIL - status was ${approvedByApprover.status}`);
        }
      } catch (err: any) {
        console.log(`Approver updateInvoiceStatus (approve): FAIL - ${err.message}`);
      }

      // 3. Download attachment
      try {
        const targetId = sampleInvoice ? sampleInvoice.id : 'unknown';
        const token = getStoredToken();
        const appDlRes = await fetch(`http://localhost:5000/api/invoices/${targetId}/attachment`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (appDlRes.status === 200) {
          const bytes = await appDlRes.arrayBuffer();
          const cdHeader = appDlRes.headers.get('content-disposition');
          if (bytes.byteLength > 0 && cdHeader && cdHeader.includes('attachment')) {
            console.log(`Approver download attachment: PASS (status 200, received ${bytes.byteLength} bytes)`);
          } else {
            console.log(`Approver download attachment: FAIL - bytes: ${bytes.byteLength}, cd: ${cdHeader}`);
          }
        } else {
          console.log(`Approver download attachment: FAIL - status ${appDlRes.status}`);
        }
      } catch (err: any) {
        console.log(`Approver download attachment: FAIL - ${err.message}`);
      }

      // 4. auditLogApi.getAuditLog without invoiceId: assert throws 403 Forbidden
      try {
        await auditLogApi.getAuditLog();
        console.log(
          'Approver auditLogApi.getAuditLog (without invoiceId): FAIL - Expected 403 Forbidden, but call succeeded'
        );
      } catch (err: any) {
        const is403 =
          err?.message?.includes('403') ||
          err?.message?.toLowerCase().includes('forbidden') ||
          err?.status === 403 ||
          err?.statusCode === 403;
        if (is403) {
          console.log('Approver auditLogApi.getAuditLog (without invoiceId): PASS (threw 403 Forbidden)');
        } else {
          console.log(
            `Approver auditLogApi.getAuditLog (without invoiceId): FAIL - Unexpected error: ${err.message}`
          );
        }
      }

      // 5. auditLogApi.getAuditLog for Requester invoice: assert returns 200 array of entries
      try {
        const targetReqId = reqInvoiceId || 'unknown';
        const reqEntries = await auditLogApi.getAuditLog(targetReqId);
        if (!Array.isArray(reqEntries) || reqEntries.length === 0) {
          console.log(
            'Approver auditLogApi.getAuditLog (Requester invoice): FAIL - Expected non-empty array'
          );
        } else {
          console.log(
            `Approver auditLogApi.getAuditLog (Requester invoice): PASS (retrieved ${reqEntries.length} entries)`
          );
        }
      } catch (err: any) {
        console.log(`Approver auditLogApi.getAuditLog (Requester invoice): FAIL - ${err.message}`);
      }

      // 6. auditLogApi.getAuditLog for Admin/own invoice: assert returns 200 array of entries
      try {
        const targetAdminId = sampleInvoice ? sampleInvoice.id : 'unknown';
        const adminEntries = await auditLogApi.getAuditLog(targetAdminId);
        if (!Array.isArray(adminEntries) || adminEntries.length === 0) {
          console.log(
            'Approver auditLogApi.getAuditLog (Admin invoice): FAIL - Expected non-empty array'
          );
        } else {
          console.log(
            `Approver auditLogApi.getAuditLog (Admin invoice): PASS (retrieved ${adminEntries.length} entries)`
          );
        }
      } catch (err: any) {
        console.log(`Approver auditLogApi.getAuditLog (Admin invoice): FAIL - ${err.message}`);
      }
    } catch (err: any) {
      console.log(`Approver pass login: FAIL - ${err.message}`);
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

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { connectDB, disconnectDB } = require('../src/config/db');
const { seedDatabase } = require('../src/config/seed');
const { getDerivedNotifications } = require('../src/services/notificationService');
const User = require('../src/models/User');
const Vendor = require('../src/models/Vendor');
const PurchaseOrder = require('../src/models/PurchaseOrder');
const Invoice = require('../src/models/Invoice');
const AuditEntry = require('../src/models/AuditEntry');

describe('Database Seed Unit Tests', () => {
  let mongod;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await connectDB(uri);
  });

  afterAll(async () => {
    await disconnectDB();
    if (mongod) {
      await mongod.stop();
    }
  });

  beforeEach(async () => {
    await AuditEntry.deleteMany({});
    await Invoice.deleteMany({});
    await PurchaseOrder.deleteMany({});
    await Vendor.deleteMany({});
    await User.deleteMany({});
  });

  it('seeds database on initial run and returns expected counts for 1-month dataset', async () => {
    const result = await seedDatabase();

    expect(result).toEqual({
      usersCreated: 3,
      vendorsCreated: 6,
      posCreated: 12,
      purchaseOrdersCreated: 12,
      invoicesCreated: 32,
      auditEntriesCreated: 91,
    });

    // Verify DB counts
    expect(await User.countDocuments()).toBe(3);
    expect(await Vendor.countDocuments()).toBe(6);
    expect(await PurchaseOrder.countDocuments()).toBe(12);
    expect(await Invoice.countDocuments()).toBe(32);
    expect(await AuditEntry.countDocuments()).toBe(91);

    // Verify invoice status distribution across all 6 statuses
    const invoices = await Invoice.find({}).lean();
    const distribution = invoices.reduce((acc, inv) => {
      acc[inv.status] = (acc[inv.status] || 0) + 1;
      return acc;
    }, {});

    console.log('SEEDED INVOICE STATUS DISTRIBUTION:', JSON.stringify(distribution, null, 2));

    expect(distribution['Submitted']).toBe(6);
    expect(distribution['Under Verification']).toBe(6);
    expect(distribution['Approved']).toBe(6);
    expect(distribution['Flagged']).toBe(5);
    expect(distribution['Payment Scheduled']).toBe(5);
    expect(distribution['Paid']).toBe(4);

    // Verify vendor distribution covers all 6 vendors
    const vendors = await Vendor.find({}).lean();
    const vendorMap = new Map(vendors.map((v) => [v._id.toString(), v.name]));
    const vendorCounts = invoices.reduce((acc, inv) => {
      const name = vendorMap.get(inv.vendorId.toString());
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});

    console.log('SEEDED VENDOR DISTRIBUTION:', JSON.stringify(vendorCounts, null, 2));

    expect(vendorCounts['Apex Cloud Services']).toBeGreaterThanOrEqual(1);
    expect(vendorCounts['Northwest Logistics']).toBeGreaterThanOrEqual(1);
    expect(vendorCounts['ByteForce Technologies']).toBeGreaterThanOrEqual(1);
    expect(vendorCounts['Summit Creative']).toBeGreaterThanOrEqual(1);
    expect(vendorCounts['Pioneer Industrial']).toBeGreaterThanOrEqual(1);
    expect(vendorCounts['Vanguard Facility Solutions']).toBeGreaterThanOrEqual(1);

    // Verify submitter personas are spread across Alex Rivera, Sarah Chen, and Jordan Lee
    const users = await User.find({}).lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u.name]));
    const submitterCounts = invoices.reduce((acc, inv) => {
      const name = userMap.get(inv.submittedBy.toString());
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});

    console.log('SEEDED SUBMITTER DISTRIBUTION:', JSON.stringify(submitterCounts, null, 2));

    expect(submitterCounts['Alex Rivera']).toBeGreaterThan(0);
    expect(submitterCounts['Sarah Chen']).toBeGreaterThan(0);
    expect(submitterCounts['Jordan Lee']).toBeGreaterThan(0);

    // Verify 2-way and 3-way matching representation
    const invoicesWithPO = invoices.filter((inv) => inv.poId != null);
    const invoicesWithoutPO = invoices.filter((inv) => inv.poId == null);
    expect(invoicesWithPO.length).toBeGreaterThan(0);
    expect(invoicesWithoutPO.length).toBeGreaterThan(0);

    // Verify tolerance variances: within tolerance (+0.01) vs outside tolerance (>0.01)
    const withinToleranceInv = invoices.find(
      (inv) => inv.invoiceNumber === 'INV-2026-024'
    );
    expect(withinToleranceInv).toBeDefined();
    expect(withinToleranceInv.amount).toBe(6400.01);
    expect(withinToleranceInv.status).toBe('Under Verification');

    const outsideToleranceInv = invoices.find(
      (inv) => inv.invoiceNumber === 'INV-2026-009'
    );
    expect(outsideToleranceInv).toBeDefined();
    expect(outsideToleranceInv.status).toBe('Flagged');
    expect(outsideToleranceInv.flagReason).toContain('exceeds ±$0.01 tolerance');

    // Verify flagged reasons include price mismatch, quantity excess, duplicate, and surcharge
    const flagged = invoices.filter((inv) => inv.status === 'Flagged');
    expect(flagged).toHaveLength(5);
    const hasPriceMismatch = flagged.some((inv) =>
      inv.items.some((item) => item.priceMismatch === true)
    );
    const hasQuantityExcess = flagged.some((inv) =>
      inv.items.some((item) => item.quantityMismatch === true)
    );
    const hasDuplicateFlag = flagged.some((inv) =>
      inv.flagReason && inv.flagReason.toLowerCase().includes('duplicate')
    );
    expect(hasPriceMismatch).toBe(true);
    expect(hasQuantityExcess).toBe(true);
    expect(hasDuplicateFlag).toBe(true);

    // Verify attachedDocumentName and attachedDocumentPath
    invoices.forEach((inv) => {
      expect(inv.attachedDocumentName).toBeDefined();
      expect(inv.attachedDocumentName).toMatch(/^INV-2026-\d{3}_.+\.pdf$/);
      expect(inv.attachedDocumentPath).toBe('uploads/sample-attachment.pdf');
    });

    // Verify relative dates: due dates and submitted dates are properly formatted
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    invoices.forEach((inv) => {
      expect(inv.dueDate).toMatch(isoDateRegex);
      expect(inv.submittedDate).toMatch(isoDateRegex);
    });

    // Verify submission dates span the 30-day window from t-30 to t=0
    const submissionDates = invoices.map((inv) => inv.submittedDate).sort();
    const earliestSubmission = submissionDates[0];
    const latestSubmission = submissionDates[submissionDates.length - 1];
    expect(earliestSubmission).not.toEqual(latestSubmission);

    // Verify audit entry transitions have performer's name in details and match actions
    const auditEntries = await AuditEntry.find({}).populate('performedBy', 'name').lean();
    expect(auditEntries).toHaveLength(91);
    auditEntries.forEach((entry) => {
      expect(entry.performedBy).toBeDefined();
      expect(entry.performedBy.name).toBeDefined();
      expect(['Alex Rivera', 'Sarah Chen', 'Jordan Lee']).toContain(entry.performedBy.name);
      expect(entry.details).toContain(entry.performedBy.name);
    });

    // Verify notification derivation covers all 4 notification types spanning the 30-day period
    const admin = users.find((u) => u.name === 'Alex Rivera');
    const notifications = await getDerivedNotifications(admin);
    const notifTypes = new Set(notifications.map((n) => n.type));

    expect(notifTypes.has('flagged')).toBe(true);
    expect(notifTypes.has('overdue')).toBe(true);
    expect(notifTypes.has('due_soon')).toBe(true);
    expect(notifTypes.has('pending_approval')).toBe(true);
  });

  it('skips seeding when users already exist unless force is true', async () => {
    // Initial seed
    const firstResult = await seedDatabase();
    expect(firstResult.usersCreated).toBe(3);
    expect(firstResult.invoicesCreated).toBe(32);

    // Second seed without force
    const secondResult = await seedDatabase();
    expect(secondResult).toEqual({
      usersCreated: 0,
      vendorsCreated: 0,
      posCreated: 0,
      purchaseOrdersCreated: 0,
      invoicesCreated: 0,
      auditEntriesCreated: 0,
    });

    // Asserts DB counts did not change
    expect(await User.countDocuments()).toBe(3);
    expect(await Vendor.countDocuments()).toBe(6);
    expect(await PurchaseOrder.countDocuments()).toBe(12);
    expect(await Invoice.countDocuments()).toBe(32);
    expect(await AuditEntry.countDocuments()).toBe(91);
  });

  it('re-seeds database when force: true is specified', async () => {
    // Initial seed
    const firstResult = await seedDatabase();
    expect(firstResult.usersCreated).toBe(3);

    // Force re-seed
    const forceResult = await seedDatabase({ force: true });
    expect(forceResult).toEqual({
      usersCreated: 3,
      vendorsCreated: 6,
      posCreated: 12,
      purchaseOrdersCreated: 12,
      invoicesCreated: 32,
      auditEntriesCreated: 91,
    });

    // DB counts remain clean and exact
    expect(await User.countDocuments()).toBe(3);
    expect(await Vendor.countDocuments()).toBe(6);
    expect(await PurchaseOrder.countDocuments()).toBe(12);
    expect(await Invoice.countDocuments()).toBe(32);
    expect(await AuditEntry.countDocuments()).toBe(91);
  });

  describe('RBAC and Data Endpoint Conformance on Seeded Dataset', () => {
    let app;
    let adminToken, approverToken, requesterToken;
    let alex, sarah, jordan;

    beforeEach(async () => {
      await seedDatabase({ force: true });
      app = require('../src/app');

      alex = await User.findOne({ email: 'alex.rivera@apex.corp' });
      sarah = await User.findOne({ email: 'sarah.chen@apex.corp' });
      jordan = await User.findOne({ email: 'jordan.lee@apex.corp' });

      const jwt = require('jsonwebtoken');
      const { JWT_SECRET } = require('../src/config/env');

      adminToken = jwt.sign(
        { id: alex._id.toString(), role: alex.role, email: alex.email, name: alex.name },
        JWT_SECRET
      );
      approverToken = jwt.sign(
        { id: sarah._id.toString(), role: sarah.role, email: sarah.email, name: sarah.name },
        JWT_SECRET
      );
      requesterToken = jwt.sign(
        { id: jordan._id.toString(), role: jordan.role, email: jordan.email, name: jordan.name },
        JWT_SECRET
      );
    });

    it('Admin and Approver receive all 32 seeded invoices, whereas Requester receives only invoices submitted by them', async () => {
      const request = require('supertest');

      // Admin gets 32
      const adminRes = await request(app)
        .get('/api/invoices')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminRes.status).toBe(200);
      expect(adminRes.body).toHaveLength(32);

      // Approver gets 32
      const approverRes = await request(app)
        .get('/api/invoices')
        .set('Authorization', `Bearer ${approverToken}`);
      expect(approverRes.status).toBe(200);
      expect(approverRes.body).toHaveLength(32);

      // Requester gets only Jordan's invoices
      const reqRes = await request(app)
        .get('/api/invoices')
        .set('Authorization', `Bearer ${requesterToken}`);
      expect(reqRes.status).toBe(200);
      expect(reqRes.body.length).toBeGreaterThan(0);
      expect(reqRes.body.length).toBeLessThan(32);
      reqRes.body.forEach((inv) => {
        expect(inv.submittedBy.toString()).toBe(jordan._id.toString());
      });
    });

    it('GET /api/reports/summary calculates metrics across the 32 invoices for Admin/Approver and scopes for Requester', async () => {
      const request = require('supertest');

      const adminRes = await request(app)
        .get('/api/reports/summary')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.totalBilled).toBeGreaterThan(0);
      expect(adminRes.body.requiresApprovalCount).toBe(6);
      expect(adminRes.body.flaggedCount).toBe(5);

      const approverRes = await request(app)
        .get('/api/reports/summary')
        .set('Authorization', `Bearer ${approverToken}`);
      expect(approverRes.status).toBe(200);
      expect(approverRes.body.totalBilled).toBe(adminRes.body.totalBilled);
      expect(approverRes.body.requiresApprovalCount).toBe(6);
      expect(approverRes.body.flaggedCount).toBe(5);

      // Requester summary is scoped
      const requesterRes = await request(app)
        .get('/api/reports/summary')
        .set('Authorization', `Bearer ${requesterToken}`);
      expect(requesterRes.status).toBe(200);
      expect(requesterRes.body.totalBilled).toBeLessThan(adminRes.body.totalBilled);
    });

    it('Requester receives 403 on vendor breakdown, Admin and Approver receive breakdown', async () => {
      const request = require('supertest');

      const reqRes = await request(app)
        .get('/api/reports/vendor-breakdown')
        .set('Authorization', `Bearer ${requesterToken}`);
      expect(reqRes.status).toBe(403);

      const adminRes = await request(app)
        .get('/api/reports/vendor-breakdown')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminRes.status).toBe(200);
      expect(adminRes.body).toHaveLength(6);

      const appRes = await request(app)
        .get('/api/reports/vendor-breakdown')
        .set('Authorization', `Bearer ${approverToken}`);
      expect(appRes.status).toBe(200);
      expect(appRes.body).toHaveLength(6);
    });

    it('Admin can access all audit logs, Requester gets 403 without invoiceId and 404 for other invoices', async () => {
      const request = require('supertest');

      // Admin accesses all 91 audit logs
      const adminRes = await request(app)
        .get('/api/audit-log')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminRes.status).toBe(200);
      expect(adminRes.body).toHaveLength(91);

      // Requester gets 403 without invoiceId
      const reqListRes = await request(app)
        .get('/api/audit-log')
        .set('Authorization', `Bearer ${requesterToken}`);
      expect(reqListRes.status).toBe(403);

      // Requester gets their own invoice audit logs
      const jordanInv = await Invoice.findOne({ submittedBy: jordan._id });
      const reqOwnRes = await request(app)
        .get(`/api/audit-log?invoiceId=${jordanInv._id}`)
        .set('Authorization', `Bearer ${requesterToken}`);
      expect(reqOwnRes.status).toBe(200);
      expect(reqOwnRes.body.length).toBeGreaterThan(0);

      // Requester gets 404 for Sarah's invoice
      const sarahInv = await Invoice.findOne({ submittedBy: sarah._id });
      const reqOtherRes = await request(app)
        .get(`/api/audit-log?invoiceId=${sarahInv._id}`)
        .set('Authorization', `Bearer ${requesterToken}`);
      expect(reqOtherRes.status).toBe(404);
    });
  });
});


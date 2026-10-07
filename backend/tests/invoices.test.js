const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const { connectDB, disconnectDB } = require('../src/config/db');
const { JWT_SECRET } = require('../src/config/env');
const User = require('../src/models/User');
const Vendor = require('../src/models/Vendor');
const PurchaseOrder = require('../src/models/PurchaseOrder');
const Invoice = require('../src/models/Invoice');
const AuditEntry = require('../src/models/AuditEntry');
const invoicesRouter = require('../src/routes/invoices.routes');
const { verifyInvoice, validateInvoice } = require('../src/services/verificationService');

const daysFromNow = (days) => {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().split('T')[0];
};

describe('Invoices Integration & Verification Tests', () => {
  let mongod;
  let app;
  let adminUser, approverUser, requesterUser;
  let adminToken, approverToken, requesterToken;
  let testVendor, testPO;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await connectDB(uri);

    // Setup dedicated Express app for invoices testing
    app = express();
    app.use(express.json());
    app.use('/api/invoices', invoicesRouter);

    // Error handling middleware
    app.use((err, req, res, next) => {
      res.status(err.status || 500).json({ error: err.message });
    });
  });

  afterAll(async () => {
    await disconnectDB();
    if (mongod) {
      await mongod.stop();
    }
  });

  beforeEach(async () => {
    await Invoice.deleteMany({});
    await AuditEntry.deleteMany({});
    await PurchaseOrder.deleteMany({});
    await Vendor.deleteMany({});
    await User.deleteMany({});

    const passwordHash = await bcrypt.hash('Secret123!', 10);

    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@payverify.local',
      passwordHash,
      role: 'Admin',
    });

    approverUser = await User.create({
      name: 'Approver User',
      email: 'approver@payverify.local',
      passwordHash,
      role: 'Approver',
    });

    requesterUser = await User.create({
      name: 'Requester User',
      email: 'requester@payverify.local',
      passwordHash,
      role: 'Requester',
    });

    adminToken = jwt.sign(
      { id: adminUser._id.toString(), role: 'Admin', email: adminUser.email },
      JWT_SECRET
    );
    approverToken = jwt.sign(
      { id: approverUser._id.toString(), role: 'Approver', email: approverUser.email },
      JWT_SECRET
    );
    requesterToken = jwt.sign(
      { id: requesterUser._id.toString(), role: 'Requester', email: requesterUser.email },
      JWT_SECRET
    );

    testVendor = await Vendor.create({
      name: 'Apex Cloud Services',
      contactEmail: 'billing@apexcloud.io',
      paymentTerms: 'Net 30',
      address: '500 Howard St, San Francisco, CA',
      taxId: '94-3289104',
      status: 'Active',
    });

    testPO = await PurchaseOrder.create({
      poNumber: 'PO-2026-001',
      vendorId: testVendor._id,
      amount: 5000.0,
      description: 'Cloud Compute Infrastructure',
      items: [
        {
          id: 'poi-1',
          description: 'Cloud Compute Instances',
          quantity: 5,
          unitPrice: 1000,
          total: 5000,
        },
      ],
    });
  });

  describe('Happy path invoice creation & listing', () => {
    it('creates an invoice, matches PO cleanly, and auto-generates SUBMISSION AuditEntry', async () => {
      const res = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({
          invoiceNumber: 'INV-2026-001',
          vendorId: testVendor._id.toString(),
          poId: testPO._id.toString(),
          amount: 5000.0,
          dueDate: daysFromNow(30),
          submittedDate: daysFromNow(0),
          notes: 'Standard monthly bill',
          items: [
            {
              description: 'Cloud Compute Instances',
              quantity: 5,
              unitPrice: 1000,
              total: 5000,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.invoiceNumber).toBe('INV-2026-001');
      expect(res.body.status).toBe('Under Verification');
      expect(res.body.amount).toBe(5000.0);

      // Verify SUBMISSION audit entry was created
      const auditEntries = await AuditEntry.find({ invoiceId: res.body._id || res.body.id });
      expect(auditEntries.length).toBe(1);
      expect(auditEntries[0].action).toBe('SUBMISSION');
      expect(auditEntries[0].performedBy.toString()).toBe(requesterUser._id.toString());
    });

    it('lists invoices with filtering by status, vendor, and date range', async () => {
      // Create two invoices with relative dates
      await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({
          invoiceNumber: 'INV-2026-001',
          vendorId: testVendor._id.toString(),
          poId: testPO._id.toString(),
          amount: 5000.0,
          dueDate: daysFromNow(15),
          submittedDate: daysFromNow(-20),
        });

      await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({
          invoiceNumber: 'INV-2026-002',
          vendorId: testVendor._id.toString(),
          amount: 1200.0,
          dueDate: daysFromNow(20),
          submittedDate: daysFromNow(-5),
        });

      // 1. List all
      const resAll = await request(app)
        .get('/api/invoices')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resAll.status).toBe(200);
      expect(Array.isArray(resAll.body)).toBe(true);
      expect(resAll.body.length).toBe(2);

      // 2. Filter by status: Under Verification vs Submitted
      const resUnderVerif = await request(app)
        .get('/api/invoices?status=Under Verification')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resUnderVerif.status).toBe(200);
      expect(resUnderVerif.body.length).toBe(1);
      expect(resUnderVerif.body[0].invoiceNumber).toBe('INV-2026-001');

      const resSubmitted = await request(app)
        .get('/api/invoices?status=Submitted')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resSubmitted.status).toBe(200);
      expect(resSubmitted.body.length).toBe(1);
      expect(resSubmitted.body[0].invoiceNumber).toBe('INV-2026-002');

      // 3. Filter by vendor
      const resVendor = await request(app)
        .get(`/api/invoices?vendor=${testVendor._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resVendor.status).toBe(200);
      expect(resVendor.body.length).toBe(2);

      // 4. Filter by date range (from / to) using relative window
      const fromDate = daysFromNow(-10);
      const toDate = daysFromNow(0);
      const resDateFiltered = await request(app)
        .get(`/api/invoices?from=${fromDate}&to=${toDate}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resDateFiltered.status).toBe(200);
      expect(resDateFiltered.body.length).toBe(1);
      expect(resDateFiltered.body[0].invoiceNumber).toBe('INV-2026-002');
    });

    it('retrieves single invoice by ID or returns 404 if not found', async () => {
      const createRes = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({
          invoiceNumber: 'INV-2026-003',
          vendorId: testVendor._id.toString(),
          amount: 350.0,
          dueDate: daysFromNow(15),
        });

      const invId = createRes.body._id || createRes.body.id;

      const getRes = await request(app)
        .get(`/api/invoices/${invId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.invoiceNumber).toBe('INV-2026-003');

      const fakeId = new mongoose.Types.ObjectId().toString();
      const notFoundRes = await request(app)
        .get(`/api/invoices/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(notFoundRes.status).toBe(404);
      expect(notFoundRes.body.message).toContain('Invoice not found');
    });

    it('returns 404 and not 500 when id is malformed (invalid-id-123 or nonexistent-id-0000000000000000)', async () => {
      const resMalformed = await request(app)
        .get('/api/invoices/invalid-id-123')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resMalformed.status).toBe(404);
      expect(resMalformed.body.error).toBe('Invoice not found');

      const resNonExistent = await request(app)
        .get('/api/invoices/nonexistent-id-0000000000000000')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resNonExistent.status).toBe(404);
      expect(resNonExistent.body.error).toBe('Invoice not found');
    });
  });

  describe('Verification rule checks', () => {
    it('flags invoice when amount mismatches PO beyond ±$0.01 tolerance', async () => {
      const res = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({
          invoiceNumber: 'INV-MISMATCH',
          vendorId: testVendor._id.toString(),
          poId: testPO._id.toString(),
          amount: 5050.0, // $50 more than PO $5000
          dueDate: daysFromNow(30),
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('Flagged');
      expect(res.body.flagReason).toContain('Amount mismatch');
      expect(res.body.flagReason).toContain('exceeds ±$0.01 tolerance');
    });

    it('accepts invoice when amount matches PO within ±$0.01 tolerance', async () => {
      const res = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({
          invoiceNumber: 'INV-TOLERANCE',
          vendorId: testVendor._id.toString(),
          poId: testPO._id.toString(),
          amount: 5000.01, // exactly 1 cent difference
          dueDate: daysFromNow(30),
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('Under Verification');
      expect(res.body.flagReason).toBeUndefined();
    });

    it('flags invoice as duplicate if same invoiceNumber and same vendorId already exists in DB', async () => {
      // First invoice
      const res1 = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({
          invoiceNumber: 'INV-DUP-TEST',
          vendorId: testVendor._id.toString(),
          amount: 1000.0,
          dueDate: daysFromNow(30),
        });
      expect(res1.status).toBe(201);
      expect(res1.body.status).toBe('Submitted');

      // Second invoice with same number and SAME vendor
      const res2 = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({
          invoiceNumber: 'INV-DUP-TEST',
          vendorId: testVendor._id.toString(),
          amount: 1000.0,
          dueDate: daysFromNow(30),
        });

      expect(res2.status).toBe(201);
      expect(res2.body.status).toBe('Flagged');
      expect(res2.body.flagReason).toContain('Duplicate invoice number');
    });

    it('does NOT flag invoice as duplicate if same invoiceNumber exists for a different vendor', async () => {
      const otherVendor = await Vendor.create({
        name: 'ByteForce Technologies',
        contactEmail: 'billing@byteforce.tech',
        paymentTerms: 'Net 45',
        address: '88 Tech Ridge Blvd, Austin, TX',
        taxId: '74-9821034',
        status: 'Active',
      });

      // Invoice for vendor 1
      const res1 = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({
          invoiceNumber: 'INV-SHARED-NUM',
          vendorId: testVendor._id.toString(),
          amount: 1000.0,
          dueDate: daysFromNow(30),
        });
      expect(res1.status).toBe(201);
      expect(res1.body.status).toBe('Submitted');

      // Invoice with same number for DIFFERENT vendor
      const res2 = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({
          invoiceNumber: 'INV-SHARED-NUM',
          vendorId: otherVendor._id.toString(),
          amount: 1500.0,
          dueDate: daysFromNow(30),
        });

      expect(res2.status).toBe(201);
      expect(res2.body.status).toBe('Submitted');
      expect(res2.body.flagReason).toBeUndefined();
    });

    it('sets status to "Submitted" when no PO is provided', async () => {
      const res = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({
          invoiceNumber: 'INV-NO-PO',
          vendorId: testVendor._id.toString(),
          amount: 2500.0,
          dueDate: daysFromNow(30),
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('Submitted');
      expect(res.body.flagReason).toBeUndefined();
    });

    it('returns 400 when required fields are missing', async () => {
      // Missing vendorId
      const resNoVendor = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({
          amount: 1000,
          dueDate: daysFromNow(30),
        });
      expect(resNoVendor.status).toBe(400);
      expect(resNoVendor.body.errors).toContain('vendorId is required');

      // Missing amount
      const resNoAmount = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({
          vendorId: testVendor._id.toString(),
          dueDate: daysFromNow(30),
        });
      expect(resNoAmount.status).toBe(400);
      expect(resNoAmount.body.errors).toContain('amount is required and must be a number');

      // Missing dueDate
      const resNoDueDate = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({
          vendorId: testVendor._id.toString(),
          amount: 1000,
        });
      expect(resNoDueDate.status).toBe(400);
      expect(resNoDueDate.body.errors).toContain('dueDate is required');
    });

    it('unit test verificationService directly with fixtures', async () => {
      // 1. Required fields validation
      const invalidResult = validateInvoice({ amount: -5 });
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain('vendorId is required');
      expect(invalidResult.errors).toContain('amount cannot be negative');
      expect(invalidResult.errors).toContain('dueDate is required');

      // 2. Tolerance check via verifyInvoice
      const matchPo = { amount: 100.0 };
      const resMatch = await verifyInvoice(
        { vendorId: testVendor._id.toString(), amount: 100.01, dueDate: daysFromNow(30) },
        matchPo
      );
      expect(resMatch.status).toBe('Under Verification');

      const resFail = await verifyInvoice(
        { vendorId: testVendor._id.toString(), amount: 100.02, dueDate: daysFromNow(30) },
        matchPo
      );
      expect(resFail.status).toBe('Flagged');
    });
  });

  describe('Status transition updates status & writes AuditEntry', () => {
    let invoiceId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({
          invoiceNumber: 'INV-STATUS-TEST',
          vendorId: testVendor._id.toString(),
          amount: 3000,
          dueDate: daysFromNow(25),
        });
      invoiceId = res.body._id || res.body.id;
    });

    it('transitions to Approved by Approver and writes APPROVAL AuditEntry', async () => {
      const res = await request(app)
        .patch(`/api/invoices/${invoiceId}/status`)
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          status: 'Approved',
          comment: 'Approved for processing',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('Approved');

      // Verify AuditEntry
      const entries = await AuditEntry.find({ invoiceId, action: 'APPROVAL' });
      expect(entries.length).toBe(1);
      expect(entries[0].performedBy.toString()).toBe(approverUser._id.toString());
      expect(entries[0].details).toBe('Approved for processing');
    });

    it('transitions to Payment Scheduled with scheduledPaymentDate and writes PAYMENT_SCHEDULED AuditEntry', async () => {
      const scheduledDate = daysFromNow(10);
      const res = await request(app)
        .patch(`/api/invoices/${invoiceId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'Payment Scheduled',
          scheduledPaymentDate: scheduledDate,
          comment: 'Scheduled for Friday batch',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('Payment Scheduled');
      expect(res.body.scheduledPaymentDate).toBe(scheduledDate);

      const entries = await AuditEntry.find({ invoiceId, action: 'PAYMENT_SCHEDULED' });
      expect(entries.length).toBe(1);
      expect(entries[0].performedBy.toString()).toBe(adminUser._id.toString());
    });

    it('transitions to Paid with paidDate and writes PAYMENT_COMPLETED AuditEntry', async () => {
      const paidDateStr = daysFromNow(0);
      const res = await request(app)
        .patch(`/api/invoices/${invoiceId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'Paid',
          paidDate: paidDateStr,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('Paid');
      expect(res.body.paidDate).toBe(paidDateStr);

      const entries = await AuditEntry.find({ invoiceId, action: 'PAYMENT_COMPLETED' });
      expect(entries.length).toBe(1);
    });

    it('transitions to Flagged and writes FLAGGED AuditEntry with flagReason', async () => {
      const res = await request(app)
        .patch(`/api/invoices/${invoiceId}/status`)
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          status: 'Flagged',
          flagReason: 'Missing manager signoff',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('Flagged');
      expect(res.body.flagReason).toBe('Missing manager signoff');

      const entries = await AuditEntry.find({ invoiceId, action: 'FLAGGED' });
      expect(entries.length).toBe(1);
      expect(entries[0].details).toBe('Missing manager signoff');
    });
  });

  describe('Role restriction on status transition', () => {
    it('rejects Requester with 403 on status transition', async () => {
      const createRes = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({
          invoiceNumber: 'INV-ROLE-TEST',
          vendorId: testVendor._id.toString(),
          amount: 1500,
          dueDate: daysFromNow(31),
        });

      const invId = createRes.body._id || createRes.body.id;

      const res = await request(app)
        .patch(`/api/invoices/${invId}/status`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({
          status: 'Approved',
        });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: 'Forbidden: Insufficient permissions',
      });
    });
  });

  describe('Unauthenticated requests rejected with 401', () => {
    it('rejects GET /api/invoices without auth token with 401', async () => {
      const res = await request(app).get('/api/invoices');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('rejects GET /api/invoices/:id without auth token with 401', async () => {
      const res = await request(app).get('/api/invoices/some-id');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('rejects POST /api/invoices without auth token with 401', async () => {
      const res = await request(app)
        .post('/api/invoices')
        .send({
          vendorId: testVendor._id.toString(),
          amount: 500,
          dueDate: daysFromNow(31),
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('rejects PATCH /api/invoices/:id/status without auth token with 401', async () => {
      const res = await request(app)
        .patch(`/api/invoices/some-id/status`)
        .send({ status: 'Approved' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('rejects POST /api/invoices/:id/attachment without auth token with 401', async () => {
      const res = await request(app)
        .post('/api/invoices/some-id/attachment')
        .attach('file', Buffer.from('test'), 'test.pdf');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('rejects GET /api/invoices/:id/attachment without auth token with 401', async () => {
      const res = await request(app).get('/api/invoices/some-id/attachment');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('rejects requests with invalid or expired token with 401', async () => {
      const res = await request(app)
        .post('/api/invoices')
        .set('Authorization', 'Bearer invalid.token.value')
        .send({
          vendorId: testVendor._id.toString(),
          amount: 500,
          dueDate: daysFromNow(31),
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Requester authorization scoping & permissions', () => {
    let aliceInvoice, bobInvoice, bobUser, bobToken;

    beforeEach(async () => {
      bobUser = await User.create({
        name: 'Requester Bob',
        email: 'bob@payverify.local',
        passwordHash: 'dummyhash',
        role: 'Requester',
      });

      bobToken = jwt.sign(
        { id: bobUser._id.toString(), role: 'Requester', email: bobUser.email },
        JWT_SECRET
      );

      // Alice (requesterUser) invoice
      aliceInvoice = await Invoice.create({
        invoiceNumber: 'INV-ALICE-001',
        vendorId: testVendor._id,
        amount: 1500,
        dueDate: daysFromNow(30),
        status: 'Submitted',
        submittedBy: requesterUser._id,
      });

      // Bob invoice
      bobInvoice = await Invoice.create({
        invoiceNumber: 'INV-BOB-001',
        vendorId: testVendor._id,
        amount: 2500,
        dueDate: daysFromNow(30),
        status: 'Submitted',
        submittedBy: bobUser._id,
      });
    });

    it('Requester sees only their own invoices in GET /api/invoices while Admin and Approver see all', async () => {
      // Alice sees only Alice's invoice
      const aliceRes = await request(app)
        .get('/api/invoices')
        .set('Authorization', `Bearer ${requesterToken}`);
      expect(aliceRes.status).toBe(200);
      expect(aliceRes.body.length).toBe(1);
      expect(aliceRes.body[0].invoiceNumber).toBe('INV-ALICE-001');

      // Bob sees only Bob's invoice
      const bobRes = await request(app)
        .get('/api/invoices')
        .set('Authorization', `Bearer ${bobToken}`);
      expect(bobRes.status).toBe(200);
      expect(bobRes.body.length).toBe(1);
      expect(bobRes.body[0].invoiceNumber).toBe('INV-BOB-001');

      // Admin sees both
      const adminRes = await request(app)
        .get('/api/invoices')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.length).toBe(2);

      // Approver sees both
      const approverRes = await request(app)
        .get('/api/invoices')
        .set('Authorization', `Bearer ${approverToken}`);
      expect(approverRes.status).toBe(200);
      expect(approverRes.body.length).toBe(2);
    });

    it("Requester gets 404 on GET /api/invoices/:id for another user's invoice while Admin and Approver see it", async () => {
      // Alice requesting Bob's invoice gets 404
      const aliceOnBobRes = await request(app)
        .get(`/api/invoices/${bobInvoice._id}`)
        .set('Authorization', `Bearer ${requesterToken}`);
      expect(aliceOnBobRes.status).toBe(404);
      expect(aliceOnBobRes.body).toEqual({ error: 'Invoice not found' });

      // Alice requesting Alice's invoice gets 200
      const aliceOnAliceRes = await request(app)
        .get(`/api/invoices/${aliceInvoice._id}`)
        .set('Authorization', `Bearer ${requesterToken}`);
      expect(aliceOnAliceRes.status).toBe(200);
      expect(aliceOnAliceRes.body.invoiceNumber).toBe('INV-ALICE-001');

      // Admin requesting Bob's invoice gets 200
      const adminOnBobRes = await request(app)
        .get(`/api/invoices/${bobInvoice._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminOnBobRes.status).toBe(200);
      expect(adminOnBobRes.body.invoiceNumber).toBe('INV-BOB-001');

      // Approver requesting Bob's invoice gets 200
      const approverOnBobRes = await request(app)
        .get(`/api/invoices/${bobInvoice._id}`)
        .set('Authorization', `Bearer ${approverToken}`);
      expect(approverOnBobRes.status).toBe(200);
      expect(approverOnBobRes.body.invoiceNumber).toBe('INV-BOB-001');
    });

    it("Requester gets 403 on POST /api/invoices/:id/attachment for another user's invoice while owner, Admin, and Approver can upload", async () => {
      const fileBuffer = Buffer.from('Dummy attachment content');

      // Alice tries to upload to Bob's invoice -> 403 Forbidden
      const aliceOnBobRes = await request(app)
        .post(`/api/invoices/${bobInvoice._id}/attachment`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .attach('file', fileBuffer, 'alice-attempt.pdf');
      expect(aliceOnBobRes.status).toBe(403);
      expect(aliceOnBobRes.body).toEqual({
        error: 'Forbidden: Insufficient permissions to modify this invoice attachment',
      });

      // Bob (owner) uploads to Bob's invoice -> 200 OK
      const bobOnBobRes = await request(app)
        .post(`/api/invoices/${bobInvoice._id}/attachment`)
        .set('Authorization', `Bearer ${bobToken}`)
        .attach('file', fileBuffer, 'bob-receipt.pdf');
      expect(bobOnBobRes.status).toBe(200);

      // Approver uploads to Alice's invoice -> 200 OK
      const approverOnAliceRes = await request(app)
        .post(`/api/invoices/${aliceInvoice._id}/attachment`)
        .set('Authorization', `Bearer ${approverToken}`)
        .attach('file', fileBuffer, 'approver-doc.png');
      expect(approverOnAliceRes.status).toBe(200);

      // Admin uploads to Alice's invoice -> 200 OK
      const adminOnAliceRes = await request(app)
        .post(`/api/invoices/${aliceInvoice._id}/attachment`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', fileBuffer, 'admin-doc.jpeg');
      expect(adminOnAliceRes.status).toBe(200);
    });
  });

  describe('File upload attachment (POST /api/invoices/:id/attachment)', () => {
    it('uploads a file and updates attachedDocumentPath on invoice with generated filename', async () => {
      const createRes = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({
          invoiceNumber: 'INV-ATTACH-TEST',
          vendorId: testVendor._id.toString(),
          amount: 4200,
          dueDate: daysFromNow(45),
        });

      const invId = createRes.body._id || createRes.body.id;
      const fileBuffer = Buffer.from('PDF Mock File Content for Invoice Receipt');

      const uploadRes = await request(app)
        .post(`/api/invoices/${invId}/attachment`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .attach('file', fileBuffer, 'sample-receipt.pdf');

      expect(uploadRes.status).toBe(200);
      expect(uploadRes.body.attachedDocumentPath).toMatch(/^\/uploads\/\d+-[a-f0-9]{32}\.pdf$/);
      expect(uploadRes.body.attachedDocumentName).toBe('sample-receipt.pdf');

      // Verify file exists on disk
      const uploadedFilename = path.basename(uploadRes.body.attachedDocumentPath);
      // Ensure client original name was NOT used directly in the disk filename
      expect(uploadedFilename).not.toContain('sample-receipt');
      const diskPath = path.join(__dirname, '../uploads', uploadedFilename);
      expect(fs.existsSync(diskPath)).toBe(true);

      // Clean up file from uploads directory
      try {
        fs.unlinkSync(diskPath);
      } catch (err) {
        // ignore
      }
    });

    it('rejects file upload with invalid mime type with 400', async () => {
      const createRes = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({
          invoiceNumber: 'INV-BAD-MIME',
          vendorId: testVendor._id.toString(),
          amount: 800,
          dueDate: daysFromNow(45),
        });

      const invId = createRes.body._id || createRes.body.id;
      const fileBuffer = Buffer.from('alert("malicious script");');

      const uploadRes = await request(app)
        .post(`/api/invoices/${invId}/attachment`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .attach('file', fileBuffer, {
          filename: 'script.js',
          contentType: 'application/javascript',
        });

      expect(uploadRes.status).toBe(400);
      expect(uploadRes.body.error).toContain('Invalid file type');
    });

    it('returns 400 if no file is provided in attachment request', async () => {
      const createRes = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({
          invoiceNumber: 'INV-NO-FILE',
          vendorId: testVendor._id.toString(),
          amount: 700,
          dueDate: daysFromNow(45),
        });

      const invId = createRes.body._id || createRes.body.id;

      const res = await request(app)
        .post(`/api/invoices/${invId}/attachment`)
        .set('Authorization', `Bearer ${requesterToken}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('No file uploaded');
    });
  });

  describe('GET /api/invoices/:id/attachment (Authenticated file download)', () => {
    let invoiceWithAttachment;
    let createdFilePath;
    const dummyPdfContent = 'PDF Mock Download Content 2026';

    beforeEach(async () => {
      const uploadDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const testFilename = `test-download-${Date.now()}.pdf`;
      createdFilePath = path.join(uploadDir, testFilename);
      fs.writeFileSync(createdFilePath, dummyPdfContent);

      invoiceWithAttachment = await Invoice.create({
        invoiceNumber: 'INV-ATTACH-DOWNLOAD',
        vendorId: testVendor._id,
        amount: 3200,
        dueDate: daysFromNow(30),
        status: 'Submitted',
        submittedBy: requesterUser._id,
        attachedDocumentPath: `/uploads/${testFilename}`,
        attachedDocumentName: 'receipt-original.pdf',
      });
    });

    afterEach(() => {
      if (createdFilePath && fs.existsSync(createdFilePath)) {
        try {
          fs.unlinkSync(createdFilePath);
        } catch (_) {}
      }
    });

    it('rejects unauthenticated request with 401', async () => {
      const res = await request(app).get(
        `/api/invoices/${invoiceWithAttachment._id}/attachment`
      );
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 404 when Requester requests another user\'s invoice attachment', async () => {
      const bob = await User.create({
        name: 'Bob Requester',
        email: 'bob.req@payverify.local',
        passwordHash: 'dummyhash',
        role: 'Requester',
      });
      const bobToken = jwt.sign(
        { id: bob._id.toString(), role: 'Requester', email: bob.email },
        JWT_SECRET
      );

      const res = await request(app)
        .get(`/api/invoices/${invoiceWithAttachment._id}/attachment`)
        .set('Authorization', `Bearer ${bobToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Invoice not found' });
    });

    it('returns 404 when invoice has no attachedDocumentPath', async () => {
      const invoiceNoAttach = await Invoice.create({
        invoiceNumber: 'INV-NO-ATTACH-RECORD',
        vendorId: testVendor._id,
        amount: 1200,
        dueDate: daysFromNow(30),
        status: 'Submitted',
        submittedBy: requesterUser._id,
      });

      const res = await request(app)
        .get(`/api/invoices/${invoiceNoAttach._id}/attachment`)
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Attachment not found' });
    });

    it('returns 404 when attachment file does not exist on disk', async () => {
      const invoiceMissingFile = await Invoice.create({
        invoiceNumber: 'INV-MISSING-DISK-FILE',
        vendorId: testVendor._id,
        amount: 1400,
        dueDate: daysFromNow(30),
        status: 'Submitted',
        submittedBy: requesterUser._id,
        attachedDocumentPath: '/uploads/nonexistent-disk-file-999.pdf',
        attachedDocumentName: 'ghost.pdf',
      });

      const res = await request(app)
        .get(`/api/invoices/${invoiceMissingFile._id}/attachment`)
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Attachment not found' });
    });

    it('returns 404 and not 500 when id is malformed (invalid-id-123 or nonexistent-id-0000000000000000)', async () => {
      const res = await request(app)
        .get('/api/invoices/invalid-id-123/attachment')
        .set('Authorization', `Bearer ${requesterToken}`);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Invoice not found');
    });

    it('returns 200 with correct headers (Content-Disposition: attachment and Content-Type) for owner', async () => {
      const res = await request(app)
        .get(`/api/invoices/${invoiceWithAttachment._id}/attachment`)
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toBe(
        'attachment; filename="receipt-original.pdf"'
      );
      expect(res.headers['content-type']).toContain('application/pdf');
      const received = Buffer.isBuffer(res.body) ? res.body.toString() : res.text;
      expect(received).toBe(dummyPdfContent);
    });

    it('returns 200 with correct headers for Approver', async () => {
      const res = await request(app)
        .get(`/api/invoices/${invoiceWithAttachment._id}/attachment`)
        .set('Authorization', `Bearer ${approverToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toBe(
        'attachment; filename="receipt-original.pdf"'
      );
      expect(res.headers['content-type']).toContain('application/pdf');
      const received = Buffer.isBuffer(res.body) ? res.body.toString() : res.text;
      expect(received).toBe(dummyPdfContent);
    });

    it('returns 200 with correct headers for Admin', async () => {
      const res = await request(app)
        .get(`/api/invoices/${invoiceWithAttachment._id}/attachment`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toBe(
        'attachment; filename="receipt-original.pdf"'
      );
      expect(res.headers['content-type']).toContain('application/pdf');
      const received = Buffer.isBuffer(res.body) ? res.body.toString() : res.text;
      expect(received).toBe(dummyPdfContent);
    });
  });
});

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { connectDB, disconnectDB } = require('../src/config/db');
const { JWT_SECRET } = require('../src/config/env');
const AuditEntry = require('../src/models/AuditEntry');
const Invoice = require('../src/models/Invoice');
const User = require('../src/models/User');
const auditLogRouter = require('../src/routes/auditLog.routes');
const {
  recordAuditEntry,
} = require('../src/controllers/auditLogController');

const daysFromNow = (days) => {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().split('T')[0];
};

const dateFromNow = (days, hours = 0, minutes = 0) => {
  const d = new Date(Date.now() + days * 86400000 + hours * 3600000 + minutes * 60000);
  return d;
};

describe('Audit Log Integration Tests', () => {
  let mongod;
  let app;

  let adminUser;
  let approverUser;
  let requesterUser;

  let adminToken;
  let approverToken;
  let requesterToken;

  let inv1;
  let inv2;
  let inv3;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await connectDB(uri);

    app = express();
    app.use(express.json());
    app.use('/api/audit-log', auditLogRouter);
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
    await User.deleteMany({});

    // Create users
    adminUser = await User.create({
      name: 'Sarah Chen',
      email: 'sarah.chen@payverify.local',
      passwordHash: 'dummyhash',
      role: 'Admin',
    });

    approverUser = await User.create({
      name: 'Marcus Vance',
      email: 'marcus.vance@payverify.local',
      passwordHash: 'dummyhash',
      role: 'Approver',
    });

    requesterUser = await User.create({
      name: 'Elena Rodriguez',
      email: 'elena.rodriguez@payverify.local',
      passwordHash: 'dummyhash',
      role: 'Requester',
    });

    adminToken = jwt.sign(
      {
        id: adminUser.id || adminUser._id.toString(),
        role: adminUser.role,
        email: adminUser.email,
        name: adminUser.name,
      },
      JWT_SECRET
    );

    approverToken = jwt.sign(
      {
        id: approverUser.id || approverUser._id.toString(),
        role: approverUser.role,
        email: approverUser.email,
        name: approverUser.name,
      },
      JWT_SECRET
    );

    requesterToken = jwt.sign(
      {
        id: requesterUser.id || requesterUser._id.toString(),
        role: requesterUser.role,
        email: requesterUser.email,
        name: requesterUser.name,
      },
      JWT_SECRET
    );

    const vendorId = new mongoose.Types.ObjectId();

    // Create sample invoices using dynamic relative offsets
    inv1 = await Invoice.create({
      invoiceNumber: 'INV-2026-101',
      vendorId,
      amount: 1500,
      dueDate: daysFromNow(12),
      submittedDate: daysFromNow(-30),
      status: 'Approved',
      submittedBy: requesterUser._id,
    });

    inv2 = await Invoice.create({
      invoiceNumber: 'INV-2026-102',
      vendorId,
      amount: 2500,
      dueDate: daysFromNow(17),
      submittedDate: daysFromNow(-25),
      status: 'Flagged',
      submittedBy: requesterUser._id,
    });

    inv3 = await Invoice.create({
      invoiceNumber: 'INV-2026-103',
      vendorId,
      amount: 3500,
      dueDate: daysFromNow(27),
      submittedDate: daysFromNow(-20),
      status: 'Payment Scheduled',
      submittedBy: requesterUser._id,
    });

    // Create audit log entries with relative dates
    await AuditEntry.create([
      {
        invoiceId: inv1._id,
        action: 'SUBMISSION',
        performedBy: requesterUser._id,
        timestamp: dateFromNow(-29, 9, 30),
        details: 'Invoice INV-2026-101 submitted for Apex Cloud',
      },
      {
        invoiceId: inv1._id,
        action: 'VERIFICATION',
        performedBy: adminUser._id,
        timestamp: dateFromNow(-29, 9, 31),
        details: '3-way match verified against PO-001',
      },
      {
        invoiceId: inv1._id,
        action: 'APPROVAL',
        performedBy: approverUser._id,
        timestamp: dateFromNow(-28, 14, 0),
        details: 'Approved following price verification',
      },
      {
        invoiceId: inv2._id,
        action: 'SUBMISSION',
        performedBy: requesterUser._id,
        timestamp: dateFromNow(-25, 10, 15),
        details: 'Invoice INV-2026-102 submitted',
      },
      {
        invoiceId: inv2._id,
        action: 'FLAGGED',
        performedBy: approverUser._id,
        timestamp: dateFromNow(-24, 11, 0),
        details: 'Quantity overbill: invoiced quantity exceeds PO limit',
      },
      {
        invoiceId: inv3._id,
        action: 'PAYMENT_SCHEDULED',
        performedBy: adminUser._id,
        timestamp: dateFromNow(-20, 8, 45),
        details: `Scheduled payment date set to ${daysFromNow(22)}`,
      },
    ]);
  });

  describe('Authentication and RBAC Enforcement', () => {
    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/audit-log');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('rejects non-admin/approver (Requester) with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/audit-log')
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: 'Forbidden: Insufficient permissions',
      });
    });

    it('allows access for Admin user role (200 OK)', async () => {
      const res = await request(app)
        .get('/api/audit-log')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(6);
    });

    it('rejects Approver user role with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/audit-log')
        .set('Authorization', `Bearer ${approverToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: 'Forbidden: Insufficient permissions',
      });
    });
  });

  describe('Invoice-scoped Audit Log Access Control', () => {
    let otherInvoice;

    beforeEach(async () => {
      otherInvoice = await Invoice.create({
        invoiceNumber: 'INV-2026-999',
        vendorId: new mongoose.Types.ObjectId(),
        amount: 5000,
        dueDate: daysFromNow(15),
        submittedDate: daysFromNow(-10),
        status: 'Submitted',
        submittedBy: adminUser._id,
      });

      await AuditEntry.create({
        invoiceId: otherInvoice._id,
        action: 'SUBMISSION',
        performedBy: adminUser._id,
        timestamp: dateFromNow(-10),
        details: 'Invoice INV-2026-999 submitted by Admin',
      });
    });

    it('rejects unauthenticated request with invoiceId with 401 Unauthorized', async () => {
      const res = await request(app).get(`/api/audit-log?invoiceId=${inv1._id.toString()}`);
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('allows Requester to view audit trail for their own invoice (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/audit-log?invoiceId=${inv1._id.toString()}`)
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(3);
      res.body.forEach((entry) => {
        expect(entry.invoiceId).toBe(inv1._id.toString());
      });
    });

    it('returns 404 Not Found when Requester queries audit log for another user invoice', async () => {
      const res = await request(app)
        .get(`/api/audit-log?invoiceId=${otherInvoice._id.toString()}`)
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Invoice not found' });
    });

    it('returns 404 Not Found when Requester queries audit log for a nonexistent invoice', async () => {
      const nonexistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/audit-log?invoiceId=${nonexistentId}`)
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Invoice not found' });
    });

    it('allows Approver to view audit trail for any invoice (200 OK)', async () => {
      const res1 = await request(app)
        .get(`/api/audit-log?invoiceId=${inv1._id.toString()}`)
        .set('Authorization', `Bearer ${approverToken}`);

      expect(res1.status).toBe(200);
      expect(res1.body).toHaveLength(3);

      const res2 = await request(app)
        .get(`/api/audit-log?invoiceId=${otherInvoice._id.toString()}`)
        .set('Authorization', `Bearer ${approverToken}`);

      expect(res2.status).toBe(200);
      expect(res2.body).toHaveLength(1);
      expect(res2.body[0].invoiceId).toBe(otherInvoice._id.toString());
    });

    it('returns 404 Not Found when Approver queries audit log for a nonexistent invoice', async () => {
      const nonexistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/audit-log?invoiceId=${nonexistentId}`)
        .set('Authorization', `Bearer ${approverToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Invoice not found' });
    });

    it('returns 404 Not Found when Admin queries audit log for a nonexistent invoice', async () => {
      const nonexistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/audit-log?invoiceId=${nonexistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Invoice not found' });
    });

    it('rejects Requester and Approver with 403 on the list without invoiceId', async () => {
      const resReq = await request(app)
        .get('/api/audit-log')
        .set('Authorization', `Bearer ${requesterToken}`);
      expect(resReq.status).toBe(403);
      expect(resReq.body).toEqual({
        error: 'Forbidden: Insufficient permissions',
      });

      const resApp = await request(app)
        .get('/api/audit-log')
        .set('Authorization', `Bearer ${approverToken}`);
      expect(resApp.status).toBe(403);
      expect(resApp.body).toEqual({
        error: 'Forbidden: Insufficient permissions',
      });
    });
  });

  describe('Query Filtering Capabilities', () => {
    it('retrieves all entries when no filters are provided', async () => {
      const res = await request(app)
        .get('/api/audit-log')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(6);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('invoiceId');
      expect(res.body[0]).toHaveProperty('action');
      expect(res.body[0]).toHaveProperty('performedBy');
      expect(res.body[0]).toHaveProperty('timestamp');
    });

    it('filters audit trail by invoiceId (ObjectId)', async () => {
      const res = await request(app)
        .get(`/api/audit-log?invoiceId=${inv1._id.toString()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
      res.body.forEach((entry) => {
        expect(entry.invoiceId).toBe(inv1._id.toString());
      });
    });

    it('filters audit trail by invoiceNumber (lookup)', async () => {
      const res = await request(app)
        .get('/api/audit-log?invoiceId=INV-2026-101')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
      res.body.forEach((entry) => {
        expect(entry.invoiceId).toBe(inv1._id.toString());
      });
    });

    it('filters audit trail by action (e.g. SUBMISSION)', async () => {
      const res = await request(app)
        .get('/api/audit-log?action=SUBMISSION')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      res.body.forEach((entry) => {
        expect(entry.action).toBe('SUBMISSION');
      });
    });

    it('filters audit trail by user / performedBy name (case-insensitive)', async () => {
      const res = await request(app)
        .get('/api/audit-log?user=Elena Rodriguez')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      res.body.forEach((entry) => {
        expect(entry.performedBy).toBe('Elena Rodriguez');
      });
    });

    it('filters audit trail by performedBy query alias', async () => {
      const res = await request(app)
        .get('/api/audit-log?performedBy=Marcus Vance')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      res.body.forEach((entry) => {
        expect(entry.performedBy).toBe('Marcus Vance');
      });
    });

    it('combines filters: invoiceId and action', async () => {
      const res = await request(app)
        .get(
          `/api/audit-log?invoiceId=${inv1._id.toString()}&action=APPROVAL`
        )
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].action).toBe('APPROVAL');
      expect(res.body[0].performedBy).toBe('Marcus Vance');
      expect(res.body[0].invoiceId).toBe(inv1._id.toString());
    });
  });

  describe('Programmatic Audit Logging', () => {
    it('creates and records audit entry via recordAuditEntry', async () => {
      const created = await recordAuditEntry(
        inv3._id,
        'PAYMENT_COMPLETED',
        adminUser._id,
        'Settlement confirmed via ACH'
      );

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.invoiceId).toBe(inv3._id.toString());
      expect(created.action).toBe('PAYMENT_COMPLETED');
      expect(created.performedBy).toBe(adminUser._id.toString());
      expect(created.details).toBe('Settlement confirmed via ACH');

      // Verify retrievable via GET endpoint
      const res = await request(app)
        .get(`/api/audit-log?invoiceId=${inv3._id.toString()}&action=PAYMENT_COMPLETED`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].action).toBe('PAYMENT_COMPLETED');
      expect(res.body[0].performedBy).toBe('Sarah Chen');
      expect(res.body[0].details).toBe('Settlement confirmed via ACH');
    });
  });
});

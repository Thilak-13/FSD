const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const { JWT_SECRET } = require('../src/config/env');
const User = require('../src/models/User');
const Vendor = require('../src/models/Vendor');
const PurchaseOrder = require('../src/models/PurchaseOrder');
const Invoice = require('../src/models/Invoice');
const AuditEntry = require('../src/models/AuditEntry');

const daysFromNow = (days) => {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().split('T')[0];
};

/**
 * Asserts that the serialized payload contains no internal MongoDB keys or sensitive fields
 */
function assertNoInternalLeak(body) {
  expect(JSON.stringify(body)).not.toMatch(/"passwordHash"|"_id"|"__v"/);
}

/**
 * Shape parity validator mirrored directly from src/types/index.ts
 */
function assertShapeParity(obj, requiredKeys, optionalKeys, entityName) {
  expect(obj).toBeDefined();
  expect(typeof obj).toBe('object');
  expect(obj).not.toBeNull();

  // 1. Strict ban on sensitive fields and internal MongoDB keys
  expect(obj).not.toHaveProperty('passwordHash');
  expect(obj).not.toHaveProperty('_id');
  expect(obj).not.toHaveProperty('__v');
  assertNoInternalLeak(obj);

  const actualKeys = Object.keys(obj);
  const allowedKeys = new Set([...requiredKeys, ...optionalKeys]);

  // 2. Check missing required keys
  const missingKeys = requiredKeys.filter((k) => !actualKeys.includes(k));
  if (missingKeys.length > 0) {
    throw new Error(
      `[Shape Parity Error] ${entityName} is missing required key(s): ${missingKeys.join(
        ', '
      )}.\nActual keys: ${actualKeys.join(', ')}`
    );
  }

  // 3. Detect and print extra keys
  const extraKeys = actualKeys.filter((k) => !allowedKeys.has(k));
  if (extraKeys.length > 0) {
    console.warn(
      `[Shape Notice] ${entityName} has extra key(s) beyond type definition: [${extraKeys.join(
        ', '
      )}]`
    );
  }
}

describe('Mechanical Shape-Parity Contract Tests (src/types/index.ts vs Backend API)', () => {
  let mongod;
  let adminUser, adminToken;
  let requesterUser, requesterToken;
  let sampleVendor, samplePO, sampleInvoice;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await connectDB(uri);

    const hash = await bcrypt.hash('AdminPass123!', 10);
    adminUser = await User.create({
      name: 'Elena Rodriguez',
      email: 'admin@payverify.local',
      passwordHash: hash,
      role: 'Admin',
      department: 'Finance',
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

    const requesterHash = await bcrypt.hash('RequesterPass123!', 10);
    requesterUser = await User.create({
      name: 'Marcus Vance',
      email: 'requester@payverify.local',
      passwordHash: requesterHash,
      role: 'Requester',
      department: 'Marketing',
    });

    requesterToken = jwt.sign(
      {
        id: requesterUser.id || requesterUser._id.toString(),
        role: requesterUser.role,
        email: requesterUser.email,
        name: requesterUser.name,
      },
      JWT_SECRET
    );

    sampleVendor = await Vendor.create({
      name: 'Apex Cloud Services',
      contactEmail: 'billing@apexcloud.io',
      paymentTerms: 'Net 30',
      address: '500 Howard St, Suite 400, San Francisco, CA 94105',
      taxId: '94-3289104',
      status: 'Active',
      totalInvoices: 0,
    });

    samplePO = await PurchaseOrder.create({
      poNumber: 'PO-2026-001',
      vendorId: sampleVendor._id,
      amount: 6500,
      description: 'Q3 Enterprise Cloud Compute Services',
      createdDate: daysFromNow(-30),
      items: [
        {
          id: 'poi-1',
          description: 'Compute Instances Tier 3',
          quantity: 1,
          unitPrice: 6500,
          total: 6500,
        },
      ],
    });

    sampleInvoice = await Invoice.create({
      invoiceNumber: 'INV-2026-001',
      vendorId: sampleVendor._id,
      poId: samplePO._id,
      amount: 6500,
      dueDate: daysFromNow(10),
      submittedDate: daysFromNow(-5),
      status: 'Approved',
      submittedBy: adminUser._id,
      items: [
        {
          id: 'li-1',
          description: 'Compute Instances Tier 3',
          quantity: 1,
          unitPrice: 6500,
          total: 6500,
        },
      ],
    });

    await AuditEntry.create({
      invoiceId: sampleInvoice._id,
      action: 'APPROVAL',
      performedBy: adminUser._id,
      details: 'Approved following match',
    });

    await Invoice.create({
      invoiceNumber: 'INV-2026-FLAGGED',
      vendorId: sampleVendor._id,
      poId: samplePO._id,
      amount: 1200,
      dueDate: daysFromNow(2),
      submittedDate: daysFromNow(-1),
      status: 'Flagged',
      flagReason: 'Item price exceeds purchase order limit',
      submittedBy: adminUser._id,
      items: [
        {
          id: 'li-flag-1',
          description: 'Custom Consulting',
          quantity: 1,
          unitPrice: 1200,
          total: 1200,
        },
      ],
    });
  });

  afterAll(async () => {
    await disconnectDB();
    if (mongod) {
      await mongod.stop();
    }
  });

  it('User model serializes via toJSON() and JSON.stringify() with id and no passwordHash, _id, or __v', async () => {
    const user = await User.create({
      name: 'Serialization Unit User',
      email: 'serialization@payverify.local',
      passwordHash: 'secret_hashed_password',
      role: 'Requester',
    });

    // 1. Serialization via toJSON()
    const json = user.toJSON();
    expect(json.id).toBeDefined();
    expect(typeof json.id).toBe('string');
    expect(json).not.toHaveProperty('passwordHash');
    expect(json).not.toHaveProperty('_id');
    expect(json).not.toHaveProperty('__v');

    // 2. Serialization via JSON.stringify()
    const rawString = JSON.stringify(user);
    expect(rawString).not.toMatch(/"passwordHash"|"_id"|"__v"/);
    const parsed = JSON.parse(rawString);
    expect(parsed.id).toBe(user.id || user._id.toString());
    expect(parsed).not.toHaveProperty('passwordHash');
    expect(parsed).not.toHaveProperty('_id');
    expect(parsed).not.toHaveProperty('__v');
  });

  it('verifies User shape in POST /api/auth/login matches User interface', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@payverify.local', password: 'AdminPass123!' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    assertNoInternalLeak(res.body);

    // User interface: id, name, email, role (optional: avatarUrl, department)
    assertShapeParity(
      res.body.user,
      ['id', 'name', 'email', 'role'],
      ['avatarUrl', 'department', 'createdAt', 'updatedAt'],
      'User'
    );
  });

  it('verifies Vendor shape in GET /api/vendors matches Vendor interface', async () => {
    const res = await request(app)
      .get('/api/vendors')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    assertNoInternalLeak(res.body);

    // Vendor interface: id, name, contactEmail, paymentTerms, address, taxId, status, totalInvoices
    assertShapeParity(
      res.body[0],
      ['id', 'name', 'contactEmail', 'paymentTerms', 'address', 'taxId', 'status', 'totalInvoices'],
      ['phone', 'invoices', 'createdAt', 'updatedAt'],
      'Vendor'
    );
  });

  it('verifies PurchaseOrder shape in GET /api/purchase-orders matches PurchaseOrder interface', async () => {
    const res = await request(app)
      .get('/api/purchase-orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    assertNoInternalLeak(res.body);

    // PurchaseOrder: id, poNumber, vendorId, amount, description, items, createdDate, status
    assertShapeParity(
      res.body[0],
      ['id', 'poNumber', 'vendorId', 'amount', 'description', 'items', 'createdDate', 'status'],
      ['createdAt', 'updatedAt'],
      'PurchaseOrder'
    );
  });

  it('verifies Invoice shape in GET /api/invoices and POST /api/invoices matches Invoice interface', async () => {
    const res = await request(app)
      .get('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    assertNoInternalLeak(res.body);

    // Invoice: id, invoiceNumber, vendorId, amount, dueDate, submittedDate, status, submittedBy, items
    assertShapeParity(
      res.body[0],
      ['id', 'invoiceNumber', 'vendorId', 'amount', 'dueDate', 'submittedDate', 'status', 'submittedBy', 'items'],
      [
        'poId',
        'attachedDocumentName',
        'attachedDocumentPath',
        'flagReason',
        'scheduledPaymentDate',
        'paidDate',
        'notes',
        'createdAt',
        'updatedAt',
      ],
      'Invoice'
    );

    // Test POST /api/invoices creation response shape
    const postRes = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        invoiceNumber: 'INV-CONTRACT-TEST',
        vendorId: sampleVendor.id,
        amount: 300,
        dueDate: daysFromNow(20),
      });

    expect(postRes.status).toBe(201);
    assertNoInternalLeak(postRes.body);
    assertShapeParity(
      postRes.body,
      ['id', 'invoiceNumber', 'vendorId', 'amount', 'dueDate', 'submittedDate', 'status', 'submittedBy', 'items'],
      [
        'poId',
        'attachedDocumentName',
        'attachedDocumentPath',
        'flagReason',
        'scheduledPaymentDate',
        'paidDate',
        'notes',
        'createdAt',
        'updatedAt',
      ],
      'Invoice (POST)'
    );
  });

  it('verifies Reports Summary shape in GET /api/reports/summary matches KPI card contracts', async () => {
    const res = await request(app).get('/api/reports/summary');
    expect(res.status).toBe(200);
    assertNoInternalLeak(res.body);

    assertShapeParity(
      res.body,
      [
        'totalBilled',
        'totalPaid',
        'pendingBalance',
        'spendPending',
        'requiresApprovalCount',
        'flaggedCount',
        'scheduledDisbursements',
      ],
      [],
      'ReportsSummary'
    );
  });

  it('verifies Vendor Breakdown shape in GET /api/reports/vendor-breakdown matches contract', async () => {
    const res = await request(app).get('/api/reports/vendor-breakdown');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    assertNoInternalLeak(res.body);

    assertShapeParity(
      res.body[0],
      [
        'vendorId',
        'vendorName',
        'taxId',
        'status',
        'paymentTerms',
        'invoiceCount',
        'totalBilled',
        'totalPaid',
        'pendingBalance',
        'avgProcessingDays',
      ],
      [],
      'VendorBreakdown'
    );
  });

  it('verifies AuditEntry shape in GET /api/audit-log matches AuditEntry interface', async () => {
    const res = await request(app)
      .get('/api/audit-log')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    assertNoInternalLeak(res.body);

    assertShapeParity(
      res.body[0],
      ['id', 'invoiceId', 'action', 'performedBy', 'timestamp'],
      ['details', 'createdAt', 'updatedAt'],
      'AuditEntry'
    );
  });

  it('verifies Notification shape in GET /api/notifications matches Notification interface', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    assertNoInternalLeak(res.body);

    // Notification interface: id, type, invoiceId, message, read, createdAt (optional: userId)
    assertShapeParity(
      res.body[0],
      ['id', 'type', 'invoiceId', 'message', 'read', 'createdAt'],
      ['userId'],
      'Notification'
    );
  });

  it('verifies notification mark-read response shapes (PATCH /:id/read, POST /:id/read, POST /read-all)', async () => {
    // Retrieve real derived notification first
    const getRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.status).toBe(200);
    expect(Array.isArray(getRes.body)).toBe(true);
    expect(getRes.body.length).toBeGreaterThan(0);
    assertNoInternalLeak(getRes.body);

    const notifId = getRes.body[0].id;
    expect(notifId).toBeDefined();

    // 1. PATCH /api/notifications/:id/read
    const patchRes = await request(app)
      .patch(`/api/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(patchRes.status).toBe(200);
    expect(patchRes.body).toEqual({
      success: true,
      id: notifId,
    });
    assertNoInternalLeak(patchRes.body);
    expect(patchRes.body).not.toHaveProperty('passwordHash');
    expect(patchRes.body).not.toHaveProperty('_id');
    expect(patchRes.body).not.toHaveProperty('__v');

    // 2. POST /api/notifications/:id/read
    const postRes = await request(app)
      .post(`/api/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(postRes.status).toBe(200);
    expect(postRes.body).toEqual({
      success: true,
      id: notifId,
    });
    assertNoInternalLeak(postRes.body);
    expect(postRes.body).not.toHaveProperty('passwordHash');
    expect(postRes.body).not.toHaveProperty('_id');
    expect(postRes.body).not.toHaveProperty('__v');

    // 3. POST /api/notifications/read-all
    const readAllRes = await request(app)
      .post('/api/notifications/read-all')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(readAllRes.status).toBe(200);
    expect(readAllRes.body).toEqual({ success: true });
    assertNoInternalLeak(readAllRes.body);
    expect(readAllRes.body).not.toHaveProperty('passwordHash');
    expect(readAllRes.body).not.toHaveProperty('_id');
    expect(readAllRes.body).not.toHaveProperty('__v');
  });

  it('verifies User shape in GET /api/auth/me matches User interface', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    assertNoInternalLeak(res.body);

    // User interface: id, name, email, role (optional: avatarUrl, department)
    assertShapeParity(
      res.body.user,
      ['id', 'name', 'email', 'role'],
      ['avatarUrl', 'department', 'createdAt', 'updatedAt'],
      'User (GET /me)'
    );
  });

  it('verifies GET /api/auth/users returns array of User shapes for Admin and rejects non-Admin with 403', async () => {
    // Admin request returns array of User shapes
    const res = await request(app)
      .get('/api/auth/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    assertNoInternalLeak(res.body);
    assertShapeParity(
      res.body[0],
      ['id', 'name', 'email', 'role'],
      ['avatarUrl', 'department', 'createdAt', 'updatedAt'],
      'User (GET /users)'
    );

    // Non-Admin request (Requester) gets 403 Forbidden
    const nonAdminRes = await request(app)
      .get('/api/auth/users')
      .set('Authorization', `Bearer ${requesterToken}`);

    expect(nonAdminRes.status).toBe(403);
    assertNoInternalLeak(nonAdminRes.body);
    expect(nonAdminRes.body).toEqual({
      error: 'Forbidden: Insufficient permissions',
    });
  });

  it('verifies GET /api/auth/users/:id returns User shape for Admin and rejects non-Admin with 403', async () => {
    const res = await request(app)
      .get(`/api/auth/users/${adminUser.id || adminUser._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    assertNoInternalLeak(res.body);
    assertShapeParity(
      res.body,
      ['id', 'name', 'email', 'role'],
      ['avatarUrl', 'department', 'createdAt', 'updatedAt'],
      'User (GET /users/:id)'
    );

    const nonAdminRes = await request(app)
      .get(`/api/auth/users/${adminUser.id || adminUser._id}`)
      .set('Authorization', `Bearer ${requesterToken}`);

    expect(nonAdminRes.status).toBe(403);
    assertNoInternalLeak(nonAdminRes.body);
    expect(nonAdminRes.body).toEqual({
      error: 'Forbidden: Insufficient permissions',
    });
  });
});

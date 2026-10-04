const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const PurchaseOrder = require('../src/models/PurchaseOrder');
const Vendor = require('../src/models/Vendor');
const purchaseOrdersRouter = require('../src/routes/purchaseOrders.routes');
const { JWT_SECRET } = require('../src/config/env');

const daysFromNow = (days) => {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().split('T')[0];
};

const app = express();
app.use(express.json());
app.use('/api/purchase-orders', purchaseOrdersRouter);

describe('Purchase Orders API (GET /api/purchase-orders, GET /api/purchase-orders/:id, POST /api/purchase-orders)', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterEach(async () => {
    if (mongoose.connection.db) {
      const collections = await mongoose.connection.db.collections();
      for (const collection of collections) {
        await collection.deleteMany({});
      }
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  const createToken = (role) => {
    return jwt.sign(
      {
        id: new mongoose.Types.ObjectId().toString(),
        email: `${role.toLowerCase()}@enterprise.com`,
        role,
        name: `${role} User`,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  };

  const adminToken = createToken('Admin');
  const approverToken = createToken('Approver');
  const requesterToken = createToken('Requester');

  let vendor1;
  let vendor2;
  let po1;
  let po2;
  let po3;

  beforeEach(async () => {
    vendor1 = await Vendor.create({
      name: 'Apex Cloud Services',
      contactEmail: 'billing@apexcloud.io',
      paymentTerms: 'Net 30',
      address: '500 Howard St, San Francisco, CA',
      taxId: '94-3289104',
    });

    vendor2 = await Vendor.create({
      name: 'Northwest Logistics',
      contactEmail: 'ap@northwestlogistics.com',
      paymentTerms: 'Net 15',
      address: '1200 Industrial Way, Seattle, WA',
      taxId: '91-4829105',
    });

    po1 = await PurchaseOrder.create({
      poNumber: 'PO-2026-001',
      vendorId: vendor1._id,
      amount: 14500,
      description: 'Cloud Infrastructure & Reserved Instances Q3',
      createdDate: daysFromNow(-90),
      status: 'Partially Invoiced',
      items: [
        {
          id: 'poi-101',
          description: 'Cloud Compute Instances Tier 3',
          quantity: 3,
          unitPrice: 4000,
          total: 12000,
        },
        {
          id: 'poi-102',
          description: '24/7 Enterprise Cloud Support SLA',
          quantity: 1,
          unitPrice: 2500,
          total: 2500,
        },
      ],
    });

    po2 = await PurchaseOrder.create({
      poNumber: 'PO-2026-002',
      vendorId: vendor1._id,
      amount: 8200,
      description: 'Database Backup & Data Migration Services',
      createdDate: daysFromNow(-75),
      status: 'Open',
      items: [
        {
          id: 'poi-201',
          description: 'Database Architecture Consulting Hours',
          quantity: 40,
          unitPrice: 180,
          total: 7200,
        },
      ],
    });

    po3 = await PurchaseOrder.create({
      poNumber: 'PO-2026-003',
      vendorId: vendor2._id,
      amount: 12000,
      description: 'Regional Freight & Distribution Contracts',
      createdDate: daysFromNow(-60),
      status: 'Partially Invoiced',
      items: [
        {
          id: 'poi-301',
          description: 'Pallet Shipping - Zone 1 Standard Delivery',
          quantity: 50,
          unitPrice: 160,
          total: 8000,
        },
      ],
    });
  });

  describe('GET /api/purchase-orders', () => {
    it('rejects unauthenticated requests (401)', async () => {
      const res = await request(app).get('/api/purchase-orders');
      expect(res.status).toBe(401);
    });

    it('returns 200 with all purchase orders when authenticated', async () => {
      const res = await request(app)
        .get('/api/purchase-orders')
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(3);

      expect(res.body[0].poNumber).toBe('PO-2026-001');
      expect(res.body[1].poNumber).toBe('PO-2026-002');
      expect(res.body[2].poNumber).toBe('PO-2026-003');

      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]._id).toBeUndefined();
      expect(res.body[0].amount).toBe(14500);
      expect(res.body[0].items.length).toBe(2);
    });

    it('filters purchase orders by vendorId query parameter', async () => {
      const resVendor1 = await request(app)
        .get(`/api/purchase-orders?vendorId=${vendor1.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resVendor1.status).toBe(200);
      expect(resVendor1.body.length).toBe(2);
      expect(resVendor1.body.map((p) => p.poNumber)).toEqual(
        expect.arrayContaining(['PO-2026-001', 'PO-2026-002'])
      );

      const resVendor2 = await request(app)
        .get(`/api/purchase-orders?vendorId=${vendor2.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resVendor2.status).toBe(200);
      expect(resVendor2.body.length).toBe(1);
      expect(resVendor2.body[0].poNumber).toBe('PO-2026-003');

      const nonExistentVendorId = new mongoose.Types.ObjectId().toString();
      const resNonExistent = await request(app)
        .get(`/api/purchase-orders?vendorId=${nonExistentVendorId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resNonExistent.status).toBe(200);
      expect(resNonExistent.body.length).toBe(0);
    });
  });

  describe('GET /api/purchase-orders/:id', () => {
    it('returns 200 with purchase order details when queried by id', async () => {
      const res = await request(app)
        .get(`/api/purchase-orders/${po1.id}`)
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(po1.id);
      expect(res.body.poNumber).toBe('PO-2026-001');
      expect(res.body.amount).toBe(14500);
      expect(res.body._id).toBeUndefined();
      expect(res.body.items.length).toBe(2);
    });

    it('returns 200 when queried by poNumber', async () => {
      const res = await request(app)
        .get('/api/purchase-orders/PO-2026-002')
        .set('Authorization', `Bearer ${approverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(po2.id);
      expect(res.body.poNumber).toBe('PO-2026-002');
      expect(res.body.amount).toBe(8200);
    });

    it('returns 404 for non-existent purchase order', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/purchase-orders/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Purchase order not found');
    });
  });

  describe('POST /api/purchase-orders', () => {
    const newPOData = {
      poNumber: 'PO-2026-099',
      vendorId: null, // will set in test
      amount: 5000,
      description: 'Extra Expedited Delivery',
      createdDate: daysFromNow(-15),
      items: [
        {
          description: 'Special Freight Run',
          quantity: 2,
          unitPrice: 2500,
          total: 5000,
        },
      ],
    };

    it('allows Admin to create a purchase order (201)', async () => {
      const res = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...newPOData,
          vendorId: vendor2.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.poNumber).toBe('PO-2026-099');
      expect(res.body).toHaveProperty('id');
      expect(res.body._id).toBeUndefined();
    });

    it('forbids Approver from creating purchase order (403)', async () => {
      const res = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          ...newPOData,
          poNumber: 'PO-2026-100',
          vendorId: vendor2.id,
        });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', 'Forbidden: Insufficient permissions');
    });

    it('forbids Requester from creating purchase order (403)', async () => {
      const res = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({
          ...newPOData,
          vendorId: vendor2.id,
        });

      expect(res.status).toBe(403);
    });

    it('rejects duplicate poNumber with 409', async () => {
      const res = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...newPOData,
          poNumber: 'PO-2026-001', // already seeded
          vendorId: vendor1.id,
        });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error', 'Purchase order with poNumber PO-2026-001 already exists');
    });

    it('rejects missing required fields with 400', async () => {
      const res = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'No poNumber, vendor, or amount',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });
});

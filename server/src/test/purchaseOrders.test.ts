import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { setupTestDB } from './setup';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { purchaseOrdersRouter } from '../routes/purchaseOrders.routes';
import { config } from '../config/env';

const app = express();
app.use(express.json());
app.use('/api/purchase-orders', purchaseOrdersRouter);

describe('Purchase Orders API (GET /api/purchase-orders, GET /api/purchase-orders/:id)', () => {
  setupTestDB();

  const createToken = (role: 'Admin' | 'Approver' | 'Requester') => {
    return jwt.sign(
      {
        id: `user-${role.toLowerCase()}`,
        email: `${role.toLowerCase()}@enterprise.com`,
        role,
        name: `${role} User`,
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  };

  const adminToken = createToken('Admin');
  const approverToken = createToken('Approver');
  const requesterToken = createToken('Requester');

  beforeEach(async () => {
    await PurchaseOrder.create([
      {
        id: 'po-1',
        poNumber: 'PO-2026-001',
        vendorId: 'vendor-1',
        amount: 14500,
        description: 'Cloud Infrastructure & Reserved Instances Q3',
        createdDate: '2026-07-01',
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
      },
      {
        id: 'po-2',
        poNumber: 'PO-2026-002',
        vendorId: 'vendor-1',
        amount: 8200,
        description: 'Database Backup & Data Migration Services',
        createdDate: '2026-07-15',
        status: 'Open',
        items: [
          {
            id: 'poi-201',
            description: 'Database Architecture Consulting Hours',
            quantity: 40,
            unitPrice: 180,
            total: 7200,
          },
          {
            id: 'poi-202',
            description: 'Cross-Region Storage Replication Tier 1',
            quantity: 2,
            unitPrice: 500,
            total: 1000,
          },
        ],
      },
      {
        id: 'po-3',
        poNumber: 'PO-2026-003',
        vendorId: 'vendor-2',
        amount: 12000,
        description: 'Regional Freight & Distribution Contracts',
        createdDate: '2026-08-01',
        status: 'Partially Invoiced',
        items: [
          {
            id: 'poi-301',
            description: 'Pallet Shipping - Zone 1 Standard Delivery',
            quantity: 50,
            unitPrice: 160,
            total: 8000,
          },
          {
            id: 'poi-302',
            description: 'Expedited Temperature Controlled Transport',
            quantity: 8,
            unitPrice: 500,
            total: 4000,
          },
        ],
      },
    ]);
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

      const firstPO = res.body[0];
      expect(firstPO).toHaveProperty('id');
      expect(firstPO._id).toBeUndefined();
      expect(firstPO.__v).toBeUndefined();
      expect(firstPO).toHaveProperty('poNumber');
      expect(firstPO).toHaveProperty('vendorId');
      expect(firstPO).toHaveProperty('amount');
      expect(firstPO).toHaveProperty('description');
      expect(firstPO).toHaveProperty('items');
      expect(Array.isArray(firstPO.items)).toBe(true);
      expect(firstPO.items[0]).toHaveProperty('id');
      expect(firstPO.items[0]._id).toBeUndefined();
      expect(firstPO.items[0]).toHaveProperty('description');
      expect(firstPO.items[0]).toHaveProperty('quantity');
      expect(firstPO.items[0]).toHaveProperty('unitPrice');
      expect(firstPO.items[0]).toHaveProperty('total');
    });

    it('filters purchase orders by vendorId query parameter', async () => {
      const resVendor1 = await request(app)
        .get('/api/purchase-orders?vendorId=vendor-1')
        .set('Authorization', `Bearer ${approverToken}`);

      expect(resVendor1.status).toBe(200);
      expect(resVendor1.body.length).toBe(2);
      expect(resVendor1.body.every((po: any) => po.vendorId === 'vendor-1')).toBe(true);

      const resVendor2 = await request(app)
        .get('/api/purchase-orders?vendorId=vendor-2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resVendor2.status).toBe(200);
      expect(resVendor2.body.length).toBe(1);
      expect(resVendor2.body[0].poNumber).toBe('PO-2026-003');

      const resNonExistent = await request(app)
        .get('/api/purchase-orders?vendorId=vendor-999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resNonExistent.status).toBe(200);
      expect(resNonExistent.body.length).toBe(0);
    });
  });

  describe('GET /api/purchase-orders/:id', () => {
    it('returns 200 with purchase order details when queried by id', async () => {
      const res = await request(app)
        .get('/api/purchase-orders/po-1')
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('po-1');
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
      expect(res.body.id).toBe('po-2');
      expect(res.body.poNumber).toBe('PO-2026-002');
      expect(res.body.amount).toBe(8200);
    });

    it('returns 404 for non-existent purchase order', async () => {
      const res = await request(app)
        .get('/api/purchase-orders/po-non-existent')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Purchase order not found');
    });
  });

  describe('POST /api/purchase-orders', () => {
    const newPOData = {
      poNumber: 'PO-2026-099',
      vendorId: 'vendor-2',
      amount: 5000,
      description: 'Extra Expedited Delivery',
      createdDate: '2026-09-15',
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
        .send(newPOData);

      expect(res.status).toBe(201);
      expect(res.body.poNumber).toBe('PO-2026-099');
      expect(res.body).toHaveProperty('id');
      expect(res.body._id).toBeUndefined();
    });

    it('allows Approver to create a purchase order (201)', async () => {
      const res = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          ...newPOData,
          poNumber: 'PO-2026-100',
        });

      expect(res.status).toBe(201);
      expect(res.body.poNumber).toBe('PO-2026-100');
    });

    it('forbids Requester from creating purchase order (403)', async () => {
      const res = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send(newPOData);

      expect(res.status).toBe(403);
    });

    it('rejects duplicate poNumber with 409', async () => {
      const res = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...newPOData,
          poNumber: 'PO-2026-001', // already seeded
        });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error');
    });
  });
});

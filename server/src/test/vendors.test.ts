import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { setupTestDB } from './setup';
import { Vendor } from '../models/Vendor';
import { vendorsRouter } from '../routes/vendors.routes';
import { config } from '../config/env';

const app = express();
app.use(express.json());
app.use('/api/vendors', vendorsRouter);

describe('Vendors API (GET /api/vendors, GET /api/vendors/:id, POST /api/vendors)', () => {
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
    await Vendor.create([
      {
        id: 'vendor-1',
        name: 'Apex Cloud Services',
        contactEmail: 'billing@apexcloud.io',
        paymentTerms: 'Net 30',
        address: '500 Howard St, San Francisco, CA 94105',
        taxId: '94-3289104',
        status: 'Active',
        phone: '+1 (415) 555-0192',
        totalInvoices: 5,
      },
      {
        id: 'vendor-2',
        name: 'Northwest Logistics',
        contactEmail: 'ap@northwestlogistics.com',
        paymentTerms: 'Net 15',
        address: '1200 Industrial Way, Seattle, WA 98101',
        taxId: '91-4829105',
        status: 'Active',
        phone: '+1 (206) 555-0143',
        totalInvoices: 4,
      },
    ]);
  });

  describe('GET /api/vendors', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/vendors');
      expect(res.status).toBe(401);
    });

    it('returns 200 with list of vendors for authenticated user', async () => {
      const res = await request(app)
        .get('/api/vendors')
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);

      const firstVendor = res.body[0];
      expect(firstVendor).toHaveProperty('id');
      expect(firstVendor._id).toBeUndefined();
      expect(firstVendor.__v).toBeUndefined();
      expect(firstVendor).toHaveProperty('name');
      expect(firstVendor).toHaveProperty('contactEmail');
      expect(firstVendor).toHaveProperty('paymentTerms');
      expect(firstVendor).toHaveProperty('taxId');
    });
  });

  describe('GET /api/vendors/:id', () => {
    it('returns 200 with vendor details and empty invoices array if none exist', async () => {
      const res = await request(app)
        .get('/api/vendors/vendor-1')
        .set('Authorization', `Bearer ${approverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('vendor-1');
      expect(res.body.name).toBe('Apex Cloud Services');
      expect(res.body._id).toBeUndefined();
      expect(res.body.__v).toBeUndefined();
      expect(res.body).toHaveProperty('invoices');
      expect(Array.isArray(res.body.invoices)).toBe(true);
    });

    it('returns 404 for non-existent vendor ID', async () => {
      const res = await request(app)
        .get('/api/vendors/non-existent-vendor')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Vendor not found');
    });
  });

  describe('POST /api/vendors', () => {
    const validVendorData = {
      name: 'Pioneer Industrial',
      contactEmail: 'finance@pioneerind.com',
      paymentTerms: 'Net 60',
      address: '4500 Manufacturing Blvd, Detroit, MI 48201',
      taxId: '38-6543219',
      status: 'Active',
      phone: '+1 (313) 555-0177',
    };

    it('allows Admin to create a new vendor (201)', async () => {
      const res = await request(app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validVendorData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Pioneer Industrial');
      expect(res.body.contactEmail).toBe('finance@pioneerind.com');
      expect(res.body.paymentTerms).toBe('Net 60');
      expect(res.body.status).toBe('Active');
      expect(res.body.totalInvoices).toBe(0);
      expect(res.body._id).toBeUndefined();
      expect(res.body.__v).toBeUndefined();

      // Verify in DB
      const dbVendor = await Vendor.findById(res.body.id);
      expect(dbVendor).not.toBeNull();
      expect(dbVendor?.name).toBe('Pioneer Industrial');
    });

    it('forbids Approver from creating vendor (403)', async () => {
      const res = await request(app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${approverToken}`)
        .send(validVendorData);

      expect(res.status).toBe(403);
    });

    it('forbids Requester from creating vendor (403)', async () => {
      const res = await request(app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send(validVendorData);

      expect(res.status).toBe(403);
    });

    it('rejects creation when required fields are missing (400)', async () => {
      const res = await request(app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Missing Fields Co',
          // missing contactEmail, address, taxId
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('rejects invalid paymentTerms (400)', async () => {
      const res = await request(app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validVendorData,
          name: 'Bad Terms Corp',
          paymentTerms: 'Net 999',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid paymentTerms');
    });
  });
});

import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { setupTestDB } from './setup';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { vendorsRouter } from '../routes/vendors.routes';
import { config } from '../config/env';

const app = express();
app.use(express.json());

// Role-gated test endpoints
app.get(
  '/api/test/admin-only',
  authenticateJWT,
  requireRole(['Admin']),
  (_req, res) => {
    res.status(200).json({ message: 'Welcome Admin' });
  }
);

app.get(
  '/api/test/approver-and-admin',
  authenticateJWT,
  requireRole(['Admin', 'Approver']),
  (_req, res) => {
    res.status(200).json({ message: 'Welcome Approver or Admin' });
  }
);

app.get(
  '/api/test/all-roles',
  authenticateJWT,
  requireRole(['Admin', 'Approver', 'Requester']),
  (_req, res) => {
    res.status(200).json({ message: 'Welcome Any Role' });
  }
);

app.use('/api/vendors', vendorsRouter);

describe('RBAC Middleware & Role-Gated Routes', () => {
  setupTestDB();

  const createToken = (id: string, email: string, role: 'Admin' | 'Approver' | 'Requester', name: string) => {
    return jwt.sign({ id, email, role, name }, config.jwtSecret, { expiresIn: '1h' });
  };

  const adminToken = createToken('admin-1', 'admin@enterprise.com', 'Admin', 'Admin User');
  const approverToken = createToken('approver-1', 'approver@enterprise.com', 'Approver', 'Approver User');
  const requesterToken = createToken('requester-1', 'requester@enterprise.com', 'Requester', 'Requester User');

  describe('requireRole(["Admin"])', () => {
    it('allows Admin user (200)', async () => {
      const res = await request(app)
        .get('/api/test/admin-only')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Welcome Admin');
    });

    it('forbids Approver user (403)', async () => {
      const res = await request(app)
        .get('/api/test/admin-only')
        .set('Authorization', `Bearer ${approverToken}`);
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });

    it('forbids Requester user (403)', async () => {
      const res = await request(app)
        .get('/api/test/admin-only')
        .set('Authorization', `Bearer ${requesterToken}`);
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('requireRole(["Admin", "Approver"])', () => {
    it('allows Admin user (200)', async () => {
      const res = await request(app)
        .get('/api/test/approver-and-admin')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });

    it('allows Approver user (200)', async () => {
      const res = await request(app)
        .get('/api/test/approver-and-admin')
        .set('Authorization', `Bearer ${approverToken}`);
      expect(res.status).toBe(200);
    });

    it('forbids Requester user (403)', async () => {
      const res = await request(app)
        .get('/api/test/approver-and-admin')
        .set('Authorization', `Bearer ${requesterToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('requireRole(["Admin", "Approver", "Requester"])', () => {
    it('allows all 3 roles (200)', async () => {
      const resAdmin = await request(app)
        .get('/api/test/all-roles')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resAdmin.status).toBe(200);

      const resApprover = await request(app)
        .get('/api/test/all-roles')
        .set('Authorization', `Bearer ${approverToken}`);
      expect(resApprover.status).toBe(200);

      const resRequester = await request(app)
        .get('/api/test/all-roles')
        .set('Authorization', `Bearer ${requesterToken}`);
      expect(resRequester.status).toBe(200);
    });
  });

  describe('Role-gated POST /api/vendors route', () => {
    const newVendorPayload = {
      name: 'CyberCore Inc',
      contactEmail: 'contact@cybercore.io',
      paymentTerms: 'Net 30',
      address: '100 Cyber Way, San Jose, CA',
      taxId: '88-1234567',
    };

    it('allows Admin to create vendor (201)', async () => {
      const res = await request(app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newVendorPayload);

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('CyberCore Inc');
      expect(res.body).toHaveProperty('id');
      expect(res.body._id).toBeUndefined();
    });

    it('rejects Approver attempting to create vendor (403)', async () => {
      const res = await request(app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${approverToken}`)
        .send(newVendorPayload);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });

    it('rejects Requester attempting to create vendor (403)', async () => {
      const res = await request(app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send(newVendorPayload);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });

    it('rejects unauthenticated requests (401)', async () => {
      const res = await request(app)
        .post('/api/vendors')
        .send(newVendorPayload);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });
  });
});

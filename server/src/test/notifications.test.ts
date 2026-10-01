import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { setupTestDB } from './setup';
import notificationsRouter from '../routes/notifications.routes';
import { resetReadNotifications } from '../services/notifications.service';
import { InvoiceModel } from '../models/Invoice';
import { config } from '../config/env';

describe('Dynamic Notifications Integration Tests', () => {
  setupTestDB();

  const app = express();
  app.use(express.json());
  app.use('/api/notifications', notificationsRouter);

  const now = new Date();
  const formatIso = (d: Date) => d.toISOString().split('T')[0];
  const offsetDate = (days: number) => {
    return formatIso(new Date(now.getTime() + days * 24 * 60 * 60 * 1000));
  };

  const requesterToken = jwt.sign(
    { id: 'user-req-1', email: 'req1@example.com', role: 'Requester', name: 'Requester One' },
    config.jwtSecret
  );
  const approverToken = jwt.sign(
    { id: 'user-appr-1', email: 'appr@example.com', role: 'Approver', name: 'Approver One' },
    config.jwtSecret
  );
  const adminToken = jwt.sign(
    { id: 'user-admin-1', email: 'admin@example.com', role: 'Admin', name: 'Admin One' },
    config.jwtSecret
  );

  let overdueInvId: string;
  let dueSoonInvId: string;
  let pendingApprovalInvId: string;
  let flaggedInvId: string;

  beforeEach(async () => {
    resetReadNotifications();

    // 1. Overdue Invoice (dueDate was 3 days ago, status not paid) -> submitted by user-req-1
    const overdue = await InvoiceModel.create({
      invoiceNumber: 'INV-NOTIF-OVERDUE',
      vendorId: 'vendor-1',
      amount: 1500,
      status: 'Approved',
      submittedDate: offsetDate(-10),
      dueDate: offsetDate(-3),
      submittedBy: 'user-req-1',
    });
    overdueInvId = overdue.id || (overdue as any)._id.toString();

    // 2. Due Soon Invoice (dueDate in 2 days, not paid) -> submitted by user-req-1
    const dueSoon = await InvoiceModel.create({
      invoiceNumber: 'INV-NOTIF-DUESOON',
      vendorId: 'vendor-1',
      amount: 2500,
      status: 'Approved',
      submittedDate: offsetDate(-1),
      dueDate: offsetDate(2),
      submittedBy: 'user-req-1',
    });
    dueSoonInvId = dueSoon.id || (dueSoon as any)._id.toString();

    // 3. Pending Approval > 3 Days (submitted 6 days ago, status Submitted, due far future) -> submitted by user-req-2
    const pending = await InvoiceModel.create({
      invoiceNumber: 'INV-NOTIF-PENDING',
      vendorId: 'vendor-2',
      amount: 3200,
      status: 'Submitted',
      submittedDate: offsetDate(-6),
      dueDate: offsetDate(20),
      submittedBy: 'user-req-2',
    });
    pendingApprovalInvId = pending.id || (pending as any)._id.toString();

    // 4. Flagged Invoice -> submitted by user-req-2
    const flagged = await InvoiceModel.create({
      invoiceNumber: 'INV-NOTIF-FLAGGED',
      vendorId: 'vendor-2',
      amount: 450,
      status: 'Flagged',
      flagReason: 'Line item unit price mismatch with PO',
      submittedDate: offsetDate(-1),
      dueDate: offsetDate(15),
      submittedBy: 'user-req-2',
    });
    flaggedInvId = flagged.id || (flagged as any)._id.toString();

    // 5. Normal Paid Invoice (should NOT generate notifications)
    await InvoiceModel.create({
      invoiceNumber: 'INV-NOTIF-PAID',
      vendorId: 'vendor-1',
      amount: 900,
      status: 'Paid',
      submittedDate: offsetDate(-15),
      dueDate: offsetDate(-5),
      paidDate: offsetDate(-4),
      submittedBy: 'user-req-1',
    });
  });

  describe('Dynamic Evaluation Conditions', () => {
    it('should derive overdue, due soon, pending approval, and flagged notifications for Admin', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      const types = res.body.map((n: any) => n.type);
      expect(types).toContain('overdue');
      expect(types).toContain('due_soon');
      expect(types).toContain('pending_approval');
      expect(types).toContain('flagged');

      const overdueNotif = res.body.find((n: any) => n.type === 'overdue');
      expect(overdueNotif.invoiceId).toBe(overdueInvId);
      expect(overdueNotif.message).toMatch(/is overdue/);
      expect(overdueNotif.read).toBe(false);

      const dueSoonNotif = res.body.find((n: any) => n.type === 'due_soon');
      expect(dueSoonNotif.invoiceId).toBe(dueSoonInvId);
      expect(dueSoonNotif.message).toMatch(/is due in/);

      const pendingNotif = res.body.find((n: any) => n.type === 'pending_approval');
      expect(pendingNotif.invoiceId).toBe(pendingApprovalInvId);
      expect(pendingNotif.message).toMatch(/pending approval for/);

      const flaggedNotif = res.body.find((n: any) => n.type === 'flagged');
      expect(flaggedNotif.invoiceId).toBe(flaggedInvId);
      expect(flaggedNotif.message).toMatch(/Line item unit price mismatch with PO/);
    });

    it('should derive all notifications for Approver role', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${approverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Role-Scoped Filtering', () => {
    it('should scope notifications for Requester to only invoices they submitted', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(res.status).toBe(200);
      // user-req-1 only submitted overdue and dueSoon invoices
      expect(res.body.length).toBe(2);
      const invoiceIds = res.body.map((n: any) => n.invoiceId);
      expect(invoiceIds).toContain(overdueInvId);
      expect(invoiceIds).toContain(dueSoonInvId);
      expect(invoiceIds).not.toContain(pendingApprovalInvId);
      expect(invoiceIds).not.toContain(flaggedInvId);
    });

    it('should support authentication via custom headers (x-user-role and x-user-id)', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('x-user-role', 'Requester')
        .set('x-user-id', 'user-req-2');

      expect(res.status).toBe(200);
      // user-req-2 only submitted pending approval and flagged invoices
      const invoiceIds = res.body.map((n: any) => n.invoiceId);
      expect(invoiceIds).toContain(pendingApprovalInvId);
      expect(invoiceIds).toContain(flaggedInvId);
      expect(invoiceIds).not.toContain(overdueInvId);
      expect(invoiceIds).not.toContain(dueSoonInvId);
    });

    it('should support authentication via query params (?userId=&role=)', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .query({ userId: 'user-req-1', role: 'Requester' });

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });

    it('should reject invalid Bearer token with 401', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', 'Bearer totally-invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Invalid or expired/);
    });
  });

  describe('Read State Management', () => {
    it('should mark a specific notification as read', async () => {
      const listBefore = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${adminToken}`);

      const firstNotifId = listBefore.body[0].id;
      expect(listBefore.body[0].read).toBe(false);

      const patchRes = await request(app).patch(`/api/notifications/${firstNotifId}/read`);
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.success).toBe(true);

      const listAfter = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${adminToken}`);

      const updatedNotif = listAfter.body.find((n: any) => n.id === firstNotifId);
      expect(updatedNotif.read).toBe(true);
    });

    it('should mark all notifications as read', async () => {
      const postRes = await request(app)
        .post('/api/notifications/read-all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(postRes.status).toBe(200);
      expect(postRes.body.success).toBe(true);

      const listAfter = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listAfter.body.every((n: any) => n.read === true)).toBe(true);
    });
  });
});

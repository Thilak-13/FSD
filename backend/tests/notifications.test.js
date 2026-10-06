const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { connectDB, disconnectDB } = require('../src/config/db');
const { JWT_SECRET } = require('../src/config/env');
const Invoice = require('../src/models/Invoice');
const User = require('../src/models/User');
const NotificationRead = require('../src/models/NotificationRead');
const notificationsRouter = require('../src/routes/notifications.routes');
const {
  getDerivedNotifications,
  resetReadNotifications,
} = require('../src/services/notificationService');
const {
  runReminderScan,
  initReminderCron,
  stopReminderCron,
} = require('../src/jobs/reminderCron');
const {
  getLastSentMail,
  resetTransporter,
  getTransporter,
} = require('../src/services/emailService');

describe('Notifications Integration & Unit Tests', () => {
  let mongod;
  let app;

  const now = new Date();
  const daysFromNow = (days) => {
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
  };

  let requesterUser;
  let approverUser;
  let adminUser;
  let otherRequester;

  let requesterToken;
  let approverToken;
  let adminToken;

  let overdueInvoice;
  let dueSoonInvoice;
  let pendingInvoice;
  let flaggedInvoice;
  let paidInvoice;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await connectDB(uri);

    app = express();
    app.use(express.json());
    app.use('/api/notifications', notificationsRouter);
  });

  afterAll(async () => {
    stopReminderCron();
    await disconnectDB();
    try {
      const currentMongoose = require('mongoose');
      if (currentMongoose.connection.readyState !== 0) {
        await currentMongoose.disconnect();
      }
    } catch {
      // ignore
    }
    if (mongod) {
      await mongod.stop();
    }
  });

  beforeEach(async () => {
    resetReadNotifications();
    resetTransporter();
    await Invoice.deleteMany({});
    await User.deleteMany({});

    // Seed test users
    requesterUser = await User.create({
      name: 'Requester Alice',
      email: 'alice@payverify.local',
      passwordHash: 'dummyhash',
      role: 'Requester',
    });

    otherRequester = await User.create({
      name: 'Requester Bob',
      email: 'bob@payverify.local',
      passwordHash: 'dummyhash',
      role: 'Requester',
    });

    approverUser = await User.create({
      name: 'Approver Charlie',
      email: 'charlie@payverify.local',
      passwordHash: 'dummyhash',
      role: 'Approver',
    });

    adminUser = await User.create({
      name: 'Admin Dave',
      email: 'dave@payverify.local',
      passwordHash: 'dummyhash',
      role: 'Admin',
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

    approverToken = jwt.sign(
      {
        id: approverUser.id || approverUser._id.toString(),
        role: approverUser.role,
        email: approverUser.email,
        name: approverUser.name,
      },
      JWT_SECRET
    );

    adminToken = jwt.sign(
      {
        id: adminUser.id || adminUser._id.toString(),
        role: adminUser.role,
        email: adminUser.email,
        name: adminUser.name,
      },
      JWT_SECRET
    );

    const vendorId = new mongoose.Types.ObjectId();

    // 1. Overdue Invoice: dueDate was 3 days ago, submitted 10 days ago, status !== 'Paid' -> submittedBy Alice
    overdueInvoice = await Invoice.create({
      invoiceNumber: 'INV-NOTIF-OVERDUE-01',
      vendorId,
      amount: 1200,
      status: 'Approved',
      submittedDate: daysFromNow(-10),
      dueDate: daysFromNow(-3),
      submittedBy: requesterUser._id,
    });

    // 2. Due Soon Invoice: dueDate is 2 days from now, status !== 'Paid' -> submittedBy Alice
    dueSoonInvoice = await Invoice.create({
      invoiceNumber: 'INV-NOTIF-DUESOON-02',
      vendorId,
      amount: 2400,
      status: 'Under Verification',
      submittedDate: daysFromNow(-1),
      dueDate: daysFromNow(2),
      submittedBy: requesterUser._id,
    });

    // 3. Pending Approval > 3 Days: submitted 6 days ago, status 'Submitted' -> submittedBy Bob
    pendingInvoice = await Invoice.create({
      invoiceNumber: 'INV-NOTIF-PENDING-03',
      vendorId,
      amount: 3500,
      status: 'Submitted',
      submittedDate: daysFromNow(-6),
      dueDate: daysFromNow(20),
      submittedBy: otherRequester._id,
    });

    // 4. Flagged Invoice: status 'Flagged' -> submittedBy Bob
    flaggedInvoice = await Invoice.create({
      invoiceNumber: 'INV-NOTIF-FLAGGED-04',
      vendorId,
      amount: 750,
      status: 'Flagged',
      flagReason: 'Line item unit price discrepancy vs PO',
      submittedDate: daysFromNow(-1),
      dueDate: daysFromNow(15),
      submittedBy: otherRequester._id,
    });

    // 5. Paid Invoice: overdue date but status 'Paid' -> should NOT generate overdue or due_soon notification
    paidInvoice = await Invoice.create({
      invoiceNumber: 'INV-NOTIF-PAID-05',
      vendorId,
      amount: 900,
      status: 'Paid',
      submittedDate: daysFromNow(-20),
      dueDate: daysFromNow(-5),
      paidDate: daysFromNow(-4),
      submittedBy: requesterUser._id,
    });
  });

  describe('Notification Derivation Logic', () => {
    it('correctly derives overdue, due_soon, pending_approval, and flagged notifications for Admin', async () => {
      const notifications = await getDerivedNotifications(
        { id: adminUser._id.toString(), role: 'Admin' },
        now
      );

      expect(Array.isArray(notifications)).toBe(true);
      const types = notifications.map((n) => n.type);

      expect(types).toContain('overdue');
      expect(types).toContain('due_soon');
      expect(types).toContain('pending_approval');
      expect(types).toContain('flagged');

      const overdue = notifications.find((n) => n.type === 'overdue');
      expect(overdue.invoiceId).toBe(
        overdueInvoice.id || overdueInvoice._id.toString()
      );
      expect(overdue.message).toMatch(/is overdue by \d+ day\(s\)/);
      expect(overdue.read).toBe(false);

      const dueSoon = notifications.find((n) => n.type === 'due_soon');
      expect(dueSoon.invoiceId).toBe(
        dueSoonInvoice.id || dueSoonInvoice._id.toString()
      );
      expect(dueSoon.message).toMatch(/is due in \d+ day\(s\)/);

      const pending = notifications.find((n) => n.type === 'pending_approval');
      expect(pending.invoiceId).toBe(
        pendingInvoice.id || pendingInvoice._id.toString()
      );
      expect(pending.message).toMatch(/pending approval for \d+ days/);

      const flagged = notifications.find((n) => n.type === 'flagged');
      expect(flagged.invoiceId).toBe(
        flaggedInvoice.id || flaggedInvoice._id.toString()
      );
      expect(flagged.message).toMatch(/discrepancy/);

      // Verify Paid invoice generated no overdue notification
      const paidNotif = notifications.find(
        (n) =>
          n.invoiceId === (paidInvoice.id || paidInvoice._id.toString())
      );
      expect(paidNotif).toBeUndefined();
    });

    it('derives all notifications across all invoices for Approver role', async () => {
      const notifications = await getDerivedNotifications(
        { id: approverUser._id.toString(), role: 'Approver' },
        now
      );

      expect(notifications.length).toBeGreaterThanOrEqual(4);
    });

    it('scopes notifications for Requester to only invoices they submitted', async () => {
      const aliceId = requesterUser.id || requesterUser._id.toString();
      const aliceNotifs = await getDerivedNotifications(
        { id: aliceId, role: 'Requester' },
        now
      );

      // Alice submitted overdueInvoice and dueSoonInvoice
      expect(aliceNotifs.length).toBe(2);
      aliceNotifs.forEach((n) => {
        expect([
          overdueInvoice.id || overdueInvoice._id.toString(),
          dueSoonInvoice.id || dueSoonInvoice._id.toString(),
        ]).toContain(n.invoiceId);
      });

      // Bob's pending and flagged invoices should NOT be in Alice's notifications
      const bobInvoiceIds = [
        pendingInvoice.id || pendingInvoice._id.toString(),
        flaggedInvoice.id || flaggedInvoice._id.toString(),
      ];
      aliceNotifs.forEach((n) => {
        expect(bobInvoiceIds).not.toContain(n.invoiceId);
      });

      // Verify Bob's notifications only show Bob's invoices
      const bobId = otherRequester.id || otherRequester._id.toString();
      const bobNotifs = await getDerivedNotifications(
        { id: bobId, role: 'Requester' },
        now
      );
      expect(bobNotifs.length).toBe(2);
      bobNotifs.forEach((n) => {
        expect(bobInvoiceIds).toContain(n.invoiceId);
      });
    });

    it('supports backward compatibility when string id is passed directly', async () => {
      const aliceId = requesterUser.id || requesterUser._id.toString();
      const stringIdNotifs = await getDerivedNotifications(aliceId, now);
      expect(Array.isArray(stringIdNotifs)).toBe(true);
    });
  });

  describe('GET /api/notifications HTTP Endpoint', () => {
    it('returns all notifications when authenticated as Admin', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(4);
    });

    it('returns role-scoped notifications when authenticated as Requester', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      const invoiceIds = res.body.map((n) => n.invoiceId);
      expect(invoiceIds).toContain(
        overdueInvoice.id || overdueInvoice._id.toString()
      );
      expect(invoiceIds).toContain(
        dueSoonInvoice.id || dueSoonInvoice._id.toString()
      );
    });

    it('rejects unauthenticated requests without token with 401', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('rejects request with spoofed role header and no token with 401', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('x-user-role', 'Admin')
        .set('x-user-id', adminUser._id.toString());

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('ensures a Requester token plus spoofed role header is still scoped as a Requester', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${requesterToken}`)
        .set('x-user-role', 'Admin')
        .set('x-user-id', adminUser._id.toString());

      expect(res.status).toBe(200);
      // Scoped strictly to Requester's 2 invoices, not Admin's 4
      expect(res.body.length).toBe(2);
      const invoiceIds = res.body.map((n) => n.invoiceId);
      expect(invoiceIds).toContain(
        overdueInvoice.id || overdueInvoice._id.toString()
      );
      expect(invoiceIds).toContain(
        dueSoonInvoice.id || dueSoonInvoice._id.toString()
      );
    });

    it('marks individual notification as read via PATCH and POST with token', async () => {
      const notifId = `notif-overdue-${
        overdueInvoice.id || overdueInvoice._id.toString()
      }`;

      const resPatch = await request(app)
        .patch(`/api/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resPatch.status).toBe(200);
      expect(resPatch.body).toEqual({ success: true, id: notifId });

      // Fetch notifications as Admin, verify read flag
      const getRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${adminToken}`);
      const updatedNotif = getRes.body.find((n) => n.id === notifId);
      expect(updatedNotif.read).toBe(true);

      // Check POST alias works
      const resPost = await request(app)
        .post(`/api/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resPost.status).toBe(200);
    });

    it('returns 404 when attempting to mark read an arbitrary or nonexistent notification id', async () => {
      const nonExistentId = 'notif-nonexistent-12345';

      // PATCH /api/notifications/:id/read returns 404
      const patchRes = await request(app)
        .patch(`/api/notifications/${nonExistentId}/read`)
        .set('Authorization', `Bearer ${requesterToken}`);
      expect(patchRes.status).toBe(404);
      expect(patchRes.body).toEqual({ error: 'Notification not found' });

      // POST /api/notifications/:id/read returns 404
      const postRes = await request(app)
        .post(`/api/notifications/${nonExistentId}/read`)
        .set('Authorization', `Bearer ${requesterToken}`);
      expect(postRes.status).toBe(404);
      expect(postRes.body).toEqual({ error: 'Notification not found' });

      // Requester attempts to mark another user's notification as read (not in Alice's derived notifications)
      const bobsNotifId = `notif-pending-${
        pendingInvoice.id || pendingInvoice._id.toString()
      }`;
      const crossRes = await request(app)
        .patch(`/api/notifications/${bobsNotifId}/read`)
        .set('Authorization', `Bearer ${requesterToken}`);
      expect(crossRes.status).toBe(404);
      expect(crossRes.body).toEqual({ error: 'Notification not found' });

      // Verify no NotificationRead records were persisted for nonexistent ID
      const nonExistentCount = await NotificationRead.countDocuments({
        notificationKey: nonExistentId,
      });
      expect(nonExistentCount).toBe(0);
    });

    it('marks all notifications as read via POST /api/notifications/read-all and verifies only derived notifications are marked', async () => {
      const aliceId = requesterUser.id || requesterUser._id.toString();

      // Alice calls read-all (Alice has 2 derived notifications: overdueInvoice, dueSoonInvoice)
      const aliceRes = await request(app)
        .post('/api/notifications/read-all')
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(aliceRes.status).toBe(200);
      expect(aliceRes.body).toEqual({ success: true });

      // Verify only Alice's derived notifications are marked in MongoDB
      const aliceReadDocs = await NotificationRead.find({ userId: aliceId });
      expect(aliceReadDocs.length).toBe(2);
      const aliceKeys = aliceReadDocs.map((d) => d.notificationKey);
      expect(aliceKeys).toContain(
        `notif-overdue-${overdueInvoice.id || overdueInvoice._id.toString()}`
      );
      expect(aliceKeys).toContain(
        `notif-duesoon-${dueSoonInvoice.id || dueSoonInvoice._id.toString()}`
      );

      // Verify other user's (Bob) notifications were not marked
      const bobId = otherRequester.id || otherRequester._id.toString();
      const bobReadDocs = await NotificationRead.find({ userId: bobId });
      expect(bobReadDocs.length).toBe(0);

      // Admin calls read-all: marks Admin's derived notifications
      const adminRes = await request(app)
        .post('/api/notifications/read-all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminRes.status).toBe(200);
      expect(adminRes.body).toEqual({ success: true });

      const getRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${adminToken}`);

      getRes.body.forEach((n) => {
        expect(n.read).toBe(true);
      });
    });

    it('proves read state survives re-creating the app instance and querying anew', async () => {
      const notifId = `notif-overdue-${
        overdueInvoice.id || overdueInvoice._id.toString()
      }`;
      const adminId = adminUser.id || adminUser._id.toString();

      // Mark read in current app
      await request(app)
        .patch(`/api/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Assert that a NotificationRead document physically exists in MongoDB
      const persistedDoc = await NotificationRead.findOne({
        userId: adminId,
        notificationKey: notifId,
      });
      expect(persistedDoc).not.toBeNull();
      expect(persistedDoc.userId).toBe(adminId);
      expect(persistedDoc.notificationKey).toBe(notifId);

      // Call jest.resetModules() between the two app instances to ensure fresh module state
      jest.resetModules();
      const freshMongoose = require('mongoose');
      if (freshMongoose.connection.readyState === 0) {
        await freshMongoose.connect(mongod.getUri());
      }
      const freshExpress = require('express');
      const freshNotificationsRouter = require('../src/routes/notifications.routes');

      // Re-create app instance from scratch with fresh modules
      const freshApp = freshExpress();
      freshApp.use(freshExpress.json());
      freshApp.use('/api/notifications', freshNotificationsRouter);

      const freshRes = await request(freshApp)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(freshRes.status).toBe(200);
      const readNotif = freshRes.body.find((n) => n.id === notifId);
      expect(readNotif).toBeDefined();
      expect(readNotif.read).toBe(true);
    });
  });

  describe('Scheduled Reminders & Cron Scan', () => {
    it('runReminderScan identifies actionable invoices and sends email', async () => {
      const scanResult = await runReminderScan(now, 'finance-alerts@payverify.local');

      expect(scanResult.totalScanned).toBeGreaterThan(0);
      expect(scanResult.overdueCount).toBeGreaterThanOrEqual(1);
      expect(scanResult.dueSoonCount).toBeGreaterThanOrEqual(1);
      expect(scanResult.pendingCount).toBeGreaterThanOrEqual(1);
      expect(scanResult.emailSent).toBe(true);
      expect(scanResult.recipient).toBe('finance-alerts@payverify.local');
      expect(scanResult.subject).toMatch(/PayVerify Daily Alert/);

      const lastMail = getLastSentMail();
      expect(lastMail).not.toBeNull();
      expect(lastMail.options.to).toBe('finance-alerts@payverify.local');
      expect(lastMail.options.subject).toMatch(/PayVerify Daily Alert/);
      expect(lastMail.options.html).toContain('PayVerify Daily Invoice Reminder Summary');
    });

    it('initializes and stops scheduled cron task cleanly', () => {
      const task = initReminderCron('* * * * *');
      expect(task).toBeDefined();
      expect(typeof task.stop).toBe('function');

      stopReminderCron();
    });
  });

  describe('Email Service Fallback Behavior', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalHost = process.env.SMTP_HOST;
    const originalUser = process.env.SMTP_USER;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
      process.env.SMTP_HOST = originalHost;
      process.env.SMTP_USER = originalUser;
      resetTransporter();
    });

    it('fails loudly and throws when NODE_ENV !== "test" and SMTP_USER is missing', async () => {
      process.env.NODE_ENV = 'production';
      process.env.SMTP_HOST = 'smtp.example.com';
      delete process.env.SMTP_USER;
      resetTransporter();

      await expect(getTransporter()).rejects.toThrow(
        /SMTP configuration missing/i
      );
    });

    it('fails loudly and throws when NODE_ENV !== "test" and SMTP_HOST is missing', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.SMTP_HOST;
      process.env.SMTP_USER = 'user@example.com';
      resetTransporter();

      await expect(getTransporter()).rejects.toThrow(
        /SMTP configuration missing/i
      );
    });
  });
});

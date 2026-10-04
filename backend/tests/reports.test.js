const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Invoice = require('../src/models/Invoice');
const Vendor = require('../src/models/Vendor');
const reportsRouter = require('../src/routes/reports.routes');

const daysFromNow = (days) => {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().split('T')[0];
};

const app = express();
app.use(express.json());
app.use('/api/reports', reportsRouter);

describe('Reports & Spend Analytics Integration Tests', () => {
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

  let vendor1;
  let vendor2;
  let vendor3;

  beforeEach(async () => {
    vendor1 = await Vendor.create({
      name: 'Acme Corp',
      contactEmail: 'contact@acme.com',
      paymentTerms: 'Net 30',
      address: '100 Acme Way',
      taxId: 'TX-1111',
      status: 'Active',
    });

    vendor2 = await Vendor.create({
      name: 'Beta Logistics',
      contactEmail: 'info@betalogistics.com',
      paymentTerms: 'Net 15',
      address: '200 Logistics Blvd',
      taxId: 'TX-2222',
      status: 'Active',
    });

    vendor3 = await Vendor.create({
      name: 'Gamma Services',
      contactEmail: 'hello@gammaservices.com',
      paymentTerms: 'Net 45',
      address: '300 Services Rd',
      taxId: 'TX-3333',
      status: 'Inactive',
    });

    const user1Id = new mongoose.Types.ObjectId();
    const user2Id = new mongoose.Types.ObjectId();

    await Invoice.create([
      {
        invoiceNumber: 'INV-REP-001',
        vendorId: vendor1._id,
        amount: 1000,
        status: 'Paid',
        submittedDate: daysFromNow(-20),
        paidDate: daysFromNow(-15), // 5 days processing
        dueDate: daysFromNow(-11),
        submittedBy: user1Id,
      },
      {
        invoiceNumber: 'INV-REP-002',
        vendorId: vendor1._id,
        amount: 500,
        status: 'Submitted',
        submittedDate: daysFromNow(-16),
        dueDate: daysFromNow(5),
        submittedBy: user1Id,
      },
      {
        invoiceNumber: 'INV-REP-003',
        vendorId: vendor1._id,
        amount: 250,
        status: 'Flagged',
        flagReason: 'Price discrepancy with PO',
        submittedDate: daysFromNow(-11),
        dueDate: daysFromNow(10),
        submittedBy: user2Id,
      },
      {
        invoiceNumber: 'INV-REP-004',
        vendorId: vendor2._id,
        amount: 2000,
        status: 'Payment Scheduled',
        scheduledPaymentDate: daysFromNow(1),
        submittedDate: daysFromNow(-9),
        dueDate: daysFromNow(1),
        submittedBy: user2Id,
      },
      {
        invoiceNumber: 'INV-REP-005',
        vendorId: vendor2._id,
        amount: 800,
        status: 'Under Verification',
        submittedDate: daysFromNow(-6),
        dueDate: daysFromNow(7),
        submittedBy: user1Id,
      },
      {
        invoiceNumber: 'INV-REP-006',
        vendorId: vendor2._id,
        amount: 1200,
        status: 'Paid',
        submittedDate: daysFromNow(-50),
        paidDate: daysFromNow(-47), // 3 days processing
        dueDate: daysFromNow(-36),
        submittedBy: user2Id,
      },
    ]);
  });

  describe('GET /api/reports/summary', () => {
    it('should compute overall high-level summary KPIs correctly without filters', async () => {
      const res = await request(app).get('/api/reports/summary');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        totalBilled: 5750,
        totalPaid: 2200,
        pendingBalance: 3550,
        spendPending: 1550,
        requiresApprovalCount: 1,
        flaggedCount: 1,
        scheduledDisbursements: 2000,
      });
    });

    it('should filter summary KPIs by date range (from and to)', async () => {
      // Excludes INV-REP-006 which was 50 days ago
      const res = await request(app)
        .get('/api/reports/summary')
        .query({ from: daysFromNow(-30), to: daysFromNow(0) });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        totalBilled: 4550,
        totalPaid: 1000,
        pendingBalance: 3550,
        spendPending: 1550,
        requiresApprovalCount: 1,
        flaggedCount: 1,
        scheduledDisbursements: 2000,
      });
    });

    it('should return zero metrics when date range matches no invoices', async () => {
      const res = await request(app)
        .get('/api/reports/summary')
        .query({ from: daysFromNow(100), to: daysFromNow(120) });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        totalBilled: 0,
        totalPaid: 0,
        pendingBalance: 0,
        spendPending: 0,
        requiresApprovalCount: 0,
        flaggedCount: 0,
        scheduledDisbursements: 0,
      });
    });
  });

  describe('GET /api/reports/vendor-breakdown', () => {
    it('should return per-vendor breakdown rows including cycle times and balances', async () => {
      const res = await request(app).get('/api/reports/vendor-breakdown');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(3);

      const acme = res.body.find((v) => v.vendorId === vendor1.id);
      expect(acme).toBeDefined();
      expect(acme.vendorName).toBe('Acme Corp');
      expect(acme.taxId).toBe('TX-1111');
      expect(acme.status).toBe('Active');
      expect(acme.paymentTerms).toBe('Net 30');
      expect(acme.invoiceCount).toBe(3);
      expect(acme.totalBilled).toBe(1750);
      expect(acme.totalPaid).toBe(1000);
      expect(acme.pendingBalance).toBe(750);
      expect(acme.avgProcessingDays).toBe(5.0);

      const beta = res.body.find((v) => v.vendorId === vendor2.id);
      expect(beta).toBeDefined();
      expect(beta.vendorName).toBe('Beta Logistics');
      expect(beta.invoiceCount).toBe(3);
      expect(beta.totalBilled).toBe(4000);
      expect(beta.totalPaid).toBe(1200);
      expect(beta.pendingBalance).toBe(2800);
      expect(beta.avgProcessingDays).toBe(3.0);

      const gamma = res.body.find((v) => v.vendorId === vendor3.id);
      expect(gamma).toBeDefined();
      expect(gamma.vendorName).toBe('Gamma Services');
      expect(gamma.invoiceCount).toBe(0);
      expect(gamma.totalBilled).toBe(0);
      expect(gamma.totalPaid).toBe(0);
      expect(gamma.pendingBalance).toBe(0);
      expect(gamma.avgProcessingDays).toBe(4.0); // Default 4.0 when 0 paid
    });

    it('should apply date range filter to vendor breakdown', async () => {
      const res = await request(app)
        .get('/api/reports/vendor-breakdown')
        .query({ from: daysFromNow(-30), to: daysFromNow(0) });

      expect(res.status).toBe(200);
      const beta = res.body.find((v) => v.vendorId === vendor2.id);
      expect(beta).toBeDefined();
      // INV-REP-006 excluded
      expect(beta.invoiceCount).toBe(2);
      expect(beta.totalBilled).toBe(2800);
      expect(beta.totalPaid).toBe(0);
      expect(beta.pendingBalance).toBe(2800);
      expect(beta.avgProcessingDays).toBe(4.0); // 0 paid invoices in range -> 4.0 default
    });
  });
});

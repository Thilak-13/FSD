import express from 'express';
import request from 'supertest';
import { setupTestDB } from './setup';
import reportsRouter from '../routes/reports.routes';
import { InvoiceModel } from '../models/Invoice';
import { Vendor } from '../models/Vendor';

describe('Reports & Spend Analytics Integration Tests', () => {
  setupTestDB();

  const app = express();
  app.use(express.json());
  app.use('/api/reports', reportsRouter);

  let vendor1Id: string;
  let vendor2Id: string;
  let vendor3Id: string;

  beforeEach(async () => {
    // Seed Vendors
    const v1 = await Vendor.create({
      name: 'Acme Corp',
      contactEmail: 'contact@acme.com',
      paymentTerms: 'Net 30',
      address: '100 Acme Way',
      taxId: 'TX-1111',
      status: 'Active',
    });
    vendor1Id = v1.id || (v1 as any)._id.toString();

    const v2 = await Vendor.create({
      name: 'Beta Logistics',
      contactEmail: 'info@betalogistics.com',
      paymentTerms: 'Net 15',
      address: '200 Logistics Blvd',
      taxId: 'TX-2222',
      status: 'Active',
    });
    vendor2Id = v2.id || (v2 as any)._id.toString();

    const v3 = await Vendor.create({
      name: 'Gamma Services',
      contactEmail: 'hello@gamma.com',
      paymentTerms: 'Net 45',
      address: '300 Gamma St',
      taxId: 'TX-3333',
      status: 'Under Review',
    });
    vendor3Id = v3.id || (v3 as any)._id.toString();

    // Seed Invoices
    await InvoiceModel.create([
      {
        invoiceNumber: 'INV-REP-001',
        vendorId: vendor1Id,
        amount: 1000,
        status: 'Paid',
        submittedDate: '2026-09-01',
        paidDate: '2026-09-06',
        dueDate: '2026-09-10',
        submittedBy: 'user-1',
      },
      {
        invoiceNumber: 'INV-REP-002',
        vendorId: vendor1Id,
        amount: 500,
        status: 'Submitted',
        submittedDate: '2026-09-05',
        dueDate: '2026-09-25',
        submittedBy: 'user-1',
      },
      {
        invoiceNumber: 'INV-REP-003',
        vendorId: vendor1Id,
        amount: 250,
        status: 'Flagged',
        flagReason: 'Price discrepancy with PO',
        submittedDate: '2026-09-10',
        dueDate: '2026-09-30',
        submittedBy: 'user-2',
      },
      {
        invoiceNumber: 'INV-REP-004',
        vendorId: vendor2Id,
        amount: 2000,
        status: 'Payment Scheduled',
        scheduledPaymentDate: '2026-09-22',
        submittedDate: '2026-09-12',
        dueDate: '2026-09-22',
        submittedBy: 'user-2',
      },
      {
        invoiceNumber: 'INV-REP-005',
        vendorId: vendor2Id,
        amount: 800,
        status: 'Under Verification',
        submittedDate: '2026-09-15',
        dueDate: '2026-09-28',
        submittedBy: 'user-1',
      },
      {
        invoiceNumber: 'INV-REP-006',
        vendorId: vendor2Id,
        amount: 1200,
        status: 'Paid',
        submittedDate: '2026-08-01',
        paidDate: '2026-08-04',
        dueDate: '2026-08-15',
        submittedBy: 'user-2',
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
      // Excludes INV-REP-006 which was in August 2026
      const res = await request(app)
        .get('/api/reports/summary')
        .query({ from: '2026-09-01', to: '2026-09-30' });

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
        .query({ from: '2027-01-01', to: '2027-01-31' });

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

      const acme = res.body.find((v: any) => v.vendorId === vendor1Id);
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

      const beta = res.body.find((v: any) => v.vendorId === vendor2Id);
      expect(beta).toBeDefined();
      expect(beta.vendorName).toBe('Beta Logistics');
      expect(beta.invoiceCount).toBe(3);
      expect(beta.totalBilled).toBe(4000);
      expect(beta.totalPaid).toBe(1200);
      expect(beta.pendingBalance).toBe(2800);
      expect(beta.avgProcessingDays).toBe(3.0);

      const gamma = res.body.find((v: any) => v.vendorId === vendor3Id);
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
        .query({ from: '2026-09-01', to: '2026-09-30' });

      expect(res.status).toBe(200);
      const beta = res.body.find((v: any) => v.vendorId === vendor2Id);
      expect(beta).toBeDefined();
      // August invoice (INV-REP-006) excluded
      expect(beta.invoiceCount).toBe(2);
      expect(beta.totalBilled).toBe(2800);
      expect(beta.totalPaid).toBe(0);
      expect(beta.pendingBalance).toBe(2800);
      expect(beta.avgProcessingDays).toBe(4.0); // 0 paid invoices in Sept -> 4.0 default
    });
  });
});

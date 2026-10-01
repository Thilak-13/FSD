import express, { Express } from 'express';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { setupTestDB } from './setup';
import { invoicesRouter } from '../routes/invoices.routes';
import { InvoiceModel } from '../models/Invoice';
import { AuditEntryModel } from '../models/AuditEntry';
import { config } from '../config/env';

describe('Invoices Integration Tests', () => {
  setupTestDB();

  let app: Express;
  const tempTestFiles: string[] = [];

  const approverToken = jwt.sign(
    { id: 'user-approver', name: 'Marcus Vance', role: 'Approver', email: 'marcus@payverify.local' },
    config.jwtSecret,
    { expiresIn: '1h' }
  );

  const requesterToken = jwt.sign(
    { id: 'user-requester', name: 'Elena Rodriguez', role: 'Requester', email: 'elena@payverify.local' },
    config.jwtSecret,
    { expiresIn: '1h' }
  );

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/invoices', invoicesRouter);
  });

  afterAll(() => {
    // Clean up any test files created during upload tests
    tempTestFiles.forEach((filePath) => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {
        // ignore
      }
    });
  });

  describe('POST /api/invoices (Create Invoice & Auto-Audit Trail)', () => {
    it('creates an invoice, runs verification, and records automatic SUBMISSION audit entry', async () => {
      const payload = {
        vendorId: 'vendor-1',
        amount: 2500,
        dueDate: '2026-11-15',
        submittedBy: 'Elena Rodriguez',
        notes: 'Monthly enterprise hosting',
        items: [
          {
            description: 'Cloud Server Hosting',
            quantity: 2,
            unitPrice: 1250,
          },
        ],
      };

      const res = await request(app)
        .post('/api/invoices')
        .send(payload)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.invoiceNumber).toMatch(/^INV-2026-/);
      expect(res.body.vendorId).toBe('vendor-1');
      expect(res.body.amount).toBe(2500);
      expect(res.body.status).toBe('Submitted');
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].total).toBe(2500);

      // Verify automatic SUBMISSION audit entry in DB
      const auditEntries = await AuditEntryModel.find({ invoiceId: res.body.id });
      expect(auditEntries).toHaveLength(1);
      expect(auditEntries[0].action).toBe('SUBMISSION');
      expect(auditEntries[0].performedBy).toBe('Elena Rodriguez');
      expect(auditEntries[0].details).toMatch(/submitted for amount/i);
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/invoices')
        .send({ amount: 1000 })
        .expect(400);

      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors).toContain('vendorId is required');
      expect(res.body.errors).toContain('dueDate is required');
      expect(res.body.errors).toContain('submittedBy is required');
    });

    it('flags duplicate invoice number and rejects duplicate inserts with 409', async () => {
      const firstInvoice = {
        invoiceNumber: 'INV-UNIQUE-999',
        vendorId: 'vendor-1',
        amount: 1000,
        dueDate: '2026-11-01',
        submittedBy: 'user-1',
        items: [{ description: 'Test', quantity: 1, unitPrice: 1000 }],
      };

      await request(app).post('/api/invoices').send(firstInvoice).expect(201);

      // Second attempt with exact same invoice number should return 409
      const dupRes = await request(app)
        .post('/api/invoices')
        .send(firstInvoice)
        .expect(409);

      expect(dupRes.body.message).toMatch(/duplicate invoice number/i);
    });
  });

  describe('GET /api/invoices (List with Filters & Search)', () => {
    beforeEach(async () => {
      await InvoiceModel.deleteMany({});
      await InvoiceModel.create([
        {
          invoiceNumber: 'INV-2026-001',
          vendorId: 'vendor-1',
          amount: 5000,
          dueDate: '2026-10-10',
          submittedDate: '2026-09-01',
          status: 'Submitted',
          submittedBy: 'Elena Rodriguez',
          notes: 'Quarterly hardware renewal',
          items: [{ description: 'Dell PowerEdge R750', quantity: 1, unitPrice: 5000, total: 5000 }],
        },
        {
          invoiceNumber: 'INV-2026-002',
          vendorId: 'vendor-2',
          amount: 3200,
          dueDate: '2026-10-15',
          submittedDate: '2026-09-05',
          status: 'Approved',
          submittedBy: 'Marcus Vance',
          notes: 'Logistics and freight shipping',
          items: [{ description: 'Expedited transport', quantity: 2, unitPrice: 1600, total: 3200 }],
        },
        {
          invoiceNumber: 'INV-2026-003',
          vendorId: 'vendor-1',
          amount: 1500,
          dueDate: '2026-10-20',
          submittedDate: '2026-09-12',
          status: 'Flagged',
          submittedBy: 'Elena Rodriguez',
          flagReason: 'Unit price mismatch',
          items: [{ description: 'Cloud backups', quantity: 1, unitPrice: 1500, total: 1500 }],
        },
      ]);
    });

    it('returns all invoices without filters', async () => {
      const res = await request(app).get('/api/invoices').expect(200);
      expect(res.body).toHaveLength(3);
    });

    it('filters by status', async () => {
      const res = await request(app)
        .get('/api/invoices?status=Approved')
        .expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].invoiceNumber).toBe('INV-2026-002');
    });

    it('filters by vendorId', async () => {
      const res = await request(app)
        .get('/api/invoices?vendorId=vendor-1')
        .expect(200);
      expect(res.body).toHaveLength(2);
    });

    it('filters by submittedBy', async () => {
      const res = await request(app)
        .get('/api/invoices?submittedBy=Marcus Vance')
        .expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].invoiceNumber).toBe('INV-2026-002');
    });

    it('filters by date range (startDate and endDate)', async () => {
      const res = await request(app)
        .get('/api/invoices?startDate=2026-09-02&endDate=2026-09-10')
        .expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].invoiceNumber).toBe('INV-2026-002');
    });

    it('searches by invoiceNumber or item description', async () => {
      const res1 = await request(app)
        .get('/api/invoices?search=PowerEdge')
        .expect(200);
      expect(res1.body).toHaveLength(1);
      expect(res1.body[0].invoiceNumber).toBe('INV-2026-001');

      const res2 = await request(app)
        .get('/api/invoices?search=003')
        .expect(200);
      expect(res2.body).toHaveLength(1);
      expect(res2.body[0].invoiceNumber).toBe('INV-2026-003');
    });
  });

  describe('GET /api/invoices/:id', () => {
    it('returns an invoice by its ID', async () => {
      const created = await InvoiceModel.create({
        invoiceNumber: 'INV-FIND-001',
        vendorId: 'vendor-1',
        amount: 800,
        dueDate: '2026-10-10',
        submittedDate: '2026-09-01',
        status: 'Submitted',
        submittedBy: 'user-1',
        items: [],
      });

      const res = await request(app)
        .get(`/api/invoices/${created._id.toString()}`)
        .expect(200);

      expect(res.body.id).toBe(created._id.toString());
      expect(res.body.invoiceNumber).toBe('INV-FIND-001');
    });

    it('returns 404 for a non-existent invoice ID', async () => {
      const nonExistentId = '66f000000000000000000000';
      const res = await request(app)
        .get(`/api/invoices/${nonExistentId}`)
        .expect(404);

      expect(res.body.message).toMatch(/not found/i);
    });
  });

  describe('PATCH /api/invoices/:id/status (Role-based Transitions & Auto-Audit)', () => {
    let testInvoiceId: string;

    beforeEach(async () => {
      await InvoiceModel.deleteMany({});
      await AuditEntryModel.deleteMany({});
      const invoice = await InvoiceModel.create({
        invoiceNumber: 'INV-STATUS-001',
        vendorId: 'vendor-1',
        amount: 4500,
        dueDate: '2026-10-15',
        submittedDate: '2026-09-10',
        status: 'Submitted',
        submittedBy: 'Elena Rodriguez',
        items: [],
      });
      testInvoiceId = invoice._id.toString();
    });

    it('rejects with 401 when no auth is provided', async () => {
      const res = await request(app)
        .patch(`/api/invoices/${testInvoiceId}/status`)
        .send({ status: 'Approved' })
        .expect(401);

      expect(res.body.message).toMatch(/authentication required/i);
    });

    it('rejects with 403 when role is Requester', async () => {
      const res = await request(app)
        .patch(`/api/invoices/${testInvoiceId}/status`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({ status: 'Approved' })
        .expect(403);

      expect(res.body.message).toMatch(/approver or admin/i);
    });

    it('approves an invoice and records APPROVAL audit entry', async () => {
      const res = await request(app)
        .patch(`/api/invoices/${testInvoiceId}/status`)
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          status: 'Approved',
          comment: 'All 3-way match line items verified against PO',
        })
        .expect(200);

      expect(res.body.status).toBe('Approved');

      // Verify APPROVAL audit entry
      const audit = await AuditEntryModel.findOne({
        invoiceId: testInvoiceId,
        action: 'APPROVAL',
      });
      expect(audit).not.toBeNull();
      expect(audit?.performedBy).toBe('Marcus Vance');
      expect(audit?.details).toBe('All 3-way match line items verified against PO');
    });

    it('schedules payment and records PAYMENT_SCHEDULED audit entry', async () => {
      const res = await request(app)
        .patch(`/api/invoices/${testInvoiceId}/status`)
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          status: 'Payment Scheduled',
          scheduledPaymentDate: '2026-10-25',
          comment: 'Disbursement scheduled via ACH',
        })
        .expect(200);

      expect(res.body.status).toBe('Payment Scheduled');
      expect(res.body.scheduledPaymentDate).toBe('2026-10-25');

      const audit = await AuditEntryModel.findOne({
        invoiceId: testInvoiceId,
        action: 'PAYMENT_SCHEDULED',
      });
      expect(audit).not.toBeNull();
      expect(audit?.details).toBe('Disbursement scheduled via ACH');
    });

    it('marks as paid and records PAYMENT_COMPLETED audit entry', async () => {
      const res = await request(app)
        .patch(`/api/invoices/${testInvoiceId}/status`)
        .set('x-user-role', 'Admin')
        .set('x-user-name', 'Finance Admin')
        .send({
          status: 'Paid',
          paidDate: '2026-10-26',
          comment: 'Wire transfer confirmed #WT-8947',
        })
        .expect(200);

      expect(res.body.status).toBe('Paid');
      expect(res.body.paidDate).toBe('2026-10-26');

      const audit = await AuditEntryModel.findOne({
        invoiceId: testInvoiceId,
        action: 'PAYMENT_COMPLETED',
      });
      expect(audit).not.toBeNull();
      expect(audit?.performedBy).toBe('Finance Admin');
    });

    it('flags an invoice with reason and records FLAGGED audit entry', async () => {
      const res = await request(app)
        .patch(`/api/invoices/${testInvoiceId}/status`)
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          status: 'Flagged',
          flagReason: 'Invoice rate exceeds approved PO contract rate',
        })
        .expect(200);

      expect(res.body.status).toBe('Flagged');
      expect(res.body.flagReason).toBe('Invoice rate exceeds approved PO contract rate');

      const audit = await AuditEntryModel.findOne({
        invoiceId: testInvoiceId,
        action: 'FLAGGED',
      });
      expect(audit).not.toBeNull();
      expect(audit?.details).toBe('Invoice rate exceeds approved PO contract rate');
    });
  });

  describe('POST /api/invoices/:id/attachment (Multer File Upload)', () => {
    let testInvoiceId: string;
    const sampleFilePath = path.resolve(__dirname, 'sample-test-invoice.pdf');

    beforeAll(() => {
      fs.writeFileSync(sampleFilePath, '%PDF-1.4 sample pdf content for automated testing');
    });

    afterAll(() => {
      if (fs.existsSync(sampleFilePath)) {
        fs.unlinkSync(sampleFilePath);
      }
    });

    beforeEach(async () => {
      const invoice = await InvoiceModel.create({
        invoiceNumber: 'INV-UPLOAD-001',
        vendorId: 'vendor-1',
        amount: 2000,
        dueDate: '2026-10-15',
        submittedDate: '2026-09-10',
        status: 'Submitted',
        submittedBy: 'user-1',
        items: [],
      });
      testInvoiceId = invoice._id.toString();
    });

    it('uploads a file attachment and updates invoice attachedDocumentName and attachedDocumentPath', async () => {
      const res = await request(app)
        .post(`/api/invoices/${testInvoiceId}/attachment`)
        .attach('file', sampleFilePath)
        .expect(200);

      expect(res.body.attachedDocumentName).toBe('sample-test-invoice.pdf');
      expect(res.body.attachedDocumentPath).toMatch(/^\/uploads\//);
      expect(res.body.documentName).toBe('sample-test-invoice.pdf');
      expect(res.body.documentPath).toMatch(/^\/uploads\//);

      // Verify the uploaded file physically exists in the uploads folder
      const filename = path.basename(res.body.attachedDocumentPath);
      const diskPath = path.resolve(config.uploadDir, filename);
      expect(fs.existsSync(diskPath)).toBe(true);
      tempTestFiles.push(diskPath);

      // Verify database record
      const dbInvoice = await InvoiceModel.findById(testInvoiceId);
      expect(dbInvoice?.attachedDocumentName).toBe('sample-test-invoice.pdf');
      expect(dbInvoice?.attachedDocumentPath).toBe(res.body.attachedDocumentPath);
    });

    it('returns 400 when no file is included in request', async () => {
      const res = await request(app)
        .post(`/api/invoices/${testInvoiceId}/attachment`)
        .expect(400);

      expect(res.body.message).toMatch(/no file uploaded/i);
    });
  });
});

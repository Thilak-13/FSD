import express, { Express } from 'express';
import request from 'supertest';
import { setupTestDB } from './setup';
import { auditLogRouter } from '../routes/auditLog.routes';
import { AuditEntryModel } from '../models/AuditEntry';
import { recordAuditEntry } from '../services/audit.service';

describe('Audit Log Integration Tests', () => {
  setupTestDB();

  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/audit-log', auditLogRouter);
  });

  beforeEach(async () => {
    await AuditEntryModel.deleteMany({});
    // Seed sample audit entries
    await AuditEntryModel.create([
      {
        invoiceId: 'inv-100',
        action: 'SUBMISSION',
        performedBy: 'Elena Rodriguez',
        timestamp: '2026-09-02T09:30:00.000Z',
        details: 'Invoice INV-2026-100 submitted for Apex Cloud Services',
      },
      {
        invoiceId: 'inv-100',
        action: 'VERIFICATION',
        performedBy: 'System Auto-Matcher',
        timestamp: '2026-09-02T09:31:00.000Z',
        details: '3-way match verified against PO-2026-001',
      },
      {
        invoiceId: 'inv-100',
        action: 'APPROVAL',
        performedBy: 'Marcus Vance',
        timestamp: '2026-09-03T14:00:00.000Z',
        details: 'Approved following line-item price verification',
      },
      {
        invoiceId: 'inv-200',
        action: 'SUBMISSION',
        performedBy: 'Elena Rodriguez',
        timestamp: '2026-09-05T10:15:00.000Z',
        details: 'Invoice INV-2026-200 submitted for Northwest Logistics',
      },
      {
        invoiceId: 'inv-200',
        action: 'FLAGGED',
        performedBy: 'Marcus Vance',
        timestamp: '2026-09-06T11:00:00.000Z',
        details: 'Quantity overbill: invoiced quantity exceeds PO limit',
      },
      {
        invoiceId: 'inv-300',
        action: 'PAYMENT_SCHEDULED',
        performedBy: 'Sarah Chen',
        timestamp: '2026-09-07T08:45:00.000Z',
        details: 'Scheduled payment date set to 2026-09-20',
      },
      {
        invoiceId: 'inv-300',
        action: 'PAYMENT_COMPLETED',
        performedBy: 'Sarah Chen',
        timestamp: '2026-09-20T16:30:00.000Z',
        details: 'Settlement confirmed via ACH transfer',
      },
    ]);
  });

  it('retrieves all audit log entries when no filters are provided', async () => {
    const res = await request(app).get('/api/audit-log').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(7);
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0]).toHaveProperty('action');
    expect(res.body[0]).toHaveProperty('timestamp');
  });

  it('queries audit trail filtered by invoiceId', async () => {
    const res = await request(app)
      .get('/api/audit-log?invoiceId=inv-100')
      .expect(200);

    expect(res.body).toHaveLength(3);
    res.body.forEach((entry: any) => {
      expect(entry.invoiceId).toBe('inv-100');
    });
  });

  it('queries audit trail filtered by action', async () => {
    const res = await request(app)
      .get('/api/audit-log?action=SUBMISSION')
      .expect(200);

    expect(res.body).toHaveLength(2);
    res.body.forEach((entry: any) => {
      expect(entry.action).toBe('SUBMISSION');
    });
  });

  it('queries audit trail filtered by user (performedBy)', async () => {
    const res = await request(app)
      .get('/api/audit-log?user=Sarah Chen')
      .expect(200);

    expect(res.body).toHaveLength(2);
    res.body.forEach((entry: any) => {
      expect(entry.performedBy).toBe('Sarah Chen');
    });
  });

  it('supports combining filters: invoiceId and action', async () => {
    const res = await request(app)
      .get('/api/audit-log?invoiceId=inv-100&action=APPROVAL')
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].invoiceId).toBe('inv-100');
    expect(res.body[0].action).toBe('APPROVAL');
    expect(res.body[0].performedBy).toBe('Marcus Vance');
  });

  it('records audit entry programmatically using recordAuditEntry service', async () => {
    const created = await recordAuditEntry(
      'inv-400',
      'SUBMISSION',
      'Alex Johnson',
      'Direct API programmatic audit trail'
    );

    expect(created.id).toBeDefined();
    expect(created.invoiceId).toBe('inv-400');
    expect(created.action).toBe('SUBMISSION');
    expect(created.performedBy).toBe('Alex Johnson');
    expect(created.details).toBe('Direct API programmatic audit trail');

    // Query via endpoint
    const res = await request(app)
      .get('/api/audit-log?invoiceId=inv-400')
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].performedBy).toBe('Alex Johnson');
  });
});

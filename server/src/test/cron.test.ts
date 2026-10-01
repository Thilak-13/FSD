import { setupTestDB } from './setup';
import { InvoiceModel } from '../models/Invoice';
import { User } from '../models/User';
import { runInvoiceReminderScan, initCronJobs, stopCronJobs } from '../services/cron.service';
import { getLastSentMail, resetTransporter } from '../services/mailer.service';

describe('Scheduled Cron Job & Nodemailer Mailer Integration Tests', () => {
  setupTestDB();

  const now = new Date();
  const formatIso = (d: Date) => d.toISOString().split('T')[0];
  const offsetDate = (days: number) => {
    return formatIso(new Date(now.getTime() + days * 24 * 60 * 60 * 1000));
  };

  beforeEach(() => {
    resetTransporter();
  });

  afterEach(() => {
    stopCronJobs();
  });

  it('should scan database, detect pending/dueSoon/overdue invoices, and send alert email', async () => {
    // Seed Admin user
    await User.create({
      name: 'System Admin',
      email: 'admin@payverify.test',
      passwordHash: 'hashedpwd',
      role: 'Admin',
    });

    // Seed alert-triggering invoices
    await InvoiceModel.create([
      {
        invoiceNumber: 'INV-CRON-OVERDUE',
        vendorId: 'vendor-1',
        amount: 3000,
        status: 'Approved',
        submittedDate: offsetDate(-10),
        dueDate: offsetDate(-4),
        submittedBy: 'user-1',
      },
      {
        invoiceNumber: 'INV-CRON-DUESOON',
        vendorId: 'vendor-1',
        amount: 1200,
        status: 'Approved',
        submittedDate: offsetDate(-2),
        dueDate: offsetDate(3),
        submittedBy: 'user-1',
      },
      {
        invoiceNumber: 'INV-CRON-PENDING',
        vendorId: 'vendor-2',
        amount: 850,
        status: 'Under Verification',
        submittedDate: offsetDate(-5),
        dueDate: offsetDate(25),
        submittedBy: 'user-2',
      },
      {
        invoiceNumber: 'INV-CRON-PAID',
        vendorId: 'vendor-2',
        amount: 5000,
        status: 'Paid',
        submittedDate: offsetDate(-20),
        dueDate: offsetDate(-10),
        paidDate: offsetDate(-9),
        submittedBy: 'user-1',
      },
    ]);

    const result = await runInvoiceReminderScan(now);

    expect(result.totalScanned).toBe(3); // Paid invoice excluded from scan query
    expect(result.overdueCount).toBe(1);
    expect(result.dueSoonCount).toBe(1);
    expect(result.pendingCount).toBe(1);
    expect(result.emailSent).toBe(true);
    expect(result.recipient).toBe('admin@payverify.test');
    expect(result.subject).toContain('PayVerify Daily Alert: 1 Overdue, 1 Due Soon, 1 Pending Approval');

    // Check last sent email captured by Nodemailer transport
    const lastEmail = getLastSentMail();
    expect(lastEmail).toBeDefined();
    expect(lastEmail.options.to).toBe('admin@payverify.test');
    expect(lastEmail.options.subject).toBe(result.subject);
    expect(lastEmail.options.html).toContain('INV-CRON-OVERDUE');
    expect(lastEmail.options.html).toContain('INV-CRON-DUESOON');
    expect(lastEmail.options.html).toContain('INV-CRON-PENDING');
    expect(lastEmail.options.html).not.toContain('INV-CRON-PAID');
    expect(lastEmail.options.text).toContain('INV-CRON-OVERDUE');
  });

  it('should support explicit recipient override', async () => {
    await InvoiceModel.create({
      invoiceNumber: 'INV-CRON-URGENT',
      vendorId: 'vendor-1',
      amount: 400,
      status: 'Submitted',
      submittedDate: offsetDate(-7),
      dueDate: offsetDate(1),
      submittedBy: 'user-1',
    });

    const result = await runInvoiceReminderScan(now, 'finance-lead@custom.org');
    expect(result.emailSent).toBe(true);
    expect(result.recipient).toBe('finance-lead@custom.org');

    const lastEmail = getLastSentMail();
    expect(lastEmail.options.to).toBe('finance-lead@custom.org');
  });

  it('should not dispatch email if there are zero alerts', async () => {
    // Only paid invoice in database
    await InvoiceModel.create({
      invoiceNumber: 'INV-CRON-ALLCLEAN',
      vendorId: 'vendor-1',
      amount: 500,
      status: 'Paid',
      submittedDate: offsetDate(-10),
      dueDate: offsetDate(-5),
      paidDate: offsetDate(-4),
      submittedBy: 'user-1',
    });

    const result = await runInvoiceReminderScan(now);
    expect(result.emailSent).toBe(false);
    expect(result.pendingCount).toBe(0);
    expect(result.dueSoonCount).toBe(0);
    expect(result.overdueCount).toBe(0);

    const lastEmail = getLastSentMail();
    expect(lastEmail).toBeNull();
  });

  it('should successfully initialize and stop scheduled cron jobs', () => {
    const task = initCronJobs();
    expect(task).toBeDefined();

    // Calling stopCronJobs terminates the job cleanly
    expect(() => stopCronJobs()).not.toThrow();
  });
});

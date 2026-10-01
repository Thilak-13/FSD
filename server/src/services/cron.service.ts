import cron, { ScheduledTask } from 'node-cron';
import { InvoiceModel } from '../models/Invoice';
import { User } from '../models/User';
import { config } from '../config/env';
import { sendReminderEmail } from './mailer.service';

let scheduledCronTask: ScheduledTask | null = null;

export interface InvoiceReminderScanResult {
  totalScanned: number;
  pendingCount: number;
  dueSoonCount: number;
  overdueCount: number;
  emailSent: boolean;
  recipient?: string;
  subject?: string;
  alerts: {
    pending: Array<{ invoiceNumber: string; amount: number; submittedDate: string; daysPending: number }>;
    dueSoon: Array<{ invoiceNumber: string; amount: number; dueDate: string; daysUntilDue: number }>;
    overdue: Array<{ invoiceNumber: string; amount: number; dueDate: string; daysOverdue: number }>;
  };
}

/**
 * Scans the database for invoices requiring attention:
 * - Pending approval > 3 days (Submitted / Under Verification)
 * - Due within 0 to 5 days
 * - Overdue (dueDate past today and not Paid)
 * Prepares an email alert summary and dispatches via sendReminderEmail.
 */
export const runInvoiceReminderScan = async (
  referenceDate?: Date,
  recipientOverride?: string
): Promise<InvoiceReminderScanResult> => {
  const allInvoices = await InvoiceModel.find({ status: { $ne: 'Paid' } }).lean();

  const refDate = referenceDate || new Date();
  const refTime = refDate.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const pending: Array<{ invoiceNumber: string; amount: number; submittedDate: string; daysPending: number }> = [];
  const dueSoon: Array<{ invoiceNumber: string; amount: number; dueDate: string; daysUntilDue: number }> = [];
  const overdue: Array<{ invoiceNumber: string; amount: number; dueDate: string; daysOverdue: number }> = [];

  for (const inv of allInvoices) {
    const submittedTime = new Date(inv.submittedDate).getTime();
    const dueTime = new Date(inv.dueDate).getTime();
    const daysSinceSubmission = Math.floor((refTime - submittedTime) / oneDayMs);
    const daysUntilDue = Math.ceil((dueTime - refTime) / oneDayMs);

    // 1. Overdue
    if (daysUntilDue < 0) {
      overdue.push({
        invoiceNumber: inv.invoiceNumber,
        amount: inv.amount,
        dueDate: inv.dueDate,
        daysOverdue: Math.abs(daysUntilDue),
      });
    }

    // 2. Due soon (0 to 5 days)
    if (daysUntilDue >= 0 && daysUntilDue <= 5) {
      dueSoon.push({
        invoiceNumber: inv.invoiceNumber,
        amount: inv.amount,
        dueDate: inv.dueDate,
        daysUntilDue,
      });
    }

    // 3. Pending approval > 3 days
    if (
      (inv.status === 'Submitted' || inv.status === 'Under Verification') &&
      daysSinceSubmission > 3
    ) {
      pending.push({
        invoiceNumber: inv.invoiceNumber,
        amount: inv.amount,
        submittedDate: inv.submittedDate,
        daysPending: daysSinceSubmission,
      });
    }
  }

  const hasAlerts = pending.length > 0 || dueSoon.length > 0 || overdue.length > 0;
  let emailSent = false;
  let recipient = recipientOverride;
  let subject = '';

  if (hasAlerts) {
    // Resolve email recipient
    if (!recipient) {
      const adminUsers = await User.find({ role: 'Admin' }).lean();
      if (adminUsers.length > 0 && adminUsers[0].email) {
        recipient = adminUsers[0].email;
      } else {
        recipient = config.smtp.user || 'admin@payverify.local';
      }
    }

    subject = `PayVerify Daily Alert: ${overdue.length} Overdue, ${dueSoon.length} Due Soon, ${pending.length} Pending Approval`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #1a56db; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
          PayVerify Daily Invoice Reminder Summary
        </h2>
        <p>The following invoices require attention as of ${refDate.toISOString().split('T')[0]}:</p>

        ${
          overdue.length > 0
            ? `
          <h3 style="color: #dc2626;">Overdue Invoices (${overdue.length})</h3>
          <ul>
            ${overdue
              .map(
                (item) =>
                  `<li><strong>Invoice ${item.invoiceNumber}</strong>: $${item.amount.toFixed(
                    2
                  )} is overdue by ${item.daysOverdue} day(s) (due ${item.dueDate})</li>`
              )
              .join('')}
          </ul>`
            : ''
        }

        ${
          dueSoon.length > 0
            ? `
          <h3 style="color: #d97706;">Invoices Due Soon (${dueSoon.length})</h3>
          <ul>
            ${dueSoon
              .map(
                (item) =>
                  `<li><strong>Invoice ${item.invoiceNumber}</strong>: $${item.amount.toFixed(
                    2
                  )} is due in ${item.daysUntilDue} day(s) (due ${item.dueDate})</li>`
              )
              .join('')}
          </ul>`
            : ''
        }

        ${
          pending.length > 0
            ? `
          <h3 style="color: #4b5563;">Pending Verification & Approval > 3 Days (${pending.length})</h3>
          <ul>
            ${pending
              .map(
                (item) =>
                  `<li><strong>Invoice ${item.invoiceNumber}</strong>: $${item.amount.toFixed(
                    2
                  )} pending approval for ${item.daysPending} day(s)</li>`
              )
              .join('')}
          </ul>`
            : ''
        }

        <p style="margin-top: 24px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 8px;">
          This is an automated alert from the PayVerify scheduled monitoring engine.
        </p>
      </div>
    `;

    const text = [
      `PayVerify Daily Invoice Reminder Summary (${refDate.toISOString().split('T')[0]})`,
      overdue.length > 0
        ? `Overdue (${overdue.length}):\n` +
          overdue
            .map((i) => `- Invoice ${i.invoiceNumber}: $${i.amount.toFixed(2)} (${i.daysOverdue}d overdue)`)
            .join('\n')
        : '',
      dueSoon.length > 0
        ? `Due Soon (${dueSoon.length}):\n` +
          dueSoon
            .map((i) => `- Invoice ${i.invoiceNumber}: $${i.amount.toFixed(2)} (${i.daysUntilDue}d until due)`)
            .join('\n')
        : '',
      pending.length > 0
        ? `Pending Approval > 3d (${pending.length}):\n` +
          pending
            .map((i) => `- Invoice ${i.invoiceNumber}: $${i.amount.toFixed(2)} (${i.daysPending}d pending)`)
            .join('\n')
        : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const targetRecipient = recipient || config.smtp.user || 'admin@payverify.local';
    recipient = targetRecipient;
    await sendReminderEmail(targetRecipient, subject, html, text);
    emailSent = true;
  }

  return {
    totalScanned: allInvoices.length,
    pendingCount: pending.length,
    dueSoonCount: dueSoon.length,
    overdueCount: overdue.length,
    emailSent,
    recipient,
    subject: hasAlerts ? subject : undefined,
    alerts: {
      pending,
      dueSoon,
      overdue,
    },
  };
};

/**
 * Initializes the background scheduled cron job for daily reminders.
 */
export const initCronJobs = (): ScheduledTask => {
  if (scheduledCronTask) {
    scheduledCronTask.stop();
  }

  const rawSchedule = config.reminderCronSchedule || '0 8 * * *';
  const schedule = cron.validate(rawSchedule) ? rawSchedule : '0 8 * * *';

  scheduledCronTask = cron.schedule(schedule, async () => {
    try {
      await runInvoiceReminderScan();
    } catch (error) {
      console.error('Error running scheduled invoice reminder scan:', error);
    }
  });

  return scheduledCronTask;
};

/**
 * Stops and unregisters the active cron job.
 */
export const stopCronJobs = (): void => {
  if (scheduledCronTask) {
    scheduledCronTask.stop();
    scheduledCronTask = null;
  }
};

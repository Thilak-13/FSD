const cron = require('node-cron');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const { sendEmail } = require('../services/emailService');
const env = require('../config/env');

let scheduledCronTask = null;

/**
 * Scans the database for invoices requiring attention:
 * - Pending approval > 3 days (Submitted / Under Verification)
 * - Due within 0 to 5 days
 * - Overdue (dueDate past reference date and not Paid)
 *
 * Sends a summary reminder email if any actionable invoices are detected.
 *
 * @param {Date} [referenceDate] - Optional date reference (default new Date())
 * @param {string} [recipientOverride] - Optional override email recipient
 * @returns {Promise<object>} Summary of the scan results
 */
const runReminderScan = async (referenceDate, recipientOverride) => {
  const allInvoices = await Invoice.find({ status: { $ne: 'Paid' } }).lean();

  const ref = referenceDate ? new Date(referenceDate) : new Date();
  const refTime = ref.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const pending = [];
  const dueSoon = [];
  const overdue = [];

  for (const inv of allInvoices) {
    const submittedDateObj = inv.submittedDate
      ? new Date(inv.submittedDate)
      : new Date();
    const dueDateObj = inv.dueDate ? new Date(inv.dueDate) : new Date();

    const submittedTime = submittedDateObj.getTime();
    const dueTime = dueDateObj.getTime();

    const daysSinceSubmission = Math.floor((refTime - submittedTime) / oneDayMs);
    const daysUntilDue = Math.ceil((dueTime - refTime) / oneDayMs);

    const formattedDueDate = dueDateObj.toISOString().split('T')[0];
    const invNumber = inv.invoiceNumber || (inv.id || inv._id?.toString());

    // 1. Overdue (status !== 'Paid' and daysUntilDue < 0)
    if (daysUntilDue < 0) {
      overdue.push({
        invoiceNumber: invNumber,
        amount: Number(inv.amount) || 0,
        dueDate: formattedDueDate,
        daysOverdue: Math.abs(daysUntilDue),
      });
    }

    // 2. Due soon (0 to 5 days)
    if (daysUntilDue >= 0 && daysUntilDue <= 5) {
      dueSoon.push({
        invoiceNumber: invNumber,
        amount: Number(inv.amount) || 0,
        dueDate: formattedDueDate,
        daysUntilDue,
      });
    }

    // 3. Pending approval > 3 days
    if (
      (inv.status === 'Submitted' || inv.status === 'Under Verification') &&
      daysSinceSubmission > 3
    ) {
      pending.push({
        invoiceNumber: invNumber,
        amount: Number(inv.amount) || 0,
        submittedDate: submittedDateObj.toISOString().split('T')[0],
        daysPending: daysSinceSubmission,
      });
    }
  }

  const hasAlerts =
    pending.length > 0 || dueSoon.length > 0 || overdue.length > 0;
  let emailSent = false;
  let recipient = recipientOverride;
  let subject;
  let mailResult;

  if (hasAlerts) {
    // Resolve email recipient
    if (!recipient) {
      try {
        const adminUser = await User.findOne({ role: 'Admin' }).lean();
        if (adminUser && adminUser.email) {
          recipient = adminUser.email;
        }
      } catch {
        // user query fallback
      }

      if (!recipient) {
        recipient =
          env.SMTP_USER || process.env.SMTP_USER || 'admin@payverify.local';
      }
    }

    subject = `PayVerify Daily Alert: ${overdue.length} Overdue, ${dueSoon.length} Due Soon, ${pending.length} Pending Approval`;

    const formattedRefDate = ref.toISOString().split('T')[0];

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #1a56db; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
          PayVerify Daily Invoice Reminder Summary
        </h2>
        <p>The following invoices require attention as of ${formattedRefDate}:</p>

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
      `PayVerify Daily Invoice Reminder Summary (${formattedRefDate})`,
      overdue.length > 0
        ? `Overdue (${overdue.length}):\n` +
          overdue
            .map(
              (i) =>
                `- Invoice ${i.invoiceNumber}: $${i.amount.toFixed(2)} (${
                  i.daysOverdue
                }d overdue)`
            )
            .join('\n')
        : '',
      dueSoon.length > 0
        ? `Due Soon (${dueSoon.length}):\n` +
          dueSoon
            .map(
              (i) =>
                `- Invoice ${i.invoiceNumber}: $${i.amount.toFixed(2)} (${
                  i.daysUntilDue
                }d until due)`
            )
            .join('\n')
        : '',
      pending.length > 0
        ? `Pending Approval > 3d (${pending.length}):\n` +
          pending
            .map(
              (i) =>
                `- Invoice ${i.invoiceNumber}: $${i.amount.toFixed(2)} (${
                  i.daysPending
                }d pending)`
            )
            .join('\n')
        : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    mailResult = await sendEmail({
      to: recipient,
      subject,
      html,
      text,
    });
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
    mailResult: hasAlerts ? mailResult : undefined,
    alerts: {
      pending,
      dueSoon,
      overdue,
    },
  };
};

/**
 * Initializes and starts the background scheduled cron job for daily reminders.
 *
 * @param {string} [scheduleExpression='0 8 * * *'] - Cron pattern
 * @returns {cron.ScheduledTask} Active scheduled task
 */
const initReminderCron = (scheduleExpression = '0 8 * * *') => {
  if (scheduledCronTask) {
    scheduledCronTask.stop();
  }

  const validSchedule = cron.validate(scheduleExpression)
    ? scheduleExpression
    : '0 8 * * *';

  scheduledCronTask = cron.schedule(validSchedule, async () => {
    try {
      await runReminderScan();
    } catch (err) {
      console.error('Error executing scheduled reminder scan:', err);
    }
  });

  return scheduledCronTask;
};

/**
 * Stops and tears down the active cron task.
 */
const stopReminderCron = () => {
  if (scheduledCronTask) {
    scheduledCronTask.stop();
    scheduledCronTask = null;
  }
};

module.exports = {
  initReminderCron,
  stopReminderCron,
  runReminderScan,
  initCronJobs: initReminderCron,
  stopCronJobs: stopReminderCron,
  runInvoiceReminderScan: runReminderScan,
};

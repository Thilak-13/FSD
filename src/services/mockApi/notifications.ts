import { Notification } from '../../types';
import { simulateDelay } from './delay';
import { getInvoices } from './invoices';

const readNotificationIds = new Set<string>();

export const resetReadNotifications = (): void => {
  readNotificationIds.clear();
};

export const markNotificationAsRead = async (id: string): Promise<void> => {
  await simulateDelay();
  readNotificationIds.add(id);
};

export const markAllNotificationsAsRead = async (
  _userId?: string
): Promise<void> => {
  await simulateDelay();
  // Mark all currently derived notifications as read
  const notifications = await getNotifications();
  for (const n of notifications) {
    readNotificationIds.add(n.id);
  }
};

const getReferenceDate = (): Date => {
  const now = new Date();
  if (now.getFullYear() === 2026) {
    return now;
  }
  return new Date('2026-09-15T12:00:00Z');
};

/**
 * Derives dynamic notifications at runtime based on active invoice states:
 * - Pending approval > 3 days
 * - Due within 5 days
 * - Overdue (past dueDate and not Paid)
 * - Flagged with discrepancies
 */
export const getNotifications = async (
  userId?: string
): Promise<Notification[]> => {
  await simulateDelay();

  // Call internal store without filters to derive from complete invoice ledger
  const allInvoices = await getInvoices();
  const refDate = getReferenceDate();
  const refTime = refDate.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const derived: Notification[] = [];

  for (const invoice of allInvoices) {
    // If userId filter is applied, only consider invoices submitted by this user (or approvers)
    if (userId && invoice.submittedBy !== userId) {
      continue;
    }

    const submittedTime = new Date(invoice.submittedDate).getTime();
    const dueTime = new Date(invoice.dueDate).getTime();
    const daysSinceSubmission = Math.floor((refTime - submittedTime) / oneDayMs);
    const daysUntilDue = Math.ceil((dueTime - refTime) / oneDayMs);

    // 1. Flagged notification
    if (invoice.status === 'Flagged') {
      const notifId = `notif-flagged-${invoice.id}`;
      derived.push({
        id: notifId,
        type: 'flagged',
        invoiceId: invoice.id,
        message: `Invoice ${invoice.invoiceNumber} was flagged: ${
          invoice.flagReason || 'Requires discrepancy review'
        }`,
        read: readNotificationIds.has(notifId),
        createdAt: invoice.submittedDate,
        userId: invoice.submittedBy,
      });
    }

    // 2. Overdue notification
    if (invoice.status !== 'Paid' && daysUntilDue < 0) {
      const notifId = `notif-overdue-${invoice.id}`;
      derived.push({
        id: notifId,
        type: 'overdue',
        invoiceId: invoice.id,
        message: `Invoice ${invoice.invoiceNumber} is overdue by ${Math.abs(
          daysUntilDue
        )} day(s) (due ${invoice.dueDate})`,
        read: readNotificationIds.has(notifId),
        createdAt: invoice.dueDate,
        userId: invoice.submittedBy,
      });
    }

    // 3. Due soon notification (0 <= daysUntilDue <= 5)
    if (
      invoice.status !== 'Paid' &&
      daysUntilDue >= 0 &&
      daysUntilDue <= 5
    ) {
      const notifId = `notif-duesoon-${invoice.id}`;
      derived.push({
        id: notifId,
        type: 'due_soon',
        invoiceId: invoice.id,
        message: `Invoice ${invoice.invoiceNumber} is due in ${daysUntilDue} day(s) (${invoice.dueDate})`,
        read: readNotificationIds.has(notifId),
        createdAt: invoice.submittedDate,
        userId: invoice.submittedBy,
      });
    }

    // 4. Pending approval > 3 days
    if (
      (invoice.status === 'Submitted' ||
        invoice.status === 'Under Verification') &&
      daysSinceSubmission > 3
    ) {
      const notifId = `notif-pending-${invoice.id}`;
      derived.push({
        id: notifId,
        type: 'pending_approval',
        invoiceId: invoice.id,
        message: `Invoice ${invoice.invoiceNumber} has been pending approval for ${daysSinceSubmission} days`,
        read: readNotificationIds.has(notifId),
        createdAt: invoice.submittedDate,
        userId: invoice.submittedBy,
      });
    }
  }

  // Sort descending by creation date
  return derived.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

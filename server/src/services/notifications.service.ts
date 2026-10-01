import { InvoiceModel } from '../models/Invoice';
import { Notification, Role } from '../types';

const readNotificationIds = new Set<string>();

export const resetReadNotifications = (): void => {
  readNotificationIds.clear();
};

export const markNotificationAsRead = (id: string): void => {
  readNotificationIds.add(id);
};

export const markAllNotificationsAsRead = async (
  userId?: string,
  userRole?: Role,
  referenceDate?: Date
): Promise<void> => {
  const notifications = await getDynamicNotifications(
    userId ? { id: userId, role: userRole || 'Requester' } : undefined,
    referenceDate
  );
  for (const n of notifications) {
    readNotificationIds.add(n.id);
  }
};

/**
 * Derives dynamic notifications at runtime based on active invoice states:
 * - Pending approval > 3 days (status in ['Submitted', 'Under Verification'])
 * - Due within 0 to 5 days (status !== 'Paid')
 * - Overdue (dueDate < today / daysUntilDue < 0, status !== 'Paid')
 * - Flagged (status === 'Flagged')
 *
 * Role-aware filtering:
 * - Admin and Approver: receive notifications across all invoices
 * - Requester: only receives notifications for invoices where submittedBy === user.id
 * - Undefined user: returns all notifications
 */
export const getDynamicNotifications = async (
  user?: { id: string; role: Role } | null,
  referenceDate?: Date
): Promise<Notification[]> => {
  const allInvoices = await InvoiceModel.find().lean();
  const refDate = referenceDate || new Date();
  const refTime = refDate.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const isPrivileged = user?.role === 'Admin' || user?.role === 'Approver';
  const derived: Notification[] = [];

  for (const invoice of allInvoices) {
    const invId = invoice.id || (invoice as any)._id?.toString();

    // If user is Requester (or non-privileged with an id), filter by submittedBy
    if (user && !isPrivileged && invoice.submittedBy !== user.id) {
      continue;
    }

    const submittedTime = new Date(invoice.submittedDate).getTime();
    const dueTime = new Date(invoice.dueDate).getTime();
    const daysSinceSubmission = Math.floor((refTime - submittedTime) / oneDayMs);
    const daysUntilDue = Math.ceil((dueTime - refTime) / oneDayMs);

    // 1. Flagged notification
    if (invoice.status === 'Flagged') {
      const notifId = `notif-flagged-${invId}`;
      derived.push({
        id: notifId,
        type: 'flagged',
        invoiceId: invId,
        message: `Invoice ${invoice.invoiceNumber} was flagged: ${
          invoice.flagReason || 'Requires discrepancy review'
        }`,
        read: readNotificationIds.has(notifId),
        createdAt: invoice.submittedDate,
        userId: invoice.submittedBy,
      });
    }

    // 2. Overdue notification (status !== 'Paid' and daysUntilDue < 0)
    if (invoice.status !== 'Paid' && daysUntilDue < 0) {
      const notifId = `notif-overdue-${invId}`;
      derived.push({
        id: notifId,
        type: 'overdue',
        invoiceId: invId,
        message: `Invoice ${invoice.invoiceNumber} is overdue by ${Math.abs(
          daysUntilDue
        )} day(s) (due ${invoice.dueDate})`,
        read: readNotificationIds.has(notifId),
        createdAt: invoice.dueDate,
        userId: invoice.submittedBy,
      });
    }

    // 3. Due soon notification (status !== 'Paid' and 0 <= daysUntilDue <= 5)
    if (
      invoice.status !== 'Paid' &&
      daysUntilDue >= 0 &&
      daysUntilDue <= 5
    ) {
      const notifId = `notif-duesoon-${invId}`;
      derived.push({
        id: notifId,
        type: 'due_soon',
        invoiceId: invId,
        message: `Invoice ${invoice.invoiceNumber} is due in ${daysUntilDue} day(s) (${invoice.dueDate})`,
        read: readNotificationIds.has(notifId),
        createdAt: invoice.submittedDate,
        userId: invoice.submittedBy,
      });
    }

    // 4. Pending approval > 3 days (status in ['Submitted', 'Under Verification'])
    if (
      (invoice.status === 'Submitted' ||
        invoice.status === 'Under Verification') &&
      daysSinceSubmission > 3
    ) {
      const notifId = `notif-pending-${invId}`;
      derived.push({
        id: notifId,
        type: 'pending_approval',
        invoiceId: invId,
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

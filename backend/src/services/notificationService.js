const Invoice = require('../models/Invoice');
const NotificationRead = require('../models/NotificationRead');

/**
 * Resets persisted read notifications collection (useful in tests).
 */
const resetReadNotifications = async () => {
  await NotificationRead.deleteMany({});
};

/**
 * Marks a specific notification as read by notification key and userId.
 * Persisted in MongoDB collection.
 *
 * @param {string} id - Notification ID / key
 * @param {string} [userId='default_user'] - User ID
 */
const markNotificationAsRead = async (id, userId = 'default_user') => {
  await NotificationRead.updateOne(
    { userId: String(userId), notificationKey: String(id) },
    { $setOnInsert: { readAt: new Date() } },
    { upsert: true }
  );
};

/**
 * Marks all active notifications for a given user context as read in MongoDB.
 *
 * @param {string} userId - User ID
 * @param {string} userRole - User Role
 * @param {Date} [refDate=new Date()] - Reference date
 */
const markAllNotificationsAsRead = async (
  userId,
  userRole,
  refDate = new Date()
) => {
  const notifs = await getDerivedNotifications(userId, userRole, refDate);
  const targetUserId = String(userId || 'default_user');
  const operations = notifs.map((n) => ({
    updateOne: {
      filter: { userId: targetUserId, notificationKey: String(n.id) },
      update: { $setOnInsert: { readAt: new Date() } },
      upsert: true,
    },
  }));
  if (operations.length > 0) {
    await NotificationRead.bulkWrite(operations);
  }
};

/**
 * Derives dynamic notifications at runtime based on active invoice states:
 * - pending_approval: status in ['Submitted', 'Under Verification'] where submission age > 3 days.
 * - due_soon: status !== 'Paid' where dueDate is within 0 to 5 days.
 * - overdue: status !== 'Paid' where dueDate < refDate.
 * - flagged: status === 'Flagged'.
 *
 * Role scoping:
 * - Requester only receives notifications for invoices where submittedBy == userId.
 * - Admin and Approver receive notifications across all invoices.
 *
 * Read state:
 * - Persisted in MongoDB NotificationRead collection keyed by (userId, notificationKey).
 *
 * @param {string|object} userIdOrUser - User ID string or user object { id, role }
 * @param {string} [userRole] - Role of the user ('Admin', 'Approver', 'Requester')
 * @param {Date} [refDate] - Reference date for date math (defaults to new Date())
 * @returns {Promise<Array>} Array of derived notification objects
 */
const getDerivedNotifications = async (
  userIdOrUser,
  userRole,
  refDate = new Date()
) => {
  let userId = userIdOrUser;
  let role = userRole;
  let referenceDate = refDate;

  if (
    userIdOrUser &&
    typeof userIdOrUser === 'object' &&
    !(userIdOrUser instanceof Date)
  ) {
    userId = userIdOrUser.id || userIdOrUser.userId || userIdOrUser._id;
    role = userIdOrUser.role || role;
    if (userRole instanceof Date) {
      referenceDate = userRole;
    }
  } else if (userIdOrUser instanceof Date) {
    referenceDate = userIdOrUser;
    userId = undefined;
    role = undefined;
  }

  const allInvoices = await Invoice.find().lean();
  const ref = referenceDate ? new Date(referenceDate) : new Date();
  const refTime = ref.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const isPrivileged = role === 'Admin' || role === 'Approver';
  const derived = [];

  // Query persisted read notification keys from MongoDB for this user
  const userKey = userId ? String(userId) : null;
  const readQuery = userKey ? { userId: userKey } : {};
  const readRecords = await NotificationRead.find(readQuery)
    .select('notificationKey')
    .lean();
  const readKeys = new Set(readRecords.map((r) => r.notificationKey));

  for (const invoice of allInvoices) {
    const invId = invoice.id || (invoice._id ? invoice._id.toString() : '');
    const invSubmittedBy = invoice.submittedBy?._id
      ? invoice.submittedBy._id.toString()
      : invoice.submittedBy
      ? invoice.submittedBy.toString()
      : '';

    // If Requester (or non-privileged user), filter by submittedBy
    if (role === 'Requester' && userId && invSubmittedBy !== String(userId)) {
      continue;
    }
    if (userId && !isPrivileged && role && invSubmittedBy !== String(userId)) {
      continue;
    }

    const submittedDateObj = invoice.submittedDate
      ? new Date(invoice.submittedDate)
      : new Date();
    const dueDateObj = invoice.dueDate
      ? new Date(invoice.dueDate)
      : new Date();

    const submittedTime = submittedDateObj.getTime();
    const dueTime = dueDateObj.getTime();

    const daysSinceSubmission = Math.floor((refTime - submittedTime) / oneDayMs);
    const daysUntilDue = Math.ceil((dueTime - refTime) / oneDayMs);

    const formattedDueDate = dueDateObj.toISOString().split('T')[0];
    const formattedSubmittedDate = submittedDateObj.toISOString();

    // 1. Flagged notification
    if (invoice.status === 'Flagged') {
      const notifId = `notif-flagged-${invId}`;
      derived.push({
        id: notifId,
        type: 'flagged',
        invoiceId: invId,
        message: `Invoice ${invoice.invoiceNumber || invId} was flagged: ${
          invoice.flagReason || 'Requires discrepancy review'
        }`,
        read: readKeys.has(notifId),
        createdAt: formattedSubmittedDate,
        userId: invSubmittedBy,
      });
    }

    // 2. Overdue notification (status !== 'Paid' and daysUntilDue < 0)
    if (invoice.status !== 'Paid' && daysUntilDue < 0) {
      const notifId = `notif-overdue-${invId}`;
      derived.push({
        id: notifId,
        type: 'overdue',
        invoiceId: invId,
        message: `Invoice ${invoice.invoiceNumber || invId} is overdue by ${Math.abs(
          daysUntilDue
        )} day(s) (due ${formattedDueDate})`,
        read: readKeys.has(notifId),
        createdAt: dueDateObj.toISOString(),
        userId: invSubmittedBy,
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
        message: `Invoice ${invoice.invoiceNumber || invId} is due in ${daysUntilDue} day(s) (${formattedDueDate})`,
        read: readKeys.has(notifId),
        createdAt: formattedSubmittedDate,
        userId: invSubmittedBy,
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
        message: `Invoice ${invoice.invoiceNumber || invId} has been pending approval for ${daysSinceSubmission} days`,
        read: readKeys.has(notifId),
        createdAt: formattedSubmittedDate,
        userId: invSubmittedBy,
      });
    }
  }

  // Sort descending by creation date
  return derived.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

module.exports = {
  getDerivedNotifications,
  getDynamicNotifications: getDerivedNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  resetReadNotifications,
};

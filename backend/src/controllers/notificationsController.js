const {
  getDerivedNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require('../services/notificationService');
const NotificationRead = require('../models/NotificationRead');

/**
 * Controller to fetch dynamic derived notifications.
 * Evaluates active invoices based on verified JWT user identity and reference date.
 */
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const notifications = await getDerivedNotifications(userId, role);

    return res.status(200).json(notifications);
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a single notification as read by ID.
 * Validates that the requested notification exists among current user's derived notifications.
 */
const markRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const derivedNotifications = await getDerivedNotifications(req.user);
    const exists = derivedNotifications.some((n) => n.id === id);

    if (!exists) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await markNotificationAsRead(id, userId);
    return res.status(200).json({ success: true, id });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read for the current user context.
 * Marks only the user's currently derived notifications as read in NotificationRead.
 */
const markAllRead = async (req, res, next) => {
  try {
    const notifs = await getDerivedNotifications(req.user);
    const userId = String(
      req.user.id || req.user.userId || req.user._id || 'default_user'
    );
    const operations = notifs.map((n) => ({
      updateOne: {
        filter: { userId, notificationKey: String(n.id) },
        update: { $setOnInsert: { readAt: new Date() } },
        upsert: true,
      },
    }));
    if (operations.length > 0) {
      await NotificationRead.bulkWrite(operations);
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markRead,
  markAllRead,
};

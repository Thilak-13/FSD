const {
  getDerivedNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require('../services/notificationService');

/**
 * Controller to fetch dynamic derived notifications.
 * Evaluates active invoices based on verified JWT user identity and reference date.
 */
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const refDate = req.query.refDate
      ? new Date(req.query.refDate)
      : new Date();

    const notifications = await getDerivedNotifications(
      userId,
      role,
      refDate
    );

    return res.status(200).json(notifications);
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a single notification as read by ID.
 */
const markRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    await markNotificationAsRead(id, userId);
    return res.status(200).json({ success: true, id });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read for the current user context.
 */
const markAllRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const refDate = req.query.refDate
      ? new Date(req.query.refDate)
      : new Date();

    await markAllNotificationsAsRead(userId, role, refDate);
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

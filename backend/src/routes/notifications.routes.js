const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');
const { requireAuth } = require('../middleware/auth');

// GET /api/notifications - Identity strictly from verified JWT
router.get('/', requireAuth, notificationsController.getNotifications);

// PATCH /api/notifications/:id/read & POST /api/notifications/:id/read
router.patch('/:id/read', requireAuth, notificationsController.markRead);
router.post('/:id/read', requireAuth, notificationsController.markRead);

// POST /api/notifications/read-all
router.post('/read-all', requireAuth, notificationsController.markAllRead);

module.exports = router;

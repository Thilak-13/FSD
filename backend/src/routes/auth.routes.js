const express = require('express');
const {
  login,
  getMe,
  getUsers,
  getUserById,
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

const router = express.Router();

// Routes support both sub-path and absolute path forms for flexible mounting
router.post(['/login', '/api/auth/login'], login);
router.get(['/me', '/api/auth/me'], requireAuth, getMe);
router.get(
  ['/users', '/api/auth/users'],
  requireAuth,
  requireRole('Admin'),
  getUsers
);
router.get(
  ['/users/:id', '/api/auth/users/:id'],
  requireAuth,
  requireRole('Admin'),
  getUserById
);

module.exports = router;
module.exports.authRouter = router;

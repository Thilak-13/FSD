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

/**
 * In-memory rate limiting middleware for authentication endpoints.
 * Tracks client IP in a Map (max 10 requests per 15 minutes window;
 * if exceeded, returns 429 { error: 'Too many login attempts. Please try again later.' }).
 * Skips rate limiting if process.env.NODE_ENV === 'test'.
 */
const loginRateLimiter = (() => {
  const attempts = new Map();
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  const MAX_ATTEMPTS = 10;

  return (req, res, next) => {
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();

    const record = attempts.get(ip);
    if (!record || now > record.resetTime) {
      attempts.set(ip, { count: 1, resetTime: now + WINDOW_MS });
      return next();
    }

    if (record.count >= MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
    }

    record.count += 1;
    return next();
  };
})();

// Routes support both sub-path and absolute path forms for flexible mounting
router.post(['/login', '/api/auth/login'], loginRateLimiter, login);
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

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

/**
 * Authentication middleware that verifies JWT bearer token.
 * Sets req.user = { id: decoded.id, role: decoded.role, email: decoded.email, name: decoded.name }
 * Returns 401 if missing or invalid.
 */
const requireAuth = (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    } else {
      return res
        .status(401)
        .json({ error: 'Invalid token format. Must be Bearer <token>' });
    }
  } else if (req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)token=([^;]+)/);
    if (match) {
      token = match[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.id || !decoded.role) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
      name: decoded.name,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = {
  requireAuth,
  authenticateJWT: requireAuth,
};

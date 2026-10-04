/**
 * Role-based authorization middleware guard.
 * Accepts multiple roles as spread arguments or array (e.g. requireRole('Admin', 'Approver') or requireRole(['Admin', 'Approver']))
 * Returns 403 { error: 'Forbidden: Insufficient permissions' } if user is not authenticated or not in allowed roles.
 */
const requireRole = (...roles) => {
  const allowedRoles = roles.flat();
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

module.exports = {
  requireRole,
};

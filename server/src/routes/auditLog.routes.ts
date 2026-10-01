import { Router, Request, Response, NextFunction } from 'express';
import { getAuditLog } from '../services/audit.service';

const router = Router();

/**
 * GET /
 * Filters: invoiceId, user (or performedBy), action
 * Returns: AuditEntry[]
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { invoiceId, user, performedBy, action } = req.query as Record<string, string>;

    const entries = await getAuditLog({
      invoiceId,
      user: user || performedBy,
      action,
    });

    return res.status(200).json(entries);
  } catch (error) {
    next(error);
  }
});

export const auditLogRouter = router;
export default router;

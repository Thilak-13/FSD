import { Router, Request, Response, NextFunction } from 'express';
import { getReportsSummary, getVendorBreakdown } from '../services/reports.service';

const router = Router();

/**
 * GET /api/reports/summary?from=&to=
 * Returns high-level summary KPIs with optional date range filter.
 */
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const from = req.query.from ? String(req.query.from) : undefined;
    const to = req.query.to ? String(req.query.to) : undefined;

    const summary = await getReportsSummary(from, to);
    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/vendor-breakdown?from=&to=
 * Returns per-vendor financial breakdown metrics with optional date range filter.
 */
router.get('/vendor-breakdown', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const from = req.query.from ? String(req.query.from) : undefined;
    const to = req.query.to ? String(req.query.to) : undefined;

    const rows = await getVendorBreakdown(from, to);
    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
});

export default router;

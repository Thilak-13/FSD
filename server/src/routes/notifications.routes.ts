import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { User } from '../models/User';
import {
  getDynamicNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notifications.service';
import { Role } from '../types';

const router = Router();

/**
 * Resolves user identity from req.user, JWT Authorization header, custom headers, or query params.
 */
const resolveAuthUser = async (
  req: Request
): Promise<{ id: string; role: Role } | null | undefined> => {
  // 1. Check req.user
  if (req.user && req.user.id && req.user.role) {
    return { id: req.user.id, role: req.user.role };
  }

  // 2. Check Authorization Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      if (decoded && decoded.id && decoded.role) {
        return { id: decoded.id, role: decoded.role };
      }
    } catch {
      // Invalid token returns null (will signal 401)
      return null;
    }
  }

  // 3. Check custom headers
  const headerRole = req.headers['x-user-role'] as Role;
  const headerUserId = req.headers['x-user-id'] as string;
  if (headerRole) {
    return { id: headerUserId || 'header-user', role: headerRole };
  }

  // 4. Check query params (?userId=&role=)
  const queryRole = req.query.role as Role;
  const queryUserId = req.query.userId as string;
  if (queryUserId && queryRole) {
    return { id: queryUserId, role: queryRole };
  }

  if (queryUserId) {
    try {
      const dbUser: any = await User.findById(queryUserId).lean();
      if (dbUser && dbUser.role) {
        return { id: queryUserId, role: dbUser.role as Role };
      }
    } catch {
      // Ignore DB lookup error and continue
    }
    return { id: queryUserId, role: 'Requester' };
  }

  return undefined;
};

/**
 * GET /api/notifications
 * Returns dynamically evaluated notifications, scoped by role when authenticated.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authResult = await resolveAuthUser(req);

    if (authResult === null) {
      return res.status(401).json({ error: 'Invalid or expired authentication token' });
    }

    const notifications = await getDynamicNotifications(authResult);
    return res.status(200).json(notifications);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark an individual notification as read.
 */
router.patch('/:id/read', (req: Request, res: Response) => {
  markNotificationAsRead(req.params.id);
  res.status(200).json({ success: true, id: req.params.id });
});

/**
 * POST /api/notifications/:id/read
 */
router.post('/:id/read', (req: Request, res: Response) => {
  markNotificationAsRead(req.params.id);
  res.status(200).json({ success: true, id: req.params.id });
});

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read.
 */
router.post('/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authResult = await resolveAuthUser(req);
    await markAllNotificationsAsRead(authResult?.id, authResult?.role);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;

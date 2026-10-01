import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config/env';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import authRouter from './routes/auth.routes';
import vendorsRouter from './routes/vendors.routes';
import purchaseOrdersRouter from './routes/purchaseOrders.routes';
import invoicesRouter from './routes/invoices.routes';
import auditLogRouter from './routes/auditLog.routes';
import reportsRouter from './routes/reports.routes';
import notificationsRouter from './routes/notifications.routes';

export const createApp = (): Express => {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: [config.clientOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Static upload folder access
  app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/vendors', vendorsRouter);
  app.use('/api/purchase-orders', purchaseOrdersRouter);
  app.use('/api/invoices', invoicesRouter);
  app.use('/api/audit-log', auditLogRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/notifications', notificationsRouter);

  // Central error handling middleware (registered after all routes are mounted)
  app.use(errorHandler);

  return app;
};

export const app = createApp();

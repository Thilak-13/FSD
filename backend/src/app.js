const express = require('express');
const cors = require('cors');
const { CLIENT_ORIGIN } = require('./config/env');

const authRoutes = require('./routes/auth.routes');
const invoicesRoutes = require('./routes/invoices.routes');
const vendorsRoutes = require('./routes/vendors.routes');
const purchaseOrdersRoutes = require('./routes/purchaseOrders.routes');
const reportsRoutes = require('./routes/reports.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const auditLogRoutes = require('./routes/auditLog.routes');

const app = express();

// Global Middleware
const allowedOrigin = CLIENT_ORIGIN || (process.env.NODE_ENV !== 'production' ? 'http://localhost:5173' : false);
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount Domain API Routes
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/vendors', vendorsRoutes);
app.use('/api/purchase-orders', purchaseOrdersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/audit-log', auditLogRoutes);

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ error: `Not Found: ${req.method} ${req.originalUrl}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[App Error]', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
  });
});

module.exports = app;

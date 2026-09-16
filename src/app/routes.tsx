// src/app/routes.tsx
import React from 'react';
import { RouteObject, Navigate, useRoutes } from 'react-router-dom';
import { RouteGuard } from '../components/shared/RouteGuard';
import { LoginPage } from '../pages/Login/LoginPage';
import { InvoicesPage } from '../pages/Invoices/InvoicesPage';
import { InvoiceDetailPage } from '../pages/InvoiceDetail/InvoiceDetailPage';
import { ApprovalsPage } from '../pages/Approvals/ApprovalsPage';

// Placeholder components until dedicated page implementations (Tasks 5-11) are attached
export const LoginPlaceholder: React.FC = LoginPage;
export const DashboardPlaceholder: React.FC = () => (
  <div data-testid="page-dashboard">Dashboard Page</div>
);
export const InvoicesPlaceholder: React.FC = InvoicesPage;
export const InvoiceDetailPlaceholder: React.FC = InvoiceDetailPage;
export const ApprovalsPlaceholder: React.FC = ApprovalsPage;
export const PaymentsPlaceholder: React.FC = () => (
  <div data-testid="page-payments">Payments Disbursement</div>
);
export const VendorsPlaceholder: React.FC = () => (
  <div data-testid="page-vendors">Vendors Directory</div>
);
export const VendorDetailPlaceholder: React.FC = () => (
  <div data-testid="page-vendor-detail">Vendor Detail</div>
);
export const ReportsPlaceholder: React.FC = () => (
  <div data-testid="page-reports">Reports & Financial Analytics</div>
);
export const AuditLogPlaceholder: React.FC = () => (
  <div data-testid="page-audit-log">Audit Log Trail</div>
);

export const routeConfig: RouteObject[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <RouteGuard>
        <DashboardPlaceholder />
      </RouteGuard>
    ),
  },
  {
    path: '/invoices',
    element: (
      <RouteGuard>
        <InvoicesPage />
      </RouteGuard>
    ),
  },
  {
    path: '/invoices/:id',
    element: (
      <RouteGuard>
        <InvoiceDetailPage />
      </RouteGuard>
    ),
  },
  {
    path: '/approvals',
    element: (
      <RouteGuard allowedRoles={['Admin', 'Approver']}>
        <ApprovalsPage />
      </RouteGuard>
    ),
  },
  {
    path: '/payments',
    element: (
      <RouteGuard allowedRoles={['Admin', 'Approver']}>
        <PaymentsPlaceholder />
      </RouteGuard>
    ),
  },
  {
    path: '/vendors',
    element: (
      <RouteGuard>
        <VendorsPlaceholder />
      </RouteGuard>
    ),
  },
  {
    path: '/vendors/:id',
    element: (
      <RouteGuard>
        <VendorDetailPlaceholder />
      </RouteGuard>
    ),
  },
  {
    path: '/reports',
    element: (
      <RouteGuard allowedRoles={['Admin', 'Approver']}>
        <ReportsPlaceholder />
      </RouteGuard>
    ),
  },
  {
    path: '/audit-log',
    element: (
      <RouteGuard allowedRoles={['Admin']}>
        <AuditLogPlaceholder />
      </RouteGuard>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
];

export const AppRoutes: React.FC = () => {
  return useRoutes(routeConfig);
};

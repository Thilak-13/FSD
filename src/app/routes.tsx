// src/app/routes.tsx
import React from 'react';
import { RouteObject, Navigate, useRoutes } from 'react-router-dom';
import { RouteGuard } from '../components/shared/RouteGuard';
import { LoginPage } from '../pages/Login/LoginPage';
import { DashboardPage } from '../pages/Dashboard/DashboardPage';
import { InvoicesPage } from '../pages/Invoices/InvoicesPage';
import { InvoiceDetailPage } from '../pages/InvoiceDetail/InvoiceDetailPage';
import { ApprovalsPage } from '../pages/Approvals/ApprovalsPage';
import { PaymentsPage } from '../pages/Payments/PaymentsPage';
import { VendorsPage } from '../pages/Vendors/VendorsPage';
import { VendorDetailPage } from '../pages/VendorDetail/VendorDetailPage';
import { ReportsPage } from '../pages/Reports/ReportsPage';
import { AuditLogPage } from '../pages/AuditLog/AuditLogPage';

// Placeholder components until dedicated page implementations (Tasks 5-11) are attached
export const LoginPlaceholder: React.FC = LoginPage;
export const DashboardPlaceholder: React.FC = DashboardPage;
export const InvoicesPlaceholder: React.FC = InvoicesPage;
export const InvoiceDetailPlaceholder: React.FC = InvoiceDetailPage;
export const ApprovalsPlaceholder: React.FC = ApprovalsPage;
export const PaymentsPlaceholder: React.FC = PaymentsPage;
export const VendorsPlaceholder: React.FC = VendorsPage;
export const VendorDetailPlaceholder: React.FC = VendorDetailPage;
export const ReportsPlaceholder: React.FC = ReportsPage;
export const AuditLogPlaceholder: React.FC = AuditLogPage;

export const routeConfig: RouteObject[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <RouteGuard>
        <DashboardPage />
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
        <PaymentsPage />
      </RouteGuard>
    ),
  },
  {
    path: '/vendors',
    element: (
      <RouteGuard>
        <VendorsPage />
      </RouteGuard>
    ),
  },
  {
    path: '/vendors/:id',
    element: (
      <RouteGuard>
        <VendorDetailPage />
      </RouteGuard>
    ),
  },
  {
    path: '/reports',
    element: (
      <RouteGuard allowedRoles={['Admin', 'Approver']}>
        <ReportsPage />
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

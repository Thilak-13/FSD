// src/app/routes.tsx
import React from 'react';
import { RouteObject, Navigate, useRoutes } from 'react-router-dom';
import { RouteGuard } from '../components/shared/RouteGuard';
import { useAuth } from '../context/AuthContext';
import { LoginPage } from '../pages/Login/LoginPage';
import { LandingPage } from '../pages/Landing/LandingPage';
import { DashboardPage } from '../pages/Dashboard/DashboardPage';
import { InvoicesPage } from '../pages/Invoices/InvoicesPage';
import { InvoiceDetailPage } from '../pages/InvoiceDetail/InvoiceDetailPage';
import { ApprovalsPage } from '../pages/Approvals/ApprovalsPage';
import { PaymentsPage } from '../pages/Payments/PaymentsPage';
import { VendorsPage } from '../pages/Vendors/VendorsPage';
import { VendorDetailPage } from '../pages/VendorDetail/VendorDetailPage';
import { ReportsPage } from '../pages/Reports/ReportsPage';
import { AuditLogPage } from '../pages/AuditLog/AuditLogPage';


/**
 * RootRoute Component:
 * - When an unauthenticated visitor accesses '/', renders LandingPage (which includes the embedded login interface).
 * - When an authenticated visitor accesses '/', renders DashboardPage wrapped with RouteGuard.
 */
export const RootRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <RouteGuard>
      <DashboardPage />
    </RouteGuard>
  );
};

export const routeConfig: RouteObject[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/landing',
    element: <LandingPage />,
  },
  {
    path: '/',
    element: <RootRoute />,
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
        <AuditLogPage />
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

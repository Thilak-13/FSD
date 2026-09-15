// src/components/shared/RouteGuard.tsx
import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Role } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const REDIRECT_NOTICE_KEY = 'redirect_notice';

export interface RouteGuardProps {
  children?: React.ReactNode;
  allowedRoles?: Role[];
  redirectPath?: string;
  unauthorizedMessage?: string;
}

export const getRedirectNotice = (): string | null => {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      return sessionStorage.getItem(REDIRECT_NOTICE_KEY);
    } catch {
      return null;
    }
  }
  return null;
};

export const clearRedirectNotice = (): void => {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      sessionStorage.removeItem(REDIRECT_NOTICE_KEY);
    } catch {
      // Ignore
    }
  }
};

export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  allowedRoles,
  redirectPath = '/',
  unauthorizedMessage,
}) => {
  const { isAuthenticated, currentRole } = useAuth();
  const location = useLocation();

  const isRoleForbidden = Boolean(allowedRoles && !allowedRoles.includes(currentRole));

  const message =
    unauthorizedMessage ||
    (allowedRoles
      ? `Access restricted: requires ${allowedRoles.join(' or ')} permissions.`
      : 'Access restricted: unauthorized role.');

  useEffect(() => {
    if (isAuthenticated && isRoleForbidden && typeof window !== 'undefined' && window.sessionStorage) {
      try {
        sessionStorage.setItem(REDIRECT_NOTICE_KEY, message);
      } catch {
        // Ignore
      }
    }
  }, [isAuthenticated, isRoleForbidden, message]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (isRoleForbidden) {
    return <Navigate to={redirectPath} replace state={{ redirectNotice: message }} />;
  }

  return children ? <>{children}</> : <Outlet />;
};

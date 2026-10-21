// src/context/DataContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  Invoice,
  Vendor,
  PurchaseOrder,
  AuditEntry,
  Notification,
  NewInvoiceInput,
  NewVendorInput,
  InvoiceStatus,
} from '../types';
import { dataApi } from '../services/dataSource';
import { AuthContext } from './AuthContext';
import { getStoredToken, ApiError } from '../services/api/client';
import { ReportsSummaryResponse } from '../services/api/reports';

export const formatErrorMessage = (reason: unknown, fallback: string): string => {
  if (reason instanceof ApiError) {
    if (reason.status === 401) {
      return 'Session expired or unauthorized. Please log in again.';
    }
    if (reason.status === 403) {
      return 'Access denied: You do not have permission to access this resource.';
    }
    return reason.message || fallback;
  }
  if (
    reason &&
    typeof reason === 'object' &&
    'status' in reason &&
    typeof (reason as { status: unknown }).status === 'number'
  ) {
    const status = (reason as { status: number }).status;
    if (status === 401) {
      return 'Session expired or unauthorized. Please log in again.';
    }
    if (status === 403) {
      return 'Access denied: You do not have permission to access this resource.';
    }
  }
  if (reason instanceof Error) {
    if (reason.message.includes('401') || reason.message.toLowerCase().includes('unauthorized')) {
      return 'Session expired or unauthorized. Please log in again.';
    }
    if (
      reason.message.includes('403') ||
      reason.message.toLowerCase().includes('forbidden') ||
      reason.message.toLowerCase().includes('access denied')
    ) {
      return 'Access denied: You do not have permission to access this resource.';
    }
    return reason.message || fallback;
  }
  return fallback;
};

export interface DataContextType {
  invoices: Invoice[];
  vendors: Vendor[];
  purchaseOrders: PurchaseOrder[];
  auditLog: AuditEntry[];
  notifications: Notification[];
  reportsSummary: ReportsSummaryResponse | null;
  loading: boolean;
  error: string | null;
  resourceErrors?: {
    invoices?: string | null;
    vendors?: string | null;
    purchaseOrders?: string | null;
    auditLog?: string | null;
    notifications?: string | null;
    reportsSummary?: string | null;
  };
  simulateError: boolean;
  setSimulateError: (simulate: boolean) => void;
  refreshAll: () => Promise<void>;
  createInvoice: (input: NewInvoiceInput) => Promise<Invoice>;
  updateStatus: (
    id: string,
    status: InvoiceStatus,
    comment?: string,
    performedBy?: string,
    extra?: {
      scheduledPaymentDate?: string;
      paidDate?: string;
      flagReason?: string;
    }
  ) => Promise<Invoice>;
  schedulePayment: (
    id: string,
    paymentDate: string,
    performedBy?: string,
    comment?: string
  ) => Promise<Invoice>;
  markPaid: (
    id: string,
    paidDate?: string,
    performedBy?: string,
    comment?: string
  ) => Promise<Invoice>;
  createVendor: (input: NewVendorInput) => Promise<Vendor>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: (userId?: string) => Promise<void>;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

export interface DataProviderProps {
  children: React.ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const auth = useContext(AuthContext);
  const currentUser = auth?.currentUser ?? null;
  const currentRole = auth?.currentRole;
  const isAuthenticated = Boolean(auth?.isAuthenticated && currentUser);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reportsSummary, setReportsSummary] = useState<ReportsSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(() => {
    return Boolean(auth?.isAuthenticated && auth?.currentUser);
  });
  const [error, setError] = useState<string | null>(null);
  const [resourceErrors, setResourceErrors] = useState<{
    invoices?: string | null;
    vendors?: string | null;
    purchaseOrders?: string | null;
    auditLog?: string | null;
    notifications?: string | null;
    reportsSummary?: string | null;
  }>({});
  const [simulateError, setSimulateErrorState] = useState<boolean>(false);

  // Use ref to keep track of current simulateError state in async callbacks
  const simulateErrorRef = useRef<boolean>(simulateError);
  useEffect(() => {
    simulateErrorRef.current = simulateError;
  }, [simulateError]);

  const setSimulateError = useCallback((simulate: boolean) => {
    setSimulateErrorState(simulate);
    simulateErrorRef.current = simulate;
    if (simulate) {
      setError('Simulated network error: service unavailable');
    } else {
      setError(null);
      setResourceErrors({});
    }
  }, []);

  const clearState = useCallback(() => {
    setInvoices([]);
    setVendors([]);
    setPurchaseOrders([]);
    setAuditLog([]);
    setNotifications([]);
    setReportsSummary(null);
    setError(null);
    setResourceErrors({});
    setLoading(false);
  }, []);

  const refreshAll = useCallback(async () => {
    if (simulateErrorRef.current) {
      const errMessage = 'Simulated network error: service unavailable';
      setError(errMessage);
      setLoading(false);
      throw new Error(errMessage);
    }

    if (!isAuthenticated || !currentUser) {
      clearState();
      return;
    }

    if (import.meta.env.VITE_API_MODE !== 'mock' && !getStoredToken()) {
      clearState();
      return;
    }

    setLoading(true);
    setError(null);

    const isAdmin = currentRole === 'Admin';
    const isApproverOrAdmin = currentRole === 'Admin' || currentRole === 'Approver';

    try {
      const promises = [
        dataApi.getInvoices(),
        dataApi.getVendors(),
        dataApi.getPurchaseOrders(),
        isAdmin ? dataApi.getAuditLog() : Promise.resolve<AuditEntry[]>([]),
        dataApi.getNotifications(currentUser.id),
        isApproverOrAdmin && typeof dataApi.getReportsSummary === 'function'
          ? dataApi.getReportsSummary()
          : Promise.resolve<ReportsSummaryResponse | null>(null),
      ] as const;

      const [invsResult, vendsResult, posResult, auditsResult, notifsResult, reportsResult] =
        await Promise.allSettled(promises);

      const newResourceErrors: {
        invoices?: string | null;
        vendors?: string | null;
        purchaseOrders?: string | null;
        auditLog?: string | null;
        notifications?: string | null;
        reportsSummary?: string | null;
      } = {};

      if (invsResult.status === 'fulfilled') {
        setInvoices(invsResult.value);
      } else {
        newResourceErrors.invoices = formatErrorMessage(
          invsResult.reason,
          'Failed to load invoices'
        );
      }

      if (vendsResult.status === 'fulfilled') {
        setVendors(vendsResult.value);
      } else {
        newResourceErrors.vendors = formatErrorMessage(
          vendsResult.reason,
          'Failed to load vendors'
        );
      }

      if (posResult.status === 'fulfilled') {
        setPurchaseOrders(posResult.value);
      } else {
        newResourceErrors.purchaseOrders = formatErrorMessage(
          posResult.reason,
          'Failed to load purchase orders'
        );
      }

      if (isAdmin) {
        if (auditsResult.status === 'fulfilled') {
          setAuditLog(auditsResult.value);
        } else {
          newResourceErrors.auditLog = formatErrorMessage(
            auditsResult.reason,
            'Failed to load audit log'
          );
        }
      } else {
        setAuditLog([]);
      }

      if (notifsResult.status === 'fulfilled') {
        setNotifications(notifsResult.value);
      } else {
        newResourceErrors.notifications = formatErrorMessage(
          notifsResult.reason,
          'Failed to load notifications'
        );
      }

      if (isApproverOrAdmin) {
        if (reportsResult.status === 'fulfilled' && reportsResult.value) {
          setReportsSummary(reportsResult.value);
        } else if (reportsResult.status === 'rejected') {
          newResourceErrors.reportsSummary = formatErrorMessage(
            reportsResult.reason,
            'Failed to load reports summary'
          );
        }
      } else {
        setReportsSummary(null);
      }

      setResourceErrors(newResourceErrors);

      const firstError = Object.values(newResourceErrors).find(Boolean);
      if (firstError) {
        setError(firstError);
      } else {
        setError(null);
      }
    } catch (err: unknown) {
      const errorMessage = formatErrorMessage(
        err,
        'Failed to load data from server'
      );
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, currentUser, currentRole, clearState]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      clearState();
      return;
    }
    refreshAll().catch((err) => {
      setError(formatErrorMessage(err, 'Failed to refresh data'));
    });
  }, [isAuthenticated, currentUser, currentRole, refreshAll, clearState]);

  const createInvoice = useCallback(
    async (input: NewInvoiceInput): Promise<Invoice> => {
      if (simulateErrorRef.current) {
        throw new Error('Simulated network error: operation rejected');
      }

      const invoiceInput = {
        ...input,
        submittedBy: input.submittedBy || currentUser?.id || 'Requester',
      };

      const newInv = await dataApi.createInvoice(invoiceInput);
      setInvoices((prev) => [newInv, ...prev.filter((i) => i.id !== newInv.id)]);

      // Refresh dynamic notifications, audit log (Admin only), and reports summary (Admin & Approver)
      const canAccessReports = currentRole === 'Admin' || currentRole === 'Approver';
      const refreshPromises = [
        dataApi.getNotifications(currentUser?.id),
        currentRole === 'Admin'
          ? dataApi.getAuditLog()
          : Promise.resolve<AuditEntry[]>([]),
        canAccessReports && typeof dataApi.getReportsSummary === 'function'
          ? dataApi.getReportsSummary()
          : Promise.resolve<ReportsSummaryResponse | null>(null),
      ] as const;

      const [updatedNotifsRes, updatedAuditsRes, updatedReportsRes] =
        await Promise.allSettled(refreshPromises);

      if (updatedNotifsRes.status === 'fulfilled') {
        setNotifications(updatedNotifsRes.value);
      }
      if (currentRole === 'Admin') {
        if (updatedAuditsRes.status === 'fulfilled') {
          setAuditLog(updatedAuditsRes.value);
        }
      } else {
        setAuditLog([]);
      }
      if (canAccessReports && updatedReportsRes.status === 'fulfilled' && updatedReportsRes.value) {
        setReportsSummary(updatedReportsRes.value);
      }

      return newInv;
    },
    [currentUser?.id, currentRole]
  );

  const updateStatus = useCallback(
    async (
      id: string,
      status: InvoiceStatus,
      comment?: string,
      performedBy?: string,
      extra?: {
        scheduledPaymentDate?: string;
        paidDate?: string;
        flagReason?: string;
      }
    ): Promise<Invoice> => {
      if (simulateErrorRef.current) {
        throw new Error('Simulated network error: operation rejected');
      }

      const performer =
        performedBy || currentUser?.name || currentRole || 'Approver';

      const updated = await dataApi.updateInvoiceStatus(
        id,
        status,
        comment,
        performer,
        extra
      );

      setInvoices((prev) =>
        prev.map((item) => (item.id === id ? { ...updated } : item))
      );

      // Refresh dynamic notifications, audit log (Admin only), and reports summary (Admin & Approver)
      const canAccessReports = currentRole === 'Admin' || currentRole === 'Approver';
      const refreshPromises = [
        dataApi.getNotifications(currentUser?.id),
        currentRole === 'Admin'
          ? dataApi.getAuditLog()
          : Promise.resolve<AuditEntry[]>([]),
        canAccessReports && typeof dataApi.getReportsSummary === 'function'
          ? dataApi.getReportsSummary()
          : Promise.resolve<ReportsSummaryResponse | null>(null),
      ] as const;

      const [updatedNotifsRes, updatedAuditsRes, updatedReportsRes] =
        await Promise.allSettled(refreshPromises);

      if (updatedNotifsRes.status === 'fulfilled') {
        setNotifications(updatedNotifsRes.value);
      }
      if (currentRole === 'Admin') {
        if (updatedAuditsRes.status === 'fulfilled') {
          setAuditLog(updatedAuditsRes.value);
        }
      } else {
        setAuditLog([]);
      }
      if (canAccessReports && updatedReportsRes.status === 'fulfilled' && updatedReportsRes.value) {
        setReportsSummary(updatedReportsRes.value);
      }

      return updated;
    },
    [currentUser?.id, currentUser?.name, currentRole]
  );

  const schedulePayment = useCallback(
    async (
      id: string,
      paymentDate: string,
      performedBy?: string,
      comment?: string
    ): Promise<Invoice> => {
      return updateStatus(
        id,
        'Payment Scheduled',
        comment || `Payment scheduled for ${paymentDate}`,
        performedBy,
        { scheduledPaymentDate: paymentDate }
      );
    },
    [updateStatus]
  );

  const markPaid = useCallback(
    async (
      id: string,
      paidDate?: string,
      performedBy?: string,
      comment?: string
    ): Promise<Invoice> => {
      const date = paidDate || new Date().toISOString().split('T')[0];
      return updateStatus(
        id,
        'Paid',
        comment || 'Payment settlement completed',
        performedBy,
        { paidDate: date }
      );
    },
    [updateStatus]
  );

  const createVendor = useCallback(
    async (input: NewVendorInput): Promise<Vendor> => {
      if (simulateErrorRef.current) {
        throw new Error('Simulated network error: operation rejected');
      }

      const newVend = await dataApi.createVendor(input);
      setVendors((prev) => [newVend, ...prev.filter((v) => v.id !== newVend.id)]);
      return newVend;
    },
    []
  );

  const markNotificationAsRead = useCallback(
    async (id: string): Promise<void> => {
      if (simulateErrorRef.current) {
        throw new Error('Simulated network error: operation rejected');
      }

      await dataApi.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
      );
    },
    []
  );

  const markAllNotificationsAsRead = useCallback(
    async (userId?: string): Promise<void> => {
      if (simulateErrorRef.current) {
        throw new Error('Simulated network error: operation rejected');
      }

      await dataApi.markAllNotificationsAsRead(userId || currentUser?.id);
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read: true }))
      );
    },
    [currentUser?.id]
  );

  const value: DataContextType = {
    invoices,
    vendors,
    purchaseOrders,
    auditLog,
    notifications,
    reportsSummary,
    loading,
    error,
    resourceErrors,
    simulateError,
    setSimulateError,
    refreshAll,
    createInvoice,
    updateStatus,
    schedulePayment,
    markPaid,
    createVendor,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const useDataContext = (): DataContextType | undefined => {
  return useContext(DataContext);
};

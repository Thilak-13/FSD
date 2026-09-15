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
import * as mockApi from '../services/mockApi';
import { AuthContext } from './AuthContext';

export interface DataContextType {
  invoices: Invoice[];
  vendors: Vendor[];
  purchaseOrders: PurchaseOrder[];
  auditLog: AuditEntry[];
  notifications: Notification[];
  loading: boolean;
  error: string | null;
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
  const currentUser = auth?.currentUser;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
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
    }
  }, []);

  const refreshAll = useCallback(async () => {
    if (simulateErrorRef.current) {
      const errMessage = 'Simulated network error: service unavailable';
      setError(errMessage);
      setLoading(false);
      throw new Error(errMessage);
    }

    setLoading(true);
    setError(null);

    try {
      const [invs, vends, pos, audits, notifs] = await Promise.all([
        mockApi.getInvoices(),
        mockApi.getVendors(),
        mockApi.getPurchaseOrders(),
        mockApi.getAuditLog(),
        mockApi.getNotifications(currentUser?.id),
      ]);

      setInvoices(invs);
      setVendors(vends);
      setPurchaseOrders(pos);
      setAuditLog(audits);
      setNotifications(notifs);
    } catch (err: any) {
      setError(err?.message || 'Failed to load data from server');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    refreshAll().catch(() => {});
  }, [refreshAll]);

  // When current user changes (e.g. role switch), re-derive notifications
  useEffect(() => {
    if (!simulateErrorRef.current && !loading) {
      mockApi
        .getNotifications(currentUser?.id)
        .then(setNotifications)
        .catch(() => {});
    }
  }, [currentUser?.id, loading]);

  const createInvoice = useCallback(
    async (input: NewInvoiceInput): Promise<Invoice> => {
      if (simulateErrorRef.current) {
        throw new Error('Simulated network error: operation rejected');
      }

      const invoiceInput = {
        ...input,
        submittedBy: input.submittedBy || currentUser?.id || 'Requester',
      };

      const newInv = await mockApi.createInvoice(invoiceInput);
      setInvoices((prev) => [newInv, ...prev.filter((i) => i.id !== newInv.id)]);

      // Refresh dynamic notifications and audit log
      const [updatedAudits, updatedNotifs] = await Promise.all([
        mockApi.getAuditLog(),
        mockApi.getNotifications(currentUser?.id),
      ]);
      setAuditLog(updatedAudits);
      setNotifications(updatedNotifs);

      return newInv;
    },
    [currentUser?.id]
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
        performedBy || currentUser?.name || auth?.currentRole || 'Approver';

      const updated = await mockApi.updateInvoiceStatus(
        id,
        status,
        comment,
        performer,
        extra
      );

      setInvoices((prev) =>
        prev.map((item) => (item.id === id ? { ...updated } : item))
      );

      const [updatedAudits, updatedNotifs] = await Promise.all([
        mockApi.getAuditLog(),
        mockApi.getNotifications(currentUser?.id),
      ]);
      setAuditLog(updatedAudits);
      setNotifications(updatedNotifs);

      return updated;
    },
    [currentUser?.id, currentUser?.name, auth?.currentRole]
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

      const newVend = await mockApi.createVendor(input);
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

      await mockApi.markNotificationAsRead(id);
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

      await mockApi.markAllNotificationsAsRead(userId || currentUser?.id);
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
    loading,
    error,
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

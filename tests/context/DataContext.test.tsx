import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { DataProvider, useData } from '../../src/context/DataContext';
import { AuthProvider } from '../../src/context/AuthContext';
import { Invoice, Vendor } from '../../src/types';
import {
  setMockDelayEnabled,
  resetInvoices,
  resetVendors,
  resetPurchaseOrders,
  resetAuditLog,
  resetReadNotifications,
} from '../../src/services/mockApi';

describe('DataContext', () => {
  beforeEach(() => {
    setMockDelayEnabled(false);
    resetInvoices();
    resetVendors();
    resetPurchaseOrders();
    resetAuditLog();
    resetReadNotifications();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>
      <DataProvider>{children}</DataProvider>
    </AuthProvider>
  );

  it('should load initial data and set loading to false', async () => {
    const { result } = renderHook(() => useData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.invoices.length).toBe(18);
    expect(result.current.vendors.length).toBe(5);
    expect(result.current.purchaseOrders.length).toBe(8);
    expect(result.current.auditLog.length).toBeGreaterThanOrEqual(11);
    expect(result.current.notifications.length).toBeGreaterThan(0);
    expect(result.current.error).toBeNull();
  });

  it('should create an invoice and update state & audit log', async () => {
    const { result } = renderHook(() => useData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let newInvoice: Invoice | undefined;
    await act(async () => {
      newInvoice = await result.current.createInvoice({
        vendorId: 'vendor-1',
        poId: 'po-1',
        amount: 3000,
        dueDate: '2026-11-01',
        submittedBy: 'user-3',
        items: [
          {
            description: 'Additional server maintenance',
            quantity: 1,
            unitPrice: 3000,
          },
        ],
      });
    });

    expect(newInvoice).toBeDefined();
    expect(newInvoice!.id).toBeDefined();
    expect(result.current.invoices.some((inv) => inv.id === newInvoice!.id)).toBe(true);

    const latestAudit = result.current.auditLog[result.current.auditLog.length - 1];
    expect(latestAudit.invoiceId).toBe(newInvoice!.id);
    expect(latestAudit.action).toBe('SUBMISSION');
  });

  it('should update invoice status and refresh state', async () => {
    const { result } = renderHook(() => useData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updateStatus('inv-1', 'Approved', 'Approved by manager');
    });

    const updated = result.current.invoices.find((i) => i.id === 'inv-1');
    expect(updated?.status).toBe('Approved');

    const latestAudit = result.current.auditLog[result.current.auditLog.length - 1];
    expect(latestAudit.invoiceId).toBe('inv-1');
    expect(latestAudit.action).toBe('APPROVAL');
  });

  it('should schedule payment for an invoice', async () => {
    const { result } = renderHook(() => useData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.schedulePayment('inv-1', '2026-10-15', 'Sarah Chen');
    });

    const updated = result.current.invoices.find((i) => i.id === 'inv-1');
    expect(updated?.status).toBe('Payment Scheduled');
    expect(updated?.scheduledPaymentDate).toBe('2026-10-15');
  });

  it('should mark an invoice as paid', async () => {
    const { result } = renderHook(() => useData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.markPaid('inv-1', '2026-10-20', 'Sarah Chen');
    });

    const updated = result.current.invoices.find((i) => i.id === 'inv-1');
    expect(updated?.status).toBe('Paid');
    expect(updated?.paidDate).toBe('2026-10-20');
  });

  it('should create a new vendor and update state', async () => {
    const { result } = renderHook(() => useData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let newVendor: Vendor | undefined;
    await act(async () => {
      newVendor = await result.current.createVendor({
        name: 'Quantum Soft Solutions',
        contactEmail: 'billing@quantumsoft.io',
        paymentTerms: 'Net 30',
        address: '100 Innovation Way, Boston, MA 02110',
        taxId: '04-9876543',
      });
    });

    expect(newVendor).toBeDefined();
    expect(result.current.vendors.some((v) => v.id === newVendor!.id)).toBe(true);
  });

  it('should mark notification as read and mark all notifications as read', async () => {
    const { result } = renderHook(() => useData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const firstNotification = result.current.notifications[0];
    expect(firstNotification).toBeDefined();

    await act(async () => {
      await result.current.markNotificationAsRead(firstNotification.id);
    });

    const updatedFirst = result.current.notifications.find((n) => n.id === firstNotification.id);
    expect(updatedFirst?.read).toBe(true);

    await act(async () => {
      await result.current.markAllNotificationsAsRead();
    });

    expect(result.current.notifications.every((n) => n.read)).toBe(true);
  });

  it('should support error simulation toggle', async () => {
    const { result } = renderHook(() => useData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.simulateError).toBe(false);

    act(() => {
      result.current.setSimulateError(true);
    });

    expect(result.current.simulateError).toBe(true);
    expect(result.current.error).toBeTruthy();

    // With simulate error active, refreshing should record error
    await act(async () => {
      await result.current.refreshAll().catch(() => {});
    });
    expect(result.current.error).toBeTruthy();

    act(() => {
      result.current.setSimulateError(false);
    });

    expect(result.current.simulateError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should throw an error when useData is used outside DataProvider', () => {
    expect(() => {
      renderHook(() => useData());
    }).toThrow('useData must be used within a DataProvider');
  });
});

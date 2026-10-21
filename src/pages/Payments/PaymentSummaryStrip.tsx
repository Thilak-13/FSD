// src/pages/Payments/PaymentSummaryStrip.tsx
import React, { useMemo, useContext } from 'react';
import { DataContext } from '../../context/DataContext';
import { Invoice } from '../../types';

export interface PaymentSummaryStripProps {
  invoices?: Invoice[];
  scheduledTotal?: number;
  paidTotal?: number;
  overdueCount?: number;
  referenceDate?: Date;
  className?: string;
}

export const PaymentSummaryStrip: React.FC<PaymentSummaryStripProps> = ({
  invoices: propInvoices,
  scheduledTotal: propScheduledTotal,
  paidTotal: propPaidTotal,
  overdueCount: propOverdueCount,
  referenceDate,
  className,
}) => {
  const dataContext = useContext(DataContext);
  const invoices = propInvoices || dataContext?.invoices || [];

  const metrics = useMemo(() => {
    // 1. Scheduled Disbursements total: sum of amounts for invoices with status === 'Payment Scheduled'
    const scheduledDisbursements =
      propScheduledTotal !== undefined
        ? propScheduledTotal
        : invoices
            .filter((inv) => inv.status === 'Payment Scheduled')
            .reduce((sum, inv) => sum + (inv.amount || 0), 0);

    // 2. Paid Month-to-Date total: sum of amounts for invoices with status === 'Paid'
    const paidMtd =
      propPaidTotal !== undefined
        ? propPaidTotal
        : invoices
            .filter((inv) => inv.status === 'Paid')
            .reduce((sum, inv) => sum + (inv.amount || 0), 0);

    // 3. Overdue count: count of Approved or Payment Scheduled invoices where dueDate < today
    const todayStr = (referenceDate || new Date()).toISOString().split('T')[0];
    const overdue =
      propOverdueCount !== undefined
        ? propOverdueCount
        : invoices.filter(
            (inv) =>
              (inv.status === 'Approved' || inv.status === 'Payment Scheduled') &&
              Boolean(inv.dueDate && inv.dueDate < todayStr)
          ).length;

    return {
      scheduledDisbursements,
      paidMtd,
      overdue,
    };
  }, [invoices, propScheduledTotal, propPaidTotal, propOverdueCount, referenceDate]);

  return (
    <section
      className={`payments-summary-grid ${className || ''}`.trim()}
      aria-label="Payment Summary Metrics"
    >
      {/* 1. Scheduled Disbursements Total */}
      <div
        className="payments-metric-card metric-scheduled"
        data-testid="metric-scheduled-total"
      >
        <div className="payments-metric-header">
          <span className="payments-metric-label">Scheduled Total</span>
        </div>
        <div>
          <span className="payments-metric-value">
            ₹{metrics.scheduledDisbursements.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        <span className="payments-metric-sub">Scheduled Disbursements</span>
      </div>

      {/* 2. Paid Month-to-Date */}
      <div
        className="payments-metric-card metric-paid"
        data-testid="metric-paid-mtd"
      >
        <div className="payments-metric-header">
          <span className="payments-metric-label">Paid Month-to-Date</span>
        </div>
        <div>
          <span className="payments-metric-value">
            ₹{metrics.paidMtd.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        <span className="payments-metric-sub">Settled Disbursements</span>
      </div>

      {/* 3. Overdue Invoices Count */}
      <div
        className="payments-metric-card metric-overdue"
        data-testid="metric-overdue-count"
      >
        <div className="payments-metric-header">
          <span className="payments-metric-label">Overdue Invoices</span>
        </div>
        <div>
          <span className="payments-metric-value">{metrics.overdue}</span>
        </div>
        <span className="payments-metric-sub">
          {metrics.overdue === 1 ? 'Requires attention' : 'Require attention'}
        </span>
      </div>
    </section>
  );
};

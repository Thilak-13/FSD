import React, { useState, useContext, useMemo } from 'react';
import { DataContext } from '../../context/DataContext';
import { DateRangeFilter } from './DateRangeFilter';
import { ExportButtons, VendorReportRow } from './ExportButtons';
import { VendorBreakdownTable } from './VendorBreakdownTable';
import './reports.css';

export const ReportsPage: React.FC = () => {
  const dataContext = useContext(DataContext);
  const [dateRange, setDateRange] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fallback if rendered without DataProvider
  if (!dataContext) {
    return <div data-testid="page-reports">Reports & Financial Analytics</div>;
  }

  const { invoices, vendors, loading } = dataContext;

  // 1. Filter invoices according to selected Date Range
  const filteredInvoices = useMemo(() => {
    if (dateRange === 'all') return invoices;

    const now = new Date('2026-09-15');
    let cutoff = new Date(now);

    if (dateRange === '30d') {
      cutoff.setDate(now.getDate() - 30);
    } else if (dateRange === 'quarter') {
      cutoff.setDate(now.getDate() - 90);
    } else if (dateRange === 'ytd') {
      cutoff = new Date(now.getFullYear(), 0, 1);
    }

    return invoices.filter((inv) => {
      const invDate = new Date(inv.submittedDate || inv.dueDate);
      return !isNaN(invDate.getTime()) && invDate >= cutoff;
    });
  }, [invoices, dateRange]);

  // 2. Aggregate statistics per vendor
  const vendorRows: VendorReportRow[] = useMemo(() => {
    return vendors.map((vendor) => {
      const vendorInvoices = filteredInvoices.filter((inv) => inv.vendorId === vendor.id);

      let totalBilled = 0;
      let totalPaid = 0;
      let totalDays = 0;
      let completedInvoices = 0;

      vendorInvoices.forEach((inv) => {
        totalBilled += inv.amount;
        if (inv.status === 'Paid') {
          totalPaid += inv.amount;
          // Calculate cycle time between submission and payment/due date
          const start = new Date(inv.submittedDate).getTime();
          const end = new Date(inv.dueDate).getTime();
          if (!isNaN(start) && !isNaN(end) && end >= start) {
            totalDays += (end - start) / (1000 * 60 * 60 * 24);
            completedInvoices += 1;
          }
        }
      });

      const avgProcessingDays = completedInvoices > 0 ? totalDays / completedInvoices : 4.0;
      const pendingBalance = Math.max(0, totalBilled - totalPaid);

      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        taxId: vendor.taxId,
        status: vendor.status,
        paymentTerms: vendor.paymentTerms,
        invoiceCount: vendorInvoices.length,
        totalBilled,
        totalPaid,
        pendingBalance,
        avgProcessingDays,
      };
    });
  }, [vendors, filteredInvoices]);

  // 3. Compute overall high-level summary metrics
  const { totalBilled, totalPaid, pendingBalance } = useMemo(() => {
    let billed = 0;
    let paid = 0;

    filteredInvoices.forEach((inv) => {
      billed += inv.amount;
      if (inv.status === 'Paid') {
        paid += inv.amount;
      }
    });

    return {
      totalBilled: billed,
      totalPaid: paid,
      pendingBalance: Math.max(0, billed - paid),
    };
  }, [filteredInvoices]);

  const handleNotify = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const formatCurrency = (amt: number) => {
    return `₹${amt.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="reports-page-container" data-testid="reports-page-view">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="reports-toast" role="status" aria-live="polite">
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            aria-label="Close notification"
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Header */}
      <div className="reports-header">
        <div className="reports-title-group">
          <h1 className="reports-title">Financial Reports & Spend Analytics</h1>
          <p className="reports-subtitle">
            Comprehensive spend analysis, cycle times, and vendor disbursement reporting
          </p>
        </div>
      </div>

      {/* Controls Bar (Filter + Exports) */}
      <div className="reports-controls-bar">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <ExportButtons rows={vendorRows} onNotify={handleNotify} />
      </div>

      {/* High-Level Metric Strip */}
      <div className="reports-metric-strip">
        <div className="reports-metric-card" data-testid="report-metric-total-billed">
          <h3 className="reports-metric-label">Total Billed</h3>
          <div className="reports-metric-value">{formatCurrency(totalBilled)}</div>
          <p className="reports-metric-sub">Across all invoiced items in period</p>
        </div>
        <div className="reports-metric-card" data-testid="report-metric-total-paid">
          <h3 className="reports-metric-label">Total Disbursed</h3>
          <div
            className="reports-metric-value"
            style={{ color: 'var(--spectrum-global-color-green-700, #2680eb)' }}
          >
            {formatCurrency(totalPaid)}
          </div>
          <p className="reports-metric-sub">Settled and disbursed payments</p>
        </div>
        <div className="reports-metric-card" data-testid="report-metric-pending">
          <h3 className="reports-metric-label">Pending Outstanding</h3>
          <div
            className="reports-metric-value"
            style={{ color: 'var(--spectrum-global-color-orange-700, #e68619)' }}
          >
            {formatCurrency(pendingBalance)}
          </div>
          <p className="reports-metric-sub">Awaiting verification or disbursement</p>
        </div>
        <div className="reports-metric-card" data-testid="report-metric-vendors">
          <h3 className="reports-metric-label">Active Vendors</h3>
          <div className="reports-metric-value">{vendors.length}</div>
          <p className="reports-metric-sub">Registered supplier organizations</p>
        </div>
      </div>

      {/* Vendor Breakdown Table */}
      <VendorBreakdownTable rows={vendorRows} loading={loading} />
    </div>
  );
};

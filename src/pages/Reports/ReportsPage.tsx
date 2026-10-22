import React, { useState, useEffect } from 'react';
import { dataApi } from '../../services/dataSource';
import { ReportsSummaryResponse } from '../../services/api/reports';
import { formatErrorMessage } from '../../context/DataContext';
import { DateRangeFilter } from './DateRangeFilter';
import { ExportButtons, VendorReportRow } from './ExportButtons';
import { VendorBreakdownTable } from './VendorBreakdownTable';
import './reports.css';

const toIsoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Maps a DateRangeFilter value to the `from` date sent to the reports API (undefined = all time). */
export const getRangeStart = (range: string, today: Date = new Date()): string | undefined => {
  if (range === '30d' || range === 'quarter') {
    const days = range === '30d' ? 30 : 90;
    return toIsoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - days));
  }
  if (range === 'ytd') return toIsoDate(new Date(today.getFullYear(), 0, 1));
  return undefined;
};

export const formatCurrency = (amt: number) =>
  `₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const ReportsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<ReportsSummaryResponse | null>(null);
  const [vendorRows, setVendorRows] = useState<VendorReportRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const from = getRangeStart(dateRange);
    setLoading(true);
    setError(null);

    Promise.all([dataApi.getReportsSummary(from), dataApi.getVendorBreakdown(from)])
      .then(([nextSummary, nextRows]) => {
        if (cancelled) return;
        setSummary(nextSummary);
        setVendorRows(nextRows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(formatErrorMessage(err, 'Failed to load report data'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateRange, reloadKey]);

  const handleNotify = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const metric = (value: number | undefined) =>
    loading || value === undefined ? '—' : formatCurrency(value);

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

      {error && (
        <div
          role="alert"
          data-testid="reports-error"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            backgroundColor: 'var(--spectrum-global-color-red-100, #fee2e2)',
            border: '1px solid var(--spectrum-global-color-red-400, #f87171)',
            borderRadius: '4px',
            color: 'var(--spectrum-global-color-red-700, #b91c1c)',
            fontSize: '13px',
          }}
        >
          <span>Could not load reports: {error}</span>
          <button
            type="button"
            className="reports-retry-btn"
            data-testid="reports-retry-btn"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            Retry
          </button>
        </div>
      )}

      {/* High-Level Metric Strip */}
      <div className="reports-metric-strip" aria-busy={loading}>
        <div className="reports-metric-card" data-testid="report-metric-total-billed">
          <h3 className="reports-metric-label">Total Billed</h3>
          <div className="reports-metric-value">{metric(summary?.totalBilled)}</div>
          <p className="reports-metric-sub">Across all invoiced items in period</p>
        </div>
        <div className="reports-metric-card" data-testid="report-metric-total-paid">
          <h3 className="reports-metric-label">Total Disbursed</h3>
          <div
            className="reports-metric-value"
            style={{ color: 'var(--spectrum-global-color-green-700, #2680eb)' }}
          >
            {metric(summary?.totalPaid)}
          </div>
          <p className="reports-metric-sub">Settled and disbursed payments</p>
        </div>
        <div className="reports-metric-card" data-testid="report-metric-pending">
          <h3 className="reports-metric-label">Pending Outstanding</h3>
          <div
            className="reports-metric-value"
            style={{ color: 'var(--spectrum-global-color-orange-700, #e68619)' }}
          >
            {metric(summary?.pendingBalance)}
          </div>
          <p className="reports-metric-sub">Awaiting verification or disbursement</p>
        </div>
        <div className="reports-metric-card" data-testid="report-metric-vendors">
          <h3 className="reports-metric-label">Active Vendors</h3>
          <div className="reports-metric-value">
            {loading ? '—' : vendorRows.filter((r) => r.status === 'Active').length}
          </div>
          <p className="reports-metric-sub">Registered supplier organizations</p>
        </div>
      </div>

      {/* Vendor Breakdown Table */}
      <VendorBreakdownTable rows={vendorRows} loading={loading} />
    </div>
  );
};

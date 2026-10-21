// src/pages/Dashboard/DashboardPage.tsx
import React, { useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataContext } from '../../context/DataContext';
import { AuthContext } from '../../context/AuthContext';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { DataTable, Column } from '../../components/shared/DataTable';
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton';
import { SummaryCard } from './SummaryCard';
import { VolumeChart } from './VolumeChart';
import { StatusBreakdownChart } from './StatusBreakdownChart';
import { Invoice } from '../../types';
import './dashboard.css';

export const DashboardPage: React.FC = () => {
  const dataContext = useDataContext();
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();

  // If DataContext is not provided (e.g. in isolated route-only tests), render fallback
  if (!dataContext) {
    return <div data-testid="page-dashboard">Dashboard Page</div>;
  }

  const { invoices = [], vendors = [], loading = false } = dataContext;
  const currentRole = authContext?.currentRole || 'Requester';
  const currentUser = authContext?.currentUser;

  // Vendor Lookup Map
  const vendorMap = useMemo(() => {
    return new Map(vendors.map((v) => [v.id, v.name]));
  }, [vendors]);

  // KPI Calculations
  const { spendPending, requiresApprovalCount, flaggedCount, scheduledDisbursements } =
    useMemo(() => {
      let pending = 0;
      let approvalCount = 0;
      let flagged = 0;
      let scheduled = 0;

      invoices.forEach((inv) => {
        if (
          inv.status === 'Submitted' ||
          inv.status === 'Under Verification' ||
          inv.status === 'Flagged'
        ) {
          pending += inv.amount;
        }
        if (inv.status === 'Submitted') {
          approvalCount += 1;
        }
        if (inv.status === 'Flagged') {
          flagged += 1;
        }
        if (inv.status === 'Payment Scheduled') {
          scheduled += inv.amount;
        }
      });

      return {
        spendPending: pending,
        requiresApprovalCount: approvalCount,
        flaggedCount: flagged,
        scheduledDisbursements: scheduled,
      };
    }, [invoices]);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Recent 5 invoices sorted by date/id descending
  const recentInvoices = useMemo(() => {
    return [...invoices]
      .sort((a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime())
      .slice(0, 5);
  }, [invoices]);

  const recentColumns: Column<Invoice>[] = useMemo(
    () => [
      {
        key: 'invoiceNumber',
        title: 'Invoice #',
        sortable: false,
        render: (inv) => <strong>{inv.invoiceNumber}</strong>,
      },
      {
        key: 'vendorId',
        title: 'Vendor',
        sortable: false,
        render: (inv) => vendorMap.get(inv.vendorId) || inv.vendorId,
      },
      {
        key: 'amount',
        title: 'Amount',
        sortable: false,
        render: (inv) => (
          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
            {formatCurrency(inv.amount)}
          </span>
        ),
      },
      {
        key: 'dueDate',
        title: 'Due Date',
        sortable: false,
        render: (inv) => inv.dueDate,
      },
      {
        key: 'status',
        title: 'Status',
        sortable: false,
        render: (inv) => <StatusBadge status={inv.status} />,
      },
      {
        key: 'actions',
        title: 'Actions',
        sortable: false,
        render: (inv) => (
          <button
            type="button"
            className="quick-link-btn"
            style={{ padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/invoices/${inv.id}`);
            }}
            data-testid={`recent-view-${inv.id}`}
            aria-label={`View invoice ${inv.invoiceNumber}`}
          >
            View
          </button>
        ),
      },
    ],
    [vendorMap, navigate]
  );

  return (
    <div className="dashboard-container" data-testid="page-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-title-group">
          <h1 className="dashboard-title">Executive Dashboard</h1>
          <p className="dashboard-subtitle">
            Real-time overview of invoices, approval pipelines, and cash disbursements
          </p>
        </div>
        <div className="dashboard-user-badge">
          <span>Active Role:</span>
          <StatusBadge label={currentRole} variant={currentRole === 'Admin' ? 'positive' : currentRole === 'Approver' ? 'info' : 'notice'} />
          <span>{currentUser?.name || currentRole}</span>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <h2
        className="visually-hidden"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        Key Performance Indicators
      </h2>
      {loading ? (
        <div
          className="kpi-grid"
          data-testid="dashboard-loading-skeleton"
          aria-label="Loading summary metrics"
        >
          <div className="visually-hidden" data-testid="dashboard-kpi-skeleton" />
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="summary-card"
              data-testid={`kpi-skeleton-${i}`}
              style={{ minHeight: '110px' }}
            >
              <LoadingSkeleton lines={3} height={18} ariaLabel="Loading KPI metric..." />
            </div>
          ))}
        </div>
      ) : (
        <div className="kpi-grid">
          <SummaryCard
            id="kpi-spend-pending"
            title="Total Spend Pending"
            value={formatCurrency(spendPending)}
            subtitle="Across unapproved & flagged invoices"
            trendType="notice"
          />
          <SummaryCard
            id="kpi-requires-approval"
            title="Invoices Requiring Approval"
            value={String(requiresApprovalCount)}
            subtitle="Awaiting triage or review"
            trendType="notice"
          />
          <SummaryCard
            id="kpi-flagged-discrepancies"
            title="Flagged Invoices"
            value={String(flaggedCount)}
            subtitle="PO matching variances"
            trendType="negative"
          />
          <SummaryCard
            id="kpi-scheduled-disbursements"
            title="Scheduled Disbursements"
            value={formatCurrency(scheduledDisbursements)}
            subtitle="Awaiting disbursement batch"
            trendType="positive"
          />
        </div>
      )}

      {/* Charts Grid */}
      <h2
        className="visually-hidden"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        Financial Analytics
      </h2>
      {loading ? (
        <div
          className="charts-grid"
          data-testid="dashboard-charts-skeleton"
          aria-label="Loading financial analytics"
        >
          <div className="chart-card" data-testid="volume-chart-skeleton" style={{ minHeight: '340px' }}>
            <div className="chart-header">
              <LoadingSkeleton lines={1} height={20} width="60%" ariaLabel="Loading volume chart title..." />
            </div>
            <div className="chart-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '260px' }}>
              <LoadingSkeleton lines={6} height={28} width="100%" ariaLabel="Loading spend & volume chart..." />
            </div>
          </div>
          <div className="chart-card" data-testid="status-chart-skeleton" style={{ minHeight: '340px' }}>
            <div className="chart-header">
              <LoadingSkeleton lines={1} height={20} width="60%" ariaLabel="Loading status chart title..." />
            </div>
            <div className="chart-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '260px' }}>
              <LoadingSkeleton lines={6} height={28} width="100%" ariaLabel="Loading status breakdown chart..." />
            </div>
          </div>
        </div>
      ) : (
        <div className="charts-grid">
          <VolumeChart invoices={invoices} />
          <StatusBreakdownChart invoices={invoices} />
        </div>
      )}

      {/* Quick Action Navigation */}
      <div className="quick-actions-card">
        <h2 className="quick-actions-title">Quick Actions & Workflows</h2>
        <div className="quick-actions-grid">
          {(currentRole === 'Admin' || currentRole === 'Approver') && (
            <button
              type="button"
              className="quick-link-btn"
              data-testid="quick-link-approvals"
              onClick={() => navigate('/approvals')}
            >
              Go to Approvals Queue
            </button>
          )}
          <button
            type="button"
            className="quick-link-btn"
            data-testid="quick-link-invoices"
            onClick={() => navigate('/invoices')}
          >
            Invoices Directory
          </button>
          {(currentRole === 'Admin' || currentRole === 'Approver') && (
            <button
              type="button"
              className="quick-link-btn"
              data-testid="quick-link-payments"
              onClick={() => navigate('/payments')}
            >
              Payments & Disbursements
            </button>
          )}
          <button
            type="button"
            className="quick-link-btn"
            data-testid="quick-link-vendors"
            onClick={() => navigate('/vendors')}
          >
            Vendor Directory
          </button>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="recent-invoices-card">
        <div className="recent-invoices-header">
          <h2 className="recent-invoices-title">Recent Invoices</h2>
          <button
            type="button"
            className="quick-link-btn"
            style={{ fontSize: '12px', padding: '6px 12px', cursor: 'pointer' }}
            onClick={() => navigate('/invoices')}
          >
            View All Invoices
          </button>
        </div>
        <DataTable
          columns={recentColumns}
          data={recentInvoices}
          loading={loading}
          searchable={false}
          onRowClick={(inv) => navigate(`/invoices/${inv.id}`)}
          emptyMessage="No recent invoices found"
        />
      </div>
    </div>
  );
};

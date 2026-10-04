// src/pages/Dashboard/DashboardPage.tsx
import React, { useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataContext } from '../../context/DataContext';
import { AuthContext } from '../../context/AuthContext';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { DataTable, Column } from '../../components/shared/DataTable';
import { Card } from '@swc-react/card';
import { ActionButton } from '@swc-react/action-button';
import { SummaryCard } from './SummaryCard';
import { VolumeChart } from './VolumeChart';
import { StatusBreakdownChart } from './StatusBreakdownChart';
import { Invoice } from '../../types';
import './dashboard.css';

export const DashboardPage: React.FC = () => {
  const dataContext = useContext(DataContext);
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();

  // If DataContext is not provided (e.g. in isolated route-only tests), render fallback
  if (!dataContext) {
    return <div data-testid="page-dashboard">Dashboard Page</div>;
  }

  const { invoices, vendors } = dataContext;
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
    return `$${amount.toLocaleString('en-US', {
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
          <ActionButton
            size="s"
            className="quick-link-btn"
            style={{ padding: '4px 10px', fontSize: '12px' }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/invoices/${inv.id}`);
            }}
            data-testid={`recent-view-${inv.id}`}
            aria-label={`View invoice ${inv.invoiceNumber}`}
            role="button"
          >
            View
          </ActionButton>
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
          subtitle="3-way matching variances"
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
      <div className="charts-grid">
        <VolumeChart invoices={invoices} />
        <StatusBreakdownChart invoices={invoices} />
      </div>

      {/* Quick Action Navigation */}
      <Card className="quick-actions-card">
        <h2 className="quick-actions-title">Quick Actions & Workflows</h2>
        <div className="quick-actions-grid">
          {(currentRole === 'Admin' || currentRole === 'Approver') && (
            <ActionButton
              className="quick-link-btn"
              data-testid="quick-link-approvals"
              role="button"
              onClick={() => navigate('/approvals')}
            >
              Go to Approvals Queue
            </ActionButton>
          )}
          <ActionButton
            className="quick-link-btn"
            data-testid="quick-link-invoices"
            role="button"
            onClick={() => navigate('/invoices')}
          >
            Invoices Directory
          </ActionButton>
          {(currentRole === 'Admin' || currentRole === 'Approver') && (
            <ActionButton
              className="quick-link-btn"
              data-testid="quick-link-payments"
              role="button"
              onClick={() => navigate('/payments')}
            >
              Payments & Disbursements
            </ActionButton>
          )}
          <ActionButton
            className="quick-link-btn"
            data-testid="quick-link-vendors"
            role="button"
            onClick={() => navigate('/vendors')}
          >
            Vendor Directory
          </ActionButton>
        </div>
      </Card>

      {/* Recent Invoices Table */}
      <Card className="recent-invoices-card">
        <div className="recent-invoices-header">
          <h2 className="recent-invoices-title">Recent Invoices</h2>
          <ActionButton
            size="s"
            className="quick-link-btn"
            style={{ fontSize: '12px', padding: '6px 12px' }}
            role="button"
            onClick={() => navigate('/invoices')}
          >
            View All Invoices
          </ActionButton>
        </div>
        <DataTable
          columns={recentColumns}
          data={recentInvoices}
          searchable={false}
          onRowClick={(inv) => navigate(`/invoices/${inv.id}`)}
          emptyMessage="No recent invoices found"
        />
      </Card>
    </div>
  );
};

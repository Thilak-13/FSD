// src/pages/AuditLog/AuditLogPage.tsx
import React, { useState, useMemo, useContext } from 'react';
import { Link } from 'react-router-dom';
import { DataContext } from '../../context/DataContext';
import { Picker } from '@swc-react/picker';
import { MenuItem } from '@swc-react/menu';
import { Card } from '@swc-react/card';
import { DataTable, Column } from '../../components/shared/DataTable';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { AuditEntry, StatusLightVariant } from '../../types';
import './auditLog.css';

export const AuditLogPage: React.FC = () => {
  const dataContext = useContext(DataContext);

  // Fallback if rendered without DataProvider
  if (!dataContext) {
    return <div data-testid="page-audit-log">Audit Log Trail</div>;
  }

  const { auditLog, loading } = dataContext;

  // Filter state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  // Filtered audit entries
  const filteredEntries = useMemo(() => {
    return auditLog.filter((entry) => {
      if (actionFilter !== 'all' && entry.action !== actionFilter) {
        return false;
      }
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase().trim();
        const matchActor = entry.performedBy?.toLowerCase().includes(query);
        const matchInvoice = entry.invoiceId?.toLowerCase().includes(query);
        const matchDetails = entry.details?.toLowerCase().includes(query);
        const matchAction = entry.action?.toLowerCase().includes(query);
        if (!matchActor && !matchInvoice && !matchDetails && !matchAction) {
          return false;
        }
      }
      return true;
    });
  }, [auditLog, actionFilter, searchTerm]);

  const getActionVariant = (action: string): StatusLightVariant => {
    switch (action) {
      case 'APPROVAL':
      case 'PAYMENT_COMPLETED':
        return 'positive';
      case 'VERIFICATION':
      case 'PAYMENT_SCHEDULED':
        return 'notice';
      case 'FLAGGED':
        return 'negative';
      default:
        return 'info';
    }
  };

  const columns: Column<AuditEntry>[] = [
    {
      key: 'timestamp',
      title: 'Timestamp',
      sortable: true,
      render: (item) => (
        <span className="audit-timestamp">
          {new Date(item.timestamp).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'action',
      title: 'Action',
      sortable: true,
      render: (item) => (
        <StatusBadge variant={getActionVariant(item.action)}>
          {item.action}
        </StatusBadge>
      ),
    },
    {
      key: 'performedBy',
      title: 'Performed By',
      sortable: true,
      render: (item) => <span className="audit-actor">{item.performedBy}</span>,
    },
    {
      key: 'invoiceId',
      title: 'Invoice ID',
      sortable: true,
      render: (item) => (
        <Link to={`/invoices/${item.invoiceId}`} className="audit-invoice-link">
          {item.invoiceId}
        </Link>
      ),
    },
    {
      key: 'details',
      title: 'Details',
      render: (item) => <span className="audit-details">{item.details || '—'}</span>,
    },
  ];

  return (
    <div className="audit-log-container" data-testid="audit-log-page-view">
      {/* Header */}
      <div className="audit-log-header">
        <div className="audit-log-title-group">
          <h1 className="audit-log-title">System Audit Trail</h1>
          <p className="audit-log-subtitle">
            Immutable security and compliance log of all platform activities
          </p>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="audit-controls-bar">
        <div className="audit-search-group">
          <input
            type="text"
            data-testid="audit-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by actor, invoice, or details..."
            aria-label="Search audit entries"
            className="audit-search-input"
          />
        </div>

        <div className="audit-filter-group">
          <label htmlFor="audit-action-filter" className="audit-filter-label">
            Action Type:
          </label>
          <Picker
            id="audit-action-filter"
            data-testid="audit-action-filter"
            value={actionFilter}
            label="Action Type"
            aria-label="Filter by action"
            className="audit-filter-select"
            change={(e: any) => setActionFilter(e.target?.value || '')}
            ref={(node: any) => {
              if (node && !node.__hasChangeListener) {
                node.__hasChangeListener = true;
                node.addEventListener('change', (e: any) => {
                  const val = e.target?.value !== undefined ? e.target.value : (node.value || '');
                  setActionFilter(val);
                });
              }
            }}
          >
            <MenuItem value="all">All Actions</MenuItem>
            <MenuItem value="SUBMISSION">SUBMISSION</MenuItem>
            <MenuItem value="VERIFICATION">VERIFICATION</MenuItem>
            <MenuItem value="APPROVAL">APPROVAL</MenuItem>
            <MenuItem value="FLAGGED">FLAGGED</MenuItem>
            <MenuItem value="PAYMENT_SCHEDULED">PAYMENT_SCHEDULED</MenuItem>
            <MenuItem value="PAYMENT_COMPLETED">PAYMENT_COMPLETED</MenuItem>
          </Picker>
        </div>
      </div>

      {/* Table Card */}
      <Card data-testid="audit-log-table" className="audit-table-card">
        <DataTable<AuditEntry>
          columns={columns}
          data={filteredEntries}
          loading={loading}
          pagination
          pageSize={10}
          searchable={false}
          ariaLabel="System Audit Log Table"
          emptyTitle="No audit records"
          emptyMessage="No audit trail events match your criteria."
        />
      </Card>
    </div>
  );
};

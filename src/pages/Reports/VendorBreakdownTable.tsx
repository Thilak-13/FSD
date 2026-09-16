// src/pages/Reports/VendorBreakdownTable.tsx
import React, { useMemo } from 'react';
import { DataTable, Column } from '../../components/shared/DataTable';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { VendorReportRow } from './ExportButtons';

export interface VendorBreakdownTableProps {
  rows: VendorReportRow[];
  loading?: boolean;
}

export const VendorBreakdownTable: React.FC<VendorBreakdownTableProps> = ({ rows, loading }) => {
  const columns: Column<VendorReportRow>[] = useMemo(
    () => [
      {
        key: 'vendorName',
        title: 'Vendor Name',
        sortable: true,
        render: (row) => <strong>{row.vendorName}</strong>,
      },
      {
        key: 'status',
        title: 'Status',
        sortable: true,
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: 'paymentTerms',
        title: 'Payment Terms',
        sortable: true,
        render: (row) => row.paymentTerms,
      },
      {
        key: 'invoiceCount',
        title: 'Invoices',
        sortable: true,
        render: (row) => row.invoiceCount,
      },
      {
        key: 'totalBilled',
        title: 'Total Billed',
        sortable: true,
        render: (row) => (
          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
            ${row.totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        key: 'totalPaid',
        title: 'Total Paid',
        sortable: true,
        render: (row) => (
          <span style={{ fontFamily: 'monospace', color: 'var(--spectrum-global-color-green-700, #2680eb)', fontWeight: 600 }}>
            ${row.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        key: 'pendingBalance',
        title: 'Pending Balance',
        sortable: true,
        render: (row) => (
          <span style={{ fontFamily: 'monospace', color: 'var(--spectrum-global-color-orange-700, #e68619)', fontWeight: 600 }}>
            ${row.pendingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        key: 'avgProcessingDays',
        title: 'Avg Cycle',
        sortable: true,
        render: (row) => `${row.avgProcessingDays.toFixed(1)} days`,
      },
    ],
    []
  );

  return (
    <div className="reports-table-card" data-testid="vendor-breakdown-table">
      <div className="reports-table-header">
        <h3 className="reports-table-title">Vendor Spend Breakdown</h3>
      </div>
      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        searchable={true}
        emptyMessage="No vendor reporting data found"
      />
    </div>
  );
};

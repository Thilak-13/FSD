// tests/components/DOMInspection.test.tsx
import { describe, it } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SideNav } from '../../src/components/layout/SideNav';
import { SummaryCard } from '../../src/pages/Dashboard/SummaryCard';
import { DataTable } from '../../src/components/shared/DataTable';
import { AuthProvider } from '../../src/context/AuthContext';

describe('DOM Tree Inspection', () => {
  it('prints outerHTML for SideNav', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider initialRole="Admin">
          <SideNav />
        </AuthProvider>
      </MemoryRouter>
    );
    console.log('=== SIDENAV OUTER_HTML START ===');
    console.log(container.querySelector('.app-sidebar')?.outerHTML);
    console.log('=== SIDENAV OUTER_HTML END ===');
  });

  it('prints outerHTML for SummaryCard', () => {
    const { container } = render(
      <SummaryCard
        id="kpi-spend-pending"
        title="Total Spend Pending"
        value="$124,500.00"
        subtitle="Across unapproved & flagged invoices"
        trendType="notice"
      />
    );
    console.log('=== SUMMARY_CARD OUTER_HTML START ===');
    console.log(container.firstElementChild?.outerHTML);
    console.log('=== SUMMARY_CARD OUTER_HTML END ===');
  });

  it('prints outerHTML for Invoice DataTable', () => {
    const columns = [
      { key: 'invoiceNumber', title: 'Invoice #' },
      { key: 'vendorName', title: 'Vendor' },
      { key: 'amount', title: 'Amount' },
    ];
    const data = [
      { id: '1', invoiceNumber: 'INV-001', vendorName: 'Acme Corp', amount: '$1,200' },
    ];
    const { container } = render(
      <DataTable columns={columns} data={data} />
    );
    console.log('=== INVOICE_TABLE OUTER_HTML START ===');
    console.log(container.querySelector('.spectrum-data-table-container')?.outerHTML);
    console.log('=== INVOICE_TABLE OUTER_HTML END ===');
  });
});

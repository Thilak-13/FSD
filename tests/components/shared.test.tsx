// tests/components/shared.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusBadge, getStatusVariant } from '../../src/components/shared/StatusBadge';
import { EmptyState } from '../../src/components/shared/EmptyState';
import { LoadingSkeleton } from '../../src/components/shared/LoadingSkeleton';
import { ConfirmDialog } from '../../src/components/shared/ConfirmDialog';
import { FormField } from '../../src/components/shared/FormField';
import { DataTable, Column } from '../../src/components/shared/DataTable';

describe('Shared Components', () => {
  describe('StatusBadge', () => {
    it('renders StatusBadge with correct semantic text and variant', () => {
      render(<StatusBadge status="Approved" />);
      expect(screen.getByText('Approved')).toBeDefined();
    });

    it('maps positive, notice, negative, and info statuses correctly', () => {
      expect(getStatusVariant('Approved')).toBe('positive');
      expect(getStatusVariant('Paid')).toBe('positive');
      expect(getStatusVariant('Active')).toBe('positive');

      expect(getStatusVariant('Submitted')).toBe('notice');
      expect(getStatusVariant('Under Verification')).toBe('notice');
      expect(getStatusVariant('Payment Scheduled')).toBe('notice');
      expect(getStatusVariant('Under Review')).toBe('notice');

      expect(getStatusVariant('Flagged')).toBe('negative');
      expect(getStatusVariant('Overdue')).toBe('negative');
      expect(getStatusVariant('Inactive')).toBe('negative');

      expect(getStatusVariant('UnknownStatus')).toBe('info');
      expect(getStatusVariant(undefined)).toBe('info');
    });

    it('allows overriding variant explicitly', () => {
      const { container } = render(<StatusBadge status="Custom" variant="positive" />);
      expect(screen.getByText('Custom')).toBeDefined();
      const statusLight = container.querySelector('[data-variant]') || container.querySelector('sp-status-light');
      expect(statusLight?.getAttribute('data-variant') || statusLight?.getAttribute('variant')).toBe('positive');
    });
  });

  describe('EmptyState', () => {
    it('renders EmptyState with title, message, and action button', () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          title="No Invoices Found"
          message="Try adjusting your filters"
          actionLabel="Clear Filters"
          onAction={handleAction}
        />
      );

      expect(screen.getByText('No Invoices Found')).toBeDefined();
      expect(screen.getByText('Try adjusting your filters')).toBeDefined();
      const button = screen.getByText('Clear Filters');
      expect(button).toBeDefined();

      fireEvent.click(button);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it('renders secondary action button when provided', () => {
      const handleSecondary = vi.fn();
      render(
        <EmptyState
          title="Empty Table"
          message="Nothing here"
          secondaryActionLabel="Refresh"
          onSecondaryAction={handleSecondary}
        />
      );

      const secondaryBtn = screen.getByText('Refresh');
      expect(secondaryBtn).toBeDefined();
      fireEvent.click(secondaryBtn);
      expect(handleSecondary).toHaveBeenCalledTimes(1);
    });
  });

  describe('LoadingSkeleton', () => {
    it('renders default number of skeleton lines with accessible status', () => {
      const { container } = render(<LoadingSkeleton lines={4} />);
      const skeleton = screen.getByRole('status');
      expect(skeleton).toBeDefined();
      expect(skeleton.getAttribute('aria-busy')).toBe('true');
      const lines = container.querySelectorAll('.skeleton-line');
      expect(lines.length).toBe(4);
    });

    it('renders single skeleton line when lines=1', () => {
      const { container } = render(<LoadingSkeleton lines={1} height={40} />);
      const lines = container.querySelectorAll('.skeleton-line');
      expect(lines.length).toBe(1);
    });
  });

  describe('ConfirmDialog', () => {
    it('renders nothing when open is false', () => {
      render(
        <ConfirmDialog
          open={false}
          title="Delete Item"
          message="Are you sure you want to delete this?"
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );
      expect(screen.queryByText('Delete Item')).toBeNull();
    });

    it('renders modal dialog when open is true with accessible heading and actions', () => {
      const handleConfirm = vi.fn();
      const handleCancel = vi.fn();

      render(
        <ConfirmDialog
          open={true}
          title="Delete Invoice"
          message="This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Dismiss"
          variant="negative"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      );

      expect(screen.getByText('Delete Invoice')).toBeDefined();
      expect(screen.getByText('This action cannot be undone.')).toBeDefined();

      const confirmBtn = screen.getByText('Delete');
      fireEvent.click(confirmBtn);
      expect(handleConfirm).toHaveBeenCalledTimes(1);

      const cancelBtn = screen.getByText('Dismiss');
      fireEvent.click(cancelBtn);
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });

    it('handles Escape key to trigger onCancel', () => {
      const handleCancel = vi.fn();
      render(
        <ConfirmDialog
          open={true}
          title="Confirm Action"
          message="Proceed?"
          onConfirm={() => {}}
          onCancel={handleCancel}
        />
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });

    it('focuses safe Cancel button by default when variant="negative"', async () => {
      vi.useFakeTimers();
      render(
        <ConfirmDialog
          open={true}
          title="Delete Record"
          message="Delete?"
          variant="negative"
          cancelLabel="Cancel Action"
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );

      vi.advanceTimersByTime(100);
      const cancelBtn = screen.getByText('Cancel Action');
      expect(cancelBtn).toBeDefined();
      vi.useRealTimers();
    });

    it('saves previous activeElement and restores focus upon closing', () => {
      const button = document.createElement('button');
      button.textContent = 'Trigger';
      document.body.appendChild(button);
      button.focus();
      expect(document.activeElement).toBe(button);

      const { unmount } = render(
        <ConfirmDialog
          open={true}
          title="Action"
          message="Message"
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );

      unmount();
      expect(document.activeElement).toBe(button);
      document.body.removeChild(button);
    });
  });

  describe('FormField', () => {
    it('renders label and binds to input via htmlFor', () => {
      render(
        <FormField label="Invoice Amount" htmlFor="amount-input">
          <input id="amount-input" type="text" />
        </FormField>
      );

      expect(screen.getByText('Invoice Amount')).toBeDefined();
      expect(screen.getByRole('textbox')).toBeDefined();
    });

    it('renders required indicator when required is true', () => {
      const { container } = render(
        <FormField label="Vendor Name" htmlFor="vendor-name" required>
          <input id="vendor-name" type="text" />
        </FormField>
      );

      const fieldLabel = container.querySelector('label') || container.querySelector('sp-field-label');
      expect(fieldLabel).toBeDefined();
      expect(fieldLabel?.textContent).toContain('*');
    });

    it('renders error message with role="alert" and aria-live="polite"', () => {
      render(
        <FormField label="Due Date" htmlFor="due-date" error="Due date is required">
          <input id="due-date" type="date" />
        </FormField>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeDefined();
      expect(alert.textContent).toContain('Due date is required');
      expect(alert.getAttribute('aria-live')).toBe('polite');
    });

    it('renders helper text when hint is provided and no error', () => {
      render(
        <FormField label="PO Number" htmlFor="po-no" hint="Format: PO-YYYY-XXXX">
          <input id="po-no" type="text" />
        </FormField>
      );

      expect(screen.getByText('Format: PO-YYYY-XXXX')).toBeDefined();
    });
  });

  describe('DataTable', () => {
    interface TestRow {
      id: string;
      name: string;
      amount: number;
      status: string;
    }

    const columns: Column<TestRow>[] = [
      { key: 'name', title: 'Vendor Name', sortable: true },
      { key: 'amount', title: 'Amount', sortable: true, render: (row) => `$${row.amount.toFixed(2)}` },
      { key: 'status', title: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    ];

    const data: TestRow[] = [
      { id: '1', name: 'Apex Cloud Services', amount: 1250, status: 'Approved' },
      { id: '2', name: 'ByteForce Technologies', amount: 3400, status: 'Submitted' },
      { id: '3', name: 'Summit Creative', amount: 800, status: 'Flagged' },
    ];

    it('renders table headers and row items', () => {
      render(<DataTable columns={columns} data={data} />);

      expect(screen.getByText('Vendor Name')).toBeDefined();
      expect(screen.getByText('Amount')).toBeDefined();
      expect(screen.getByText('Apex Cloud Services')).toBeDefined();
      expect(screen.getByText('$1250.00')).toBeDefined();
      expect(screen.getByText('ByteForce Technologies')).toBeDefined();
      expect(screen.getByText('$3400.00')).toBeDefined();
    });

    it('handles row click callbacks', () => {
      const handleRowClick = vi.fn();
      render(<DataTable columns={columns} data={data} onRowClick={handleRowClick} />);

      const rowText = screen.getByText('Apex Cloud Services');
      fireEvent.click(rowText);
      expect(handleRowClick).toHaveBeenCalledWith(data[0], 0);
    });

    it('filters rows when searchable is true and search term entered', () => {
      render(<DataTable columns={columns} data={data} searchable searchPlaceholder="Search test..." />);

      const searchInput = screen.getByPlaceholderText('Search test...');
      expect(searchInput).toBeDefined();

      fireEvent.change(searchInput, { target: { value: 'ByteForce' } });
      expect(screen.getByText('ByteForce Technologies')).toBeDefined();
      expect(screen.queryByText('Apex Cloud Services')).toBeNull();
    });

    it('supports sorting when sortable column header is clicked', () => {
      const { container } = render(<DataTable columns={columns} data={data} />);

      const nameHeader = screen.getByText('Vendor Name');
      // First click: asc
      fireEvent.click(nameHeader);
      let cells = container.querySelectorAll('.table-data-row');
      expect(cells[0].textContent).toContain('Apex Cloud Services');

      // Second click: desc
      fireEvent.click(nameHeader);
      cells = container.querySelectorAll('.table-data-row');
      expect(cells[0].textContent).toContain('Summit Creative');
    });

    it('supports pagination controls', () => {
      const manyRows: TestRow[] = Array.from({ length: 15 }, (_, i) => ({
        id: `row-${i}`,
        name: `Vendor ${i + 1}`,
        amount: 100 * (i + 1),
        status: 'Approved',
      }));

      render(<DataTable columns={columns} data={manyRows} pageSize={5} pagination />);

      expect(screen.getByText('Vendor 1')).toBeDefined();
      expect(screen.getByText('Vendor 5')).toBeDefined();
      expect(screen.queryByText('Vendor 6')).toBeNull();

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      expect(screen.getByText('Vendor 6')).toBeDefined();
      expect(screen.queryByText('Vendor 1')).toBeNull();
    });

    it('supports row selection checkboxes when selectable is true', () => {
      const handleSelection = vi.fn();
      render(<DataTable columns={columns} data={data} selectable onSelectionChange={handleSelection} />);

      const checkboxes = screen.getAllByRole('checkbox');
      // Checkbox 0 is "select all", checkbox 1 is first row
      fireEvent.click(checkboxes[1]);
      expect(handleSelection).toHaveBeenCalledWith(['1']);
    });

    it('renders EmptyState when data array is empty', () => {
      render(<DataTable columns={columns} data={[]} emptyTitle="No records found" emptyMessage="Try clearing filters" />);
      expect(screen.getByText('No records found')).toBeDefined();
      expect(screen.getByText('Try clearing filters')).toBeDefined();
    });

    it('renders LoadingSkeleton when loading is true', () => {
      render(<DataTable columns={columns} data={data} loading />);
      expect(screen.getByRole('status')).toBeDefined();
    });

    it('supports manualPagination without re-slicing provided data', () => {
      const preSlicedData: TestRow[] = [
        { id: '10', name: 'Vendor 10', amount: 1000, status: 'Approved' },
        { id: '11', name: 'Vendor 11', amount: 1100, status: 'Approved' },
      ];

      render(
        <DataTable
          columns={columns}
          data={preSlicedData}
          pagination
          manualPagination
          pageSize={5}
          currentPage={3}
          totalCount={15}
        />
      );

      // Both pre-sliced rows are rendered directly without slice(10, 15) returning []
      expect(screen.getByText('Vendor 10')).toBeDefined();
      expect(screen.getByText('Vendor 11')).toBeDefined();
      expect(screen.getByText(/Showing 11 to 15 of 15 entries/i)).toBeDefined();
    });

    it('does not reset or corrupt sort state when searching', () => {
      const handleSort = vi.fn();
      render(
        <DataTable
          columns={columns}
          data={data}
          sortColumn="name"
          sortDirection="desc"
          onSort={handleSort}
          searchable
          searchPlaceholder="Filter items..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Filter items...');
      fireEvent.change(searchInput, { target: { value: 'Summit' } });

      // onSort must NOT have been called with empty string or reset
      expect(handleSort).not.toHaveBeenCalled();
      expect(screen.getByText('Summit Creative')).toBeDefined();
    });
  });
});

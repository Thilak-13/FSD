// tests/pages/ResourceErrors.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../src/context/AuthContext';
import { DataProvider } from '../../src/context/DataContext';
import { dataApi } from '../../src/services/dataSource';
import { setMockDelayEnabled, resetInvoices, resetVendors } from '../../src/services/mockApi';
import { ResourceErrorAlert } from '../../src/components/shared/ResourceErrorAlert';
import { VendorsPage } from '../../src/pages/Vendors/VendorsPage';
import { InvoicesPage } from '../../src/pages/Invoices/InvoicesPage';

const renderWithData = (page: React.ReactElement) =>
  render(
    <MemoryRouter>
      <AuthProvider initialRole="Admin">
        <DataProvider>{page}</DataProvider>
      </AuthProvider>
    </MemoryRouter>
  );

describe('Resource error alerts on data pages', () => {
  beforeEach(() => {
    setMockDelayEnabled(false);
    sessionStorage.clear();
    resetInvoices();
    resetVendors();
    vi.restoreAllMocks();
  });

  it('renders nothing when there is no error', () => {
    render(<ResourceErrorAlert message={null} onRetry={vi.fn()} />);
    expect(screen.queryByTestId('resource-error-alert')).toBeNull();
  });

  it('shows the vendors error on VendorsPage and clears it after a successful retry', async () => {
    vi.spyOn(dataApi, 'getVendors').mockRejectedValueOnce(new Error('Vendor service down'));
    renderWithData(<VendorsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('resource-error-alert').textContent).toContain('Vendor service down');
    });

    fireEvent.click(screen.getByTestId('resource-error-retry'));

    await waitFor(() => {
      expect(screen.queryByTestId('resource-error-alert')).toBeNull();
      expect(screen.getAllByText('Apex Cloud Services').length).toBeGreaterThan(0);
    });
  });

  it('shows the invoices error on InvoicesPage', async () => {
    vi.spyOn(dataApi, 'getInvoices').mockRejectedValueOnce(new Error('Invoice service down'));
    renderWithData(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('resource-error-alert').textContent).toContain('Invoice service down');
    });
  });
});

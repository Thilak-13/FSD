// tests/components/GlobalSearch.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from '../../src/context/AuthContext';
import { DataProvider } from '../../src/context/DataContext';
import { setMockDelayEnabled, resetInvoices, resetVendors } from '../../src/services/mockApi';
import { GlobalSearch } from '../../src/components/layout/GlobalSearch';
import { InvoicesPage } from '../../src/pages/Invoices/InvoicesPage';

const LocationDisplay: React.FC = () => {
  const location = useLocation();
  return <div data-testid="current-location">{location.pathname + location.search}</div>;
};

const renderSearch = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider initialRole="Admin">
        <DataProvider>
          <GlobalSearch />
          <Routes>
            <Route path="*" element={<LocationDisplay />} />
          </Routes>
        </DataProvider>
      </AuthProvider>
    </MemoryRouter>
  );

describe('GlobalSearch', () => {
  beforeEach(() => {
    setMockDelayEnabled(false);
    sessionStorage.clear();
    resetInvoices();
    resetVendors();
  });

  it('debounces input, then lists matching invoices and vendors', async () => {
    renderSearch();
    const input = screen.getByRole('combobox', { name: 'Search' });

    fireEvent.change(input, { target: { value: 'apex' } });
    // Not shown until the debounce elapses
    expect(screen.queryByTestId('global-search-results')).toBeNull();

    await waitFor(() => {
      const labels = screen.getAllByTestId('global-search-option').map((o) => o.textContent);
      expect(labels.some((t) => t?.includes('Apex Cloud Services') && t.includes('Vendor'))).toBe(true);
      expect(labels.some((t) => t?.includes('INV-2026-001'))).toBe(true);
    });
    expect(input.getAttribute('aria-expanded')).toBe('true');
  });

  it('navigates to the vendor when a vendor result is clicked', async () => {
    renderSearch();
    fireEvent.change(screen.getByRole('combobox', { name: 'Search' }), {
      target: { value: 'Apex Cloud' },
    });

    const vendorOption = await waitFor(() => {
      const option = screen
        .getAllByTestId('global-search-option')
        .find((o) => o.textContent?.includes('Vendor'));
      expect(option).toBeDefined();
      return option!;
    });
    fireEvent.mouseDown(vendorOption);

    expect(screen.getByTestId('current-location').textContent).toBe('/vendors/vendor-1');
  });

  it('opens an invoice with arrow keys + Enter', async () => {
    renderSearch();
    const input = screen.getByRole('combobox', { name: 'Search' });
    fireEvent.change(input, { target: { value: 'INV-2026-001' } });

    await waitFor(() => {
      expect(screen.getAllByTestId('global-search-option').length).toBeGreaterThan(0);
    });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByTestId('current-location').textContent).toBe('/invoices/inv-1');
  });

  it('sends Enter without a highlighted result to the invoices list with ?search=', async () => {
    renderSearch();
    const input = screen.getByRole('combobox', { name: 'Search' });
    fireEvent.change(input, { target: { value: 'zzz nothing' } });

    await waitFor(() => {
      expect(screen.getByTestId('global-search-empty')).toBeDefined();
    });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByTestId('current-location').textContent).toBe('/invoices?search=zzz%20nothing');
  });

  it('InvoicesPage applies the ?search= query to its search filter', async () => {
    render(
      <MemoryRouter initialEntries={['/invoices?search=INV-2026-001']}>
        <AuthProvider initialRole="Admin">
          <DataProvider>
            <Routes>
              <Route path="/invoices" element={<InvoicesPage />} />
            </Routes>
          </DataProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect((screen.getByTestId('invoice-search-input') as HTMLInputElement).value).toBe('INV-2026-001');
    });
  });
});

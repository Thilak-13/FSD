// tests/a11y.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axe from 'axe-core';

import { SideNav } from '../src/components/layout/SideNav';
import { TopBar } from '../src/components/layout/TopBar';
import { NotificationPanel } from '../src/components/layout/NotificationPanel';
import { DashboardPage } from '../src/pages/Dashboard/DashboardPage';
import { InvoicesPage } from '../src/pages/Invoices/InvoicesPage';
import { ApprovalsPage } from '../src/pages/Approvals/ApprovalsPage';
import { LoginPage } from '../src/pages/Login/LoginPage';
import { ConfirmDialog } from '../src/components/shared/ConfirmDialog';
import { FlagModal } from '../src/pages/Approvals/FlagModal';
import { SchedulePaymentModal } from '../src/pages/Payments/SchedulePaymentModal';
import { InvoiceFormDialog } from '../src/pages/Invoices/InvoiceFormDialog';
import { VendorFormDialog } from '../src/pages/Vendors/VendorFormDialog';
import { VendorDetailPage } from '../src/pages/VendorDetail/VendorDetailPage';

import { AuthProvider } from '../src/context/AuthContext';
import { DataProvider } from '../src/context/DataContext';
import { setMockDelayEnabled, resetInvoices, INITIAL_INVOICES } from '../src/services/mockApi';

interface FormattedViolation {
  id: string;
  impact: string | null | undefined;
  description: string;
  help: string;
  helpUrl: string;
  nodesCount: number;
  nodes: {
    html: string;
    target: string[];
    failureSummary?: string;
  }[];
}

interface AxeSummary {
  view: string;
  violationsCount: number;
  passesCount: number;
  incompleteCount: number;
  inapplicableCount: number;
  violations: FormattedViolation[];
  passes: { id: string; description: string }[];
  incomplete: { id: string; description: string; nodesCount: number }[];
}

const formatAxeResults = (viewName: string, results: axe.AxeResults): AxeSummary => {
  return {
    view: viewName,
    violationsCount: results.violations.length,
    passesCount: results.passes.length,
    incompleteCount: results.incomplete.length,
    inapplicableCount: results.inapplicable.length,
    violations: results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      nodesCount: v.nodes.length,
      nodes: v.nodes.map((n) => ({
        html: n.html,
        target: n.target.map(String),
        failureSummary: n.failureSummary,
      })),
    })),
    passes: results.passes.map((p) => ({
      id: p.id,
      description: p.description,
    })),
    incomplete: results.incomplete.map((inc) => ({
      id: inc.id,
      description: inc.description,
      nodesCount: inc.nodes.length,
    })),
  };
};

describe('Axe Core Accessibility Audits', () => {
  beforeEach(() => {
    setMockDelayEnabled(false);
    sessionStorage.clear();
    resetInvoices();
  });

  it('audits SideNav', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider initialRole="Admin">
          <SideNav />
        </AuthProvider>
      </MemoryRouter>
    );

    const results = await axe.run(container);
    const summary = formatAxeResults('SideNav', results);
    console.log('=== AXE RESULT FOR SideNav ===');
    console.log(JSON.stringify(summary, null, 2));
    expect(results).toBeDefined();
  });

  it('audits TopBar', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider initialRole="Admin">
          <DataProvider>
            <TopBar />
          </DataProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    const results = await axe.run(container);
    const summary = formatAxeResults('TopBar', results);
    console.log('=== AXE RESULT FOR TopBar ===');
    console.log(JSON.stringify(summary, null, 2));
    expect(results).toBeDefined();
  });

  it('audits NotificationPanel', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider initialRole="Admin">
          <DataProvider>
            <NotificationPanel isOpen={true} onClose={() => {}} />
          </DataProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    const results = await axe.run(container);
    const summary = formatAxeResults('NotificationPanel', results);
    console.log('=== AXE RESULT FOR NotificationPanel ===');
    console.log(JSON.stringify(summary, null, 2));
    expect(results).toBeDefined();
  });

  it('audits Dashboard', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider initialRole="Admin">
          <DataProvider>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
            </Routes>
          </DataProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {});

    const results = await axe.run(container);
    const summary = formatAxeResults('Dashboard', results);
    console.log('=== AXE RESULT FOR Dashboard ===');
    console.log(JSON.stringify(summary, null, 2));
    expect(results).toBeDefined();
  });

  it('audits InvoicesPage', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/invoices']}>
        <AuthProvider initialRole="Admin">
          <DataProvider>
            <Routes>
              <Route path="/invoices" element={<InvoicesPage />} />
            </Routes>
          </DataProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {});

    const results = await axe.run(container);
    const summary = formatAxeResults('InvoicesPage', results);
    console.log('=== AXE RESULT FOR InvoicesPage ===');
    console.log(JSON.stringify(summary, null, 2));
    expect(results).toBeDefined();
  });

  it('audits ApprovalsPage', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/approvals']}>
        <AuthProvider initialRole="Admin">
          <DataProvider>
            <Routes>
              <Route path="/approvals" element={<ApprovalsPage />} />
            </Routes>
          </DataProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {});

    const results = await axe.run(container);
    const summary = formatAxeResults('ApprovalsPage', results);
    console.log('=== AXE RESULT FOR ApprovalsPage ===');
    console.log(JSON.stringify(summary, null, 2));
    expect(results).toBeDefined();
  });

  it('audits LoginPage', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    const results = await axe.run(container);
    const summary = formatAxeResults('LoginPage', results);
    console.log('=== AXE RESULT FOR LoginPage ===');
    console.log(JSON.stringify(summary, null, 2));
    expect(results).toBeDefined();
  });

  it('audits ConfirmDialog', async () => {
    const { container } = render(
      <ConfirmDialog
        open={true}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    const results = await axe.run(container);
    const summary = formatAxeResults('ConfirmDialog', results);
    console.log('=== AXE RESULT FOR ConfirmDialog ===');
    console.log(JSON.stringify(summary, null, 2));
    expect(results).toBeDefined();
  });

  it('audits FlagModal', async () => {
    const { container } = render(
      <FlagModal
        open={true}
        invoice={INITIAL_INVOICES[0]}
        onClose={() => {}}
        onConfirm={() => {}}
      />
    );

    const results = await axe.run(container);
    const summary = formatAxeResults('FlagModal', results);
    console.log('=== AXE RESULT FOR FlagModal ===');
    console.log(JSON.stringify(summary, null, 2));
    expect(results).toBeDefined();
  });

  it('audits SchedulePaymentModal', async () => {
    const { container } = render(
      <DataProvider>
        <SchedulePaymentModal
          open={true}
          invoice={INITIAL_INVOICES[0]}
          onClose={() => {}}
        />
      </DataProvider>
    );

    const results = await axe.run(container);
    const summary = formatAxeResults('SchedulePaymentModal', results);
    console.log('=== AXE RESULT FOR SchedulePaymentModal ===');
    console.log(JSON.stringify(summary, null, 2));
    expect(results).toBeDefined();
  });

  it('audits InvoiceFormDialog', async () => {
    const { container } = render(
      <AuthProvider initialRole="Admin">
        <DataProvider>
          <InvoiceFormDialog
            open={true}
            onClose={() => {}}
          />
        </DataProvider>
      </AuthProvider>
    );

    const results = await axe.run(container);
    const summary = formatAxeResults('InvoiceFormDialog', results);
    console.log('=== AXE RESULT FOR InvoiceFormDialog ===');
    console.log(JSON.stringify(summary, null, 2));
    expect(results).toBeDefined();
  });

  it('audits VendorFormDialog', async () => {
    const { container } = render(
      <DataProvider>
        <VendorFormDialog
          open={true}
          onClose={() => {}}
        />
      </DataProvider>
    );

    const results = await axe.run(container);
    const summary = formatAxeResults('VendorFormDialog', results);
    console.log('=== AXE RESULT FOR VendorFormDialog ===');
    console.log(JSON.stringify(summary, null, 2));
    expect(results).toBeDefined();
  });

  it('audits VendorDetailPage tabs', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/vendors/v-1']}>
        <AuthProvider initialRole="Admin">
          <DataProvider>
            <Routes>
              <Route path="/vendors/:id" element={<VendorDetailPage />} />
            </Routes>
          </DataProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {});

    const results = await axe.run(container);
    const summary = formatAxeResults('VendorDetailPage', results);
    console.log('=== AXE RESULT FOR VendorDetailPage ===');
    console.log(JSON.stringify(summary, null, 2));
    expect(results).toBeDefined();
  });
});

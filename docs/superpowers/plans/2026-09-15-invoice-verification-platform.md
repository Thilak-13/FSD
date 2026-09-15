# Invoice Verification & Vendor Payment Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, accessible, frontend-only B2B invoice verification and vendor payment tracking platform with Adobe Spectrum Web Components (`@swc-react/*`), React 18, TypeScript, and an in-memory mock service layer simulating async latency.

**Architecture:** The application uses a reactive React Context data engine (`DataContext`) backed by modular mock service modules (`mockApi/`) with simulated 150–500ms delay. UI components consume official Adobe Spectrum Web Components React wrappers (`@swc-react/*`) styled purely with Spectrum CSS custom property design tokens (`--spectrum-*`). An `AuthContext` governs role-based access control (`Admin`, `Approver`, `Requester`) across 10 client-side routes.

**Tech Stack:** React 18+, TypeScript 5+, Vite, `@swc-react/*` (theme, button, action-button, table, textfield, picker, dialog, tabs, sidenav, badge, status-light, card, toast, menu, checkbox, switch, avatar, divider, progress-circle, search), React Router v6+, Recharts, Vitest, Testing Library.

## Global Constraints

- **Pure UI implementation**: No server code, no database, no ORM, no auth provider, no real network calls of any kind.
- **Mock data only**: Served from an in-memory local module that simulates async latency (150–500ms randomized delay) returning Promises.
- **No real file uploads, no real email sending, no real PDF generation**: Stubs with client-side behavior (filename storage, console logs, client-side CSV downloads).
- **Approved packages only**: React 18+, TypeScript, Vite, `@swc-react/*`, React Router v6+, Recharts, Vitest, `@testing-library/react`. Do not install packages outside this approved stack.
- **Spectrum Design Tokens**: Do not invent a custom color palette. Use `--spectrum-*` CSS custom properties for all color, spacing, and typography to guarantee WCAG AA contrast.
- **Accessibility**: Real `<sp-field-label>` for forms, `role="alert"` for errors, `aria-live="polite"` for badges and toasts, skip link to main content, visible focus rings.
- **Status Light Mapping**: `positive` (Approved / Paid / Active), `notice` (Submitted / Under Verification / Payment Scheduled), `negative` (Flagged / Overdue / Inactive), `info` (Informational).
- **Badge Usage**: `<sp-badge>` strictly reserved for count indicators (e.g., unread notifications), not for status.

---

### Task 1: Project Scaffolding & Spectrum Setup

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/assets/brand/Logo.tsx`
- Create: `src/assets/brand/README.md`
- Create: `src/app/index.css`
- Test: `tests/setup.ts`
- Test: `tests/scaffold.test.ts`

**Interfaces:**
- Produces: Base Vite + React 18 + TypeScript environment configured with `@swc-react` theme support and Vitest test harness.

- [ ] **Step 1: Write failing scaffolding test**

```ts
// tests/scaffold.test.ts
import { describe, it, expect } from 'vitest';

describe('Project Scaffolding', () => {
  it('should have standard environment defined', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL (no test script / vitest not configured)

- [ ] **Step 3: Create package.json, config files, index.html and install dependencies**

Install:
- Dependencies: `react`, `react-dom`, `react-router-dom`, `recharts`, `@swc-react/theme`, `@swc-react/button`, `@swc-react/action-button`, `@swc-react/table`, `@swc-react/textfield`, `@swc-react/picker`, `@swc-react/dialog`, `@swc-react/tabs`, `@swc-react/sidenav`, `@swc-react/badge`, `@swc-react/status-light`, `@swc-react/card`, `@swc-react/toast`, `@swc-react/menu`, `@swc-react/checkbox`, `@swc-react/switch`, `@swc-react/avatar`, `@swc-react/divider`, `@swc-react/progress-circle`, `@swc-react/search`, `@spectrum-web-components/bundle`
- DevDependencies: `typescript`, `vite`, `@vitejs/plugin-react`, `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `@types/react`, `@types/react-dom`, `@types/node`

Configure `index.html` with skip link target, Adobe Clean font fallback, and meta viewport.
Configure `src/assets/brand/Logo.tsx` as a clean SVG logo component and `src/assets/brand/README.md` explaining how to drop in custom Creative Cloud assets.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/scaffold.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json vite.config.ts tsconfig.json index.html src/ tests/
git commit -m "chore: scaffold vite react typescript project with spectrum web components"
```

---

### Task 2: Domain Types & Mock Data Layer

**Files:**
- Create: `src/types/index.ts`
- Create: `src/services/mockApi/delay.ts`
- Create: `src/services/mockApi/users.ts`
- Create: `src/services/mockApi/vendors.ts`
- Create: `src/services/mockApi/purchaseOrders.ts`
- Create: `src/services/mockApi/invoices.ts`
- Create: `src/services/mockApi/auditLog.ts`
- Create: `src/services/mockApi/notifications.ts`
- Test: `tests/services/mockApi.test.ts`

**Interfaces:**
- Produces:
  - `User`, `Vendor`, `PurchaseOrder`, `Invoice`, `InvoiceLineItem`, `AuditEntry`, `Notification`
  - `getInvoices(filters?: InvoiceFilters): Promise<Invoice[]>`
  - `getInvoiceById(id: string): Promise<Invoice | null>`
  - `createInvoice(input: NewInvoiceInput): Promise<Invoice>`
  - `updateInvoiceStatus(id: string, status: InvoiceStatus, comment?: string, performedBy?: string): Promise<Invoice>`
  - `getVendors(): Promise<Vendor[]>`
  - `getVendorById(id: string): Promise<Vendor | null>`
  - `createVendor(input: NewVendorInput): Promise<Vendor>`
  - `getPurchaseOrders(): Promise<PurchaseOrder[]>`
  - `getPurchaseOrderById(id: string): Promise<PurchaseOrder | null>`
  - `getUsers(): Promise<User[]>`
  - `getAuditLog(invoiceId?: string): Promise<AuditEntry[]>`
  - `getNotifications(userId?: string): Promise<Notification[]>`

- [ ] **Step 1: Write failing mock API tests**

```ts
// tests/services/mockApi.test.ts
import { describe, it, expect } from 'vitest';
import { getInvoices, getInvoiceById, updateInvoiceStatus } from '../../src/services/mockApi/invoices';
import { getVendors } from '../../src/services/mockApi/vendors';
import { getPurchaseOrders } from '../../src/services/mockApi/purchaseOrders';
import { getUsers } from '../../src/services/mockApi/users';
import { getNotifications } from '../../src/services/mockApi/notifications';

describe('Mock Data Layer', () => {
  it('should fetch seeded invoices spanning all statuses', async () => {
    const invoices = await getInvoices();
    expect(invoices.length).toBeGreaterThanOrEqual(15);
    const statuses = new Set(invoices.map(i => i.status));
    expect(statuses.has('Submitted')).toBe(true);
    expect(statuses.has('Under Verification')).toBe(true);
    expect(statuses.has('Approved')).toBe(true);
    expect(statuses.has('Flagged')).toBe(true);
    expect(statuses.has('Payment Scheduled')).toBe(true);
    expect(statuses.has('Paid')).toBe(true);
  });

  it('should update invoice status and persist in memory', async () => {
    const invoices = await getInvoices();
    const target = invoices[0];
    const updated = await updateInvoiceStatus(target.id, 'Approved', 'Test approval');
    expect(updated.status).toBe('Approved');
    const fetched = await getInvoiceById(target.id);
    expect(fetched?.status).toBe('Approved');
  });

  it('should derive runtime notifications from invoice states', async () => {
    const notifications = await getNotifications();
    expect(notifications.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/services/mockApi.test.ts`
Expected: FAIL (modules not found)

- [ ] **Step 3: Implement domain types and mock services with randomized 150–500ms delay**

Implement:
- `src/types/index.ts` with complete types.
- `src/services/mockApi/delay.ts` implementing `simulateDelay(min = 150, max = 500)`.
- Seed 3 users (`Admin`, `Approver`, `Requester`).
- Seed 5 vendors (*Apex Cloud Services*, *Northwest Logistics*, *ByteForce Technologies*, *Summit Creative*, *Pioneer Industrial*).
- Seed 8 POs with line items.
- Seed 18 realistic invoices across all 6 statuses, linking to vendors and POs.
- `src/services/mockApi/notifications.ts` computing notifications dynamically (pending >3 days, due within 5 days, overdue, flagged).
- `src/services/mockApi/auditLog.ts` logging all status transitions.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/services/mockApi.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/ src/services/mockApi/ tests/services/
git commit -m "feat: implement mock data layer with domain types and artificial latency"
```

---

### Task 3: AuthContext, DataContext & Routing Guard Infrastructure

**Files:**
- Create: `src/context/AuthContext.tsx`
- Create: `src/context/DataContext.tsx`
- Create: `src/app/routes.tsx`
- Create: `src/components/shared/RouteGuard.tsx`
- Test: `tests/context/AuthContext.test.tsx`
- Test: `tests/context/DataContext.test.tsx`

**Interfaces:**
- Consumes: `types/index.ts`, `services/mockApi/*`
- Produces:
  - `useAuth()`: `{ currentUser, currentRole, switchRole, login, logout }`
  - `useData()`: `{ invoices, vendors, purchaseOrders, auditLog, notifications, loading, error, refreshAll, createInvoice, updateStatus, schedulePayment, markPaid, createVendor, simulateError, setSimulateError }`
  - `<RouteGuard allowedRoles={['Admin', 'Approver']}>`

- [ ] **Step 1: Write failing context tests**

```tsx
// tests/context/AuthContext.test.tsx
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../src/context/AuthContext';
import React from 'react';

describe('AuthContext', () => {
  it('should default to Requester and allow switching roles', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.currentRole).toBe('Requester');
    act(() => {
      result.current.switchRole('Admin');
    });
    expect(result.current.currentRole).toBe('Admin');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/context/AuthContext.test.tsx`
Expected: FAIL (AuthContext not defined)

- [ ] **Step 3: Implement AuthContext, DataContext, and RouteGuard**

- `AuthContext`: Manages current user profile and role, saves active role in session/memory, provides `switchRole` for rapid testing.
- `DataContext`: Maintains reactive state, performs all mock operations, updates local arrays, derives notifications, appends audit entries, and provides an optional `simulateError` flag for testing error states.
- `RouteGuard`: Verifies role access. If unauthorized, navigates to `/` and sets a redirect notice in session.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/context/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/context/ src/app/routes.tsx src/components/shared/RouteGuard.tsx tests/context/
git commit -m "feat: implement AuthContext, DataContext, and RouteGuard"
```

---

### Task 4: Shared Accessible UI Components

**Files:**
- Create: `src/components/shared/StatusBadge.tsx`
- Create: `src/components/shared/DataTable.tsx`
- Create: `src/components/shared/EmptyState.tsx`
- Create: `src/components/shared/LoadingSkeleton.tsx`
- Create: `src/components/shared/ConfirmDialog.tsx`
- Create: `src/components/shared/FormField.tsx`
- Test: `tests/components/shared.test.tsx`

**Interfaces:**
- Produces:
  - `<StatusBadge status={status} />`: maps status to `<sp-status-light variant="positive|notice|negative|info">`
  - `<DataTable columns={cols} data={rows} onRowClick={fn} ... />`
  - `<EmptyState title="No items" message="..." actionLabel="..." onAction={fn} />`
  - `<LoadingSkeleton lines={4} />`
  - `<ConfirmDialog open={isOpen} title="Confirm" message="..." onConfirm={fn} onCancel={fn} variant="negative|accent" />`
  - `<FormField label="Amount" error="Required" htmlFor="amount-input">{children}</FormField>`

- [ ] **Step 1: Write failing shared component tests**

```tsx
// tests/components/shared.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { StatusBadge } from '../../src/components/shared/StatusBadge';
import { EmptyState } from '../../src/components/shared/EmptyState';

describe('Shared Components', () => {
  it('renders StatusBadge with correct semantic text and variant', () => {
    const { container } = render(<StatusBadge status="Approved" />);
    expect(screen.getByText('Approved')).toBeDefined();
  });

  it('renders EmptyState with title and action button', () => {
    render(<EmptyState title="No Invoices Found" message="Try adjusting your filters" actionLabel="Clear Filters" onAction={() => {}} />);
    expect(screen.getByText('No Invoices Found')).toBeDefined();
    expect(screen.getByText('Clear Filters')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/shared.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement shared components using Spectrum Web Components & design tokens**

Implement:
- `StatusBadge.tsx`: Maps `Approved`, `Paid`, `Active` -> `positive`; `Submitted`, `Under Verification`, `Payment Scheduled` -> `notice`; `Flagged`, `Overdue`, `Inactive` -> `negative`.
- `DataTable.tsx`: Semantic `<sp-table>` structure with column sorting, pagination controls, and row hover states.
- `EmptyState.tsx`: Accessible messaging container with action buttons.
- `LoadingSkeleton.tsx`: Uses `--spectrum-alias-background-color-secondary` with CSS animation.
- `ConfirmDialog.tsx`: Wraps `<sp-dialog>` with accessible heading, body, and action buttons.
- `FormField.tsx`: Wraps `<sp-field-label>` and renders `role="alert"` when error is present.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/shared.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/ tests/components/
git commit -m "feat: create shared spectrum-wrapped UI components"
```

---

### Task 5: AppShell, Navigation, TopBar & Notification Panel

**Files:**
- Create: `src/components/layout/AppShell.tsx`
- Create: `src/components/layout/SideNav.tsx`
- Create: `src/components/layout/TopBar.tsx`
- Create: `src/components/layout/NotificationPanel.tsx`
- Create: `src/components/layout/layout.css`
- Modify: `src/app/App.tsx`
- Test: `tests/components/layout.test.tsx`

**Interfaces:**
- Consumes: `useAuth()`, `useData()`, `StatusBadge`, `Logo`
- Produces: Complete responsive layout shell with skip link, role-filtered navigation, notification bell with live badge, global search, and light/dark theme switch.

- [ ] **Step 1: Write failing layout tests**

```tsx
// tests/components/layout.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { TopBar } from '../../src/components/layout/TopBar';
import { AuthProvider } from '../../src/context/AuthContext';
import { DataProvider } from '../../src/context/DataContext';

describe('Layout Components', () => {
  it('renders skip to main content link', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <DataProvider>
            <TopBar onToggleSidebar={() => {}} />
          </DataProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /role/i })).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/layout.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement AppShell, SideNav, TopBar, and NotificationPanel**

- `AppShell`: Includes `<a href="#main-content" className="skip-link">Skip to main content</a>`. Manages mobile drawer toggle state.
- `SideNav`: Filters navigation items by role:
  - All: Dashboard (`/`), Invoices (`/invoices`), Vendors (`/vendors`)
  - Approver/Admin: Approvals (`/approvals`), Payments (`/payments`), Reports (`/reports`)
  - Admin only: Audit Log (`/audit-log`)
- `TopBar`: Includes mobile hamburger button, search bar (`<sp-search>`), notification bell with unread `<sp-badge>` count in `aria-live="polite"` container, theme mode toggle (light/dark), and rapid role switcher selector.
- `NotificationPanel`: Flyout/popover showing unread notifications, mark-all-as-read, and link directly to invoice detail.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/layout.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/ src/app/App.tsx tests/components/layout.test.tsx
git commit -m "feat: implement AppShell, responsive SideNav, TopBar, and NotificationPanel"
```

---

### Task 6: Authentication Page (`/login`)

**Files:**
- Create: `src/pages/Login/LoginPage.tsx`
- Create: `src/pages/Login/login.css`
- Modify: `src/app/routes.tsx`
- Test: `tests/pages/Login.test.tsx`

**Interfaces:**
- Consumes: `useAuth()`
- Produces: `/login` route view

- [ ] **Step 1: Write failing Login page test**

```tsx
// tests/pages/Login.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../../src/pages/Login/LoginPage';
import { AuthProvider } from '../../src/context/AuthContext';

describe('LoginPage', () => {
  it('renders quick role selector buttons and signs in', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText(/Sign In to Invoice Platform/i)).toBeDefined();
    expect(screen.getByText(/Admin/i)).toBeDefined();
    expect(screen.getByText(/Approver/i)).toBeDefined();
    expect(screen.getByText(/Requester/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pages/Login.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement LoginPage**

- Card container using `<sp-card>`.
- 1-click quick-login buttons for Admin, Approver, and Requester.
- Standard email and password form fields with client-side validation.
- Automatically sets user in `AuthContext` and redirects to `/`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pages/Login.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Login/ tests/pages/Login.test.tsx
git commit -m "feat: implement LoginPage with 1-click role selection and validation"
```

---

### Task 7: Invoices Directory & Submission Dialog (`/invoices`)

**Files:**
- Create: `src/pages/Invoices/InvoicesPage.tsx`
- Create: `src/pages/Invoices/InvoiceFilters.tsx`
- Create: `src/pages/Invoices/InvoiceFormDialog.tsx`
- Create: `src/pages/Invoices/invoices.css`
- Modify: `src/app/routes.tsx`
- Test: `tests/pages/Invoices.test.tsx`

**Interfaces:**
- Consumes: `useData()`, `useAuth()`, `DataTable`, `StatusBadge`, `LoadingSkeleton`, `EmptyState`
- Produces: `/invoices` route view

- [ ] **Step 1: Write failing InvoicesPage test**

```tsx
// tests/pages/Invoices.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { InvoicesPage } from '../../src/pages/Invoices/InvoicesPage';
import { AuthProvider } from '../../src/context/AuthContext';
import { DataProvider } from '../../src/context/DataContext';

describe('InvoicesPage', () => {
  it('renders invoice table and new invoice trigger', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <DataProvider>
            <InvoicesPage />
          </DataProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText(/Invoices/i)).toBeDefined();
    expect(screen.getByText(/\+ New Invoice/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pages/Invoices.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement InvoicesPage, InvoiceFilters, and InvoiceFormDialog**

- Role-based filtering: When logged in as `Requester`, only display invoices submitted by the requester. Admins and Approvers view all invoices.
- Filter toolbar: Search by invoice number/vendor, status filter dropdown (`Submitted`, `Under Verification`, `Approved`, `Flagged`, `Payment Scheduled`, `Paid`), vendor filter.
- `<InvoiceFormDialog>`:
  - Vendor picker, PO linkage dropdown, invoice amount, due date.
  - Dynamic line items generator (description, quantity, unit price).
  - Attached document file picker stub (captures filename without real upload).
  - Submits invoice via `useData().createInvoice`, shows success notification, and closes dialog.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pages/Invoices.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Invoices/ tests/pages/Invoices.test.tsx
git commit -m "feat: implement Invoices directory, filters, and new invoice submission dialog"
```

---

### Task 8: Invoice Detail & 3-Way Match Verification Workflow (`/invoices/:id`)

**Files:**
- Create: `src/pages/InvoiceDetail/InvoiceDetailPage.tsx`
- Create: `src/pages/InvoiceDetail/StatusStepper.tsx`
- Create: `src/pages/InvoiceDetail/VerificationPanel.tsx`
- Create: `src/pages/InvoiceDetail/DocumentViewerStub.tsx`
- Create: `src/pages/InvoiceDetail/ApprovalActions.tsx`
- Create: `src/pages/InvoiceDetail/ActivityFeed.tsx`
- Create: `src/pages/InvoiceDetail/invoiceDetail.css`
- Modify: `src/app/routes.tsx`
- Test: `tests/pages/InvoiceDetail.test.tsx`

**Interfaces:**
- Consumes: `useData()`, `useAuth()`, `StatusBadge`, `ConfirmDialog`
- Produces: `/invoices/:id` route view

- [ ] **Step 1: Write failing InvoiceDetailPage test**

```tsx
// tests/pages/InvoiceDetail.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { InvoiceDetailPage } from '../../src/pages/InvoiceDetail/InvoiceDetailPage';
import { AuthProvider } from '../../src/context/AuthContext';
import { DataProvider } from '../../src/context/DataContext';

describe('InvoiceDetailPage', () => {
  it('renders invoice details and status stepper', async () => {
    render(
      <MemoryRouter initialEntries={['/invoices/inv-1']}>
        <AuthProvider>
          <DataProvider>
            <Routes>
              <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
            </Routes>
          </DataProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText(/Invoice Details/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pages/InvoiceDetail.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement InvoiceDetailPage and child verification components**

- `StatusStepper`: Shows sequence: `Submitted` → `Under Verification` → `Approved` → `Payment Scheduled` → `Paid` with active/completed/flagged highlights.
- `VerificationPanel`: 3-way matching comparison between Invoice line items and linked Purchase Order items. Highlights unit price variance and quantity overbills with `<sp-status-light variant="negative">`.
- `DocumentViewerStub`: Simulated invoice preview showing attached document name, PDF page representation, file size, and download/view stub.
- `ApprovalActions`: "Approve", "Flag for Review" (with reason dialog), "Schedule Payment". Actionable by Approver/Admin only; hidden for Requester.
- `ActivityFeed`: Audit log of transitions and comments on this invoice.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pages/InvoiceDetail.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/InvoiceDetail/ tests/pages/InvoiceDetail.test.tsx
git commit -m "feat: implement InvoiceDetailPage with 3-way matching and approval actions"
```

---

### Task 9: Approvals Triage Queue (`/approvals`)

**Files:**
- Create: `src/pages/Approvals/ApprovalsPage.tsx`
- Create: `src/pages/Approvals/BatchApprovalBar.tsx`
- Create: `src/pages/Approvals/FlagModal.tsx`
- Create: `src/pages/Approvals/approvals.css`
- Modify: `src/app/routes.tsx`
- Test: `tests/pages/Approvals.test.tsx`

**Interfaces:**
- Consumes: `useData()`, `useAuth()`, `DataTable`, `StatusBadge`, `ConfirmDialog`
- Produces: `/approvals` route view (restricted to `Approver` and `Admin`)

- [ ] **Step 1: Write failing ApprovalsPage test**

```tsx
// tests/pages/Approvals.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ApprovalsPage } from '../../src/pages/Approvals/ApprovalsPage';
import { AuthProvider } from '../../src/context/AuthContext';
import { DataProvider } from '../../src/context/DataContext';

describe('ApprovalsPage', () => {
  it('renders approvals queue heading and table', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <DataProvider>
            <ApprovalsPage />
          </DataProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText(/Approval Queue/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pages/Approvals.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement ApprovalsPage with batch and inline actions**

- Filters invoices to only include `Submitted` and `Flagged` statuses.
- Supports multi-select checkboxes for batch approval.
- Inline "Approve" button with confirmation.
- Inline "Flag" button that opens `FlagModal` requiring a reason (e.g. "Price discrepancy on item 1").
- Requesters attempting to access this route are redirected to `/` with a notice toast.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pages/Approvals.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Approvals/ tests/pages/Approvals.test.tsx
git commit -m "feat: implement Approvals triage queue with batch and inline actions"
```

---

### Task 10: Payment Tracking & Disbursement Dashboard (`/payments`)

**Files:**
- Create: `src/pages/Payments/PaymentsPage.tsx`
- Create: `src/pages/Payments/PaymentSummaryStrip.tsx`
- Create: `src/pages/Payments/SchedulePaymentModal.tsx`
- Create: `src/pages/Payments/payments.css`
- Modify: `src/app/routes.tsx`
- Test: `tests/pages/Payments.test.tsx`

**Interfaces:**
- Consumes: `useData()`, `useAuth()`, `DataTable`, `StatusBadge`, `ConfirmDialog`
- Produces: `/payments` route view (restricted to `Approver` and `Admin`)

- [ ] **Step 1: Write failing PaymentsPage test**

```tsx
// tests/pages/Payments.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { PaymentsPage } from '../../src/pages/Payments/PaymentsPage';
import { AuthProvider } from '../../src/context/AuthContext';
import { DataProvider } from '../../src/context/DataContext';

describe('PaymentsPage', () => {
  it('renders payment summary cards and payment table', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <DataProvider>
            <PaymentsPage />
          </DataProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText(/Vendor Payments/i)).toBeDefined();
    expect(screen.getByText(/Scheduled Total/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pages/Payments.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement PaymentsPage, PaymentSummaryStrip, and SchedulePaymentModal**

- `PaymentSummaryStrip`: Cards displaying Scheduled Disbursements total, Paid Month-to-Date total, and Overdue Count.
- Table displaying Approved, Payment Scheduled, and Paid invoices with due dates, payment terms, and vendor names.
- "Schedule Payment" modal to set target payment date for Approved invoices.
- "Mark as Paid" action to transition status to `Paid` with settlement confirmation.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pages/Payments.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Payments/ tests/pages/Payments.test.tsx
git commit -m "feat: implement PaymentsPage with summary strip and disbursement controls"
```

---

### Task 11: Vendor Directory & Detail View (`/vendors`, `/vendors/:id`)

**Files:**
- Create: `src/pages/Vendors/VendorsPage.tsx`
- Create: `src/pages/Vendors/VendorFormDialog.tsx`
- Create: `src/pages/VendorDetail/VendorDetailPage.tsx`
- Create: `src/pages/Vendors/vendors.css`
- Modify: `src/app/routes.tsx`
- Test: `tests/pages/Vendors.test.tsx`

**Interfaces:**
- Consumes: `useData()`, `useAuth()`, `DataTable`, `StatusBadge`
- Produces: `/vendors` and `/vendors/:id` views

- [ ] **Step 1: Write failing Vendors test**

```tsx
// tests/pages/Vendors.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { VendorsPage } from '../../src/pages/Vendors/VendorsPage';
import { AuthProvider } from '../../src/context/AuthContext';
import { DataProvider } from '../../src/context/DataContext';

describe('VendorsPage', () => {
  it('renders vendor directory', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <DataProvider>
            <VendorsPage />
          </DataProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText(/Vendor Directory/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pages/Vendors.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement VendorsPage, VendorFormDialog, and VendorDetailPage**

- `VendorsPage`: Directory listing company name, payment terms (Net 15/30/60), contact email, status badge, and total invoice count. "+ Add Vendor" button is visible to `Admin` only.
- `VendorFormDialog`: Form for adding a new vendor (name, email, payment terms, address, tax ID).
- `VendorDetailPage`: Detailed vendor profile, active Purchase Orders list, and historical invoice ledger with status badges.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pages/Vendors.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Vendors/ src/pages/VendorDetail/ tests/pages/Vendors.test.tsx
git commit -m "feat: implement Vendor directory, add vendor dialog, and vendor detail view"
```

---

### Task 12: Executive Dashboard & Analytics (`/`)

**Files:**
- Create: `src/pages/Dashboard/DashboardPage.tsx`
- Create: `src/pages/Dashboard/SummaryCard.tsx`
- Create: `src/pages/Dashboard/VolumeChart.tsx`
- Create: `src/pages/Dashboard/StatusBreakdownChart.tsx`
- Create: `src/pages/Dashboard/dashboard.css`
- Modify: `src/app/routes.tsx`
- Test: `tests/pages/Dashboard.test.tsx`

**Interfaces:**
- Consumes: `useData()`, `useAuth()`, Recharts (`BarChart`, `PieChart`, `ResponsiveContainer`), Spectrum cards
- Produces: `/` Dashboard view

- [ ] **Step 1: Write failing DashboardPage test**

```tsx
// tests/pages/Dashboard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../../src/pages/Dashboard/DashboardPage';
import { AuthProvider } from '../../src/context/AuthContext';
import { DataProvider } from '../../src/context/DataContext';

describe('DashboardPage', () => {
  it('renders summary cards and chart titles', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <DataProvider>
            <DashboardPage />
          </DataProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText(/Dashboard/i)).toBeDefined();
    expect(screen.getByText(/Total Spend Pending/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pages/Dashboard.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement DashboardPage with Recharts and metric cards**

- 4 Metric `<sp-card>`s:
  - Total Spend Pending
  - Invoices Requiring Approval
  - Flagged Invoices (Discrepancies)
  - Scheduled Disbursements
- `VolumeChart`: Recharts Bar/Area chart showing monthly invoice volume and amount.
- `StatusBreakdownChart`: Recharts Donut/Pie chart showing distribution across `Submitted`, `Approved`, `Flagged`, `Paid`.
- Actionable Quick-Links widget: links to `/approvals`, `/invoices`, `/payments`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pages/Dashboard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Dashboard/ tests/pages/Dashboard.test.tsx
git commit -m "feat: implement Dashboard with summary cards and Recharts analytics"
```

---

### Task 13: Financial Reports & CSV Export (`/reports`)

**Files:**
- Create: `src/pages/Reports/ReportsPage.tsx`
- Create: `src/pages/Reports/DateRangeFilter.tsx`
- Create: `src/pages/Reports/VendorBreakdownTable.tsx`
- Create: `src/pages/Reports/ExportButtons.tsx`
- Create: `src/pages/Reports/reports.css`
- Modify: `src/app/routes.tsx`
- Test: `tests/pages/Reports.test.tsx`

**Interfaces:**
- Consumes: `useData()`, `useAuth()`, `DataTable`
- Produces: `/reports` view (restricted to `Approver` and `Admin`)

- [ ] **Step 1: Write failing ReportsPage test**

```tsx
// tests/pages/Reports.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ReportsPage } from '../../src/pages/Reports/ReportsPage';
import { AuthProvider } from '../../src/context/AuthContext';
import { DataProvider } from '../../src/context/DataContext';

describe('ReportsPage', () => {
  it('renders reports heading and export controls', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <DataProvider>
            <ReportsPage />
          </DataProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText(/Financial Reports/i)).toBeDefined();
    expect(screen.getByText(/Export CSV/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pages/Reports.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement ReportsPage, VendorBreakdownTable, and client-side CSV export**

- Date range filter selector (Last 30 Days, Last Quarter, Year to Date).
- `VendorBreakdownTable`: Total invoices, total billed, total paid, average processing time per vendor.
- `ExportButtons`:
  - Working client-side CSV generator: creates a Blob and triggers automatic download.
  - Stubbed PDF export button: logs to console with `console.log('[PDF Export Stub] Generating PDF...')` and triggers a Spectrum toast notification.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pages/Reports.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Reports/ tests/pages/Reports.test.tsx
git commit -m "feat: implement ReportsPage with vendor spend breakdown and CSV export"
```

---

### Task 14: Audit Trail Log (`/audit-log`)

**Files:**
- Create: `src/pages/AuditLog/AuditLogPage.tsx`
- Create: `src/pages/AuditLog/auditLog.css`
- Modify: `src/app/routes.tsx`
- Test: `tests/pages/AuditLog.test.tsx`

**Interfaces:**
- Consumes: `useData()`, `useAuth()`, `DataTable`
- Produces: `/audit-log` view (restricted to `Admin` only)

- [ ] **Step 1: Write failing AuditLogPage test**

```tsx
// tests/pages/AuditLog.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuditLogPage } from '../../src/pages/AuditLog/AuditLogPage';
import { AuthProvider } from '../../src/context/AuthContext';
import { DataProvider } from '../../src/context/DataContext';

describe('AuditLogPage', () => {
  it('renders audit trail table for admin', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <DataProvider>
            <AuditLogPage />
          </DataProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText(/System Audit Trail/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pages/AuditLog.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement AuditLogPage with search and filtering**

- Role guard strictly protects `/audit-log` for `Admin`.
- Search by actor, invoice ID, or action keyword.
- Filter by action type (`SUBMISSION`, `VERIFICATION`, `APPROVAL`, `FLAGGED`, `PAYMENT_SCHEDULED`, `PAYMENT_COMPLETED`).
- Formats timestamps and diff details cleanly in an accessible table.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pages/AuditLog.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/AuditLog/ tests/pages/AuditLog.test.tsx
git commit -m "feat: implement AuditLogPage with admin protection and search filters"
```

---

### Task 15: Definition of Done Verification, Theme Toggle & Polish

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/components/layout/TopBar.tsx`
- Test: `tests/e2e/workflow.test.tsx`

**Interfaces:**
- Consumes: All views and contexts
- Produces: Complete end-to-end verified application meeting all Definition of Done checklist items.

- [ ] **Step 1: Write end-to-end workflow verification test**

```tsx
// tests/e2e/workflow.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../../src/app/App';

describe('End-to-End Platform Verification', () => {
  it('navigates through routes and maintains role-based integrity', async () => {
    render(<App />);
    expect(screen.getByText(/Invoice Verification/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 3: Verify Definition of Done requirements**
- Loading skeletons present on every asynchronous view.
- Empty state displayed when tables are filtered to 0 items.
- Simulate Error toggle in footer/settings to verify graceful error alerts and retry buttons.
- Full keyboard navigation (tab order and visible Spectrum focus rings).
- Responsive mobile navigation verified with sliding drawer below 768px.
- Light and dark mode toggle seamlessly switching Spectrum theme tokens (`color="light"` vs `color="dark"`).
- Zero hardcoded colors: verify all custom CSS references `--spectrum-*` variables only.

- [ ] **Step 4: Run build check**

Run: `npm run build`
Expected: Build completes with zero TypeScript or packaging errors.

- [ ] **Step 5: Final Commit**

```bash
git add .
git commit -m "chore: complete definition of done verification and production build"
```

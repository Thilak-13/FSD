# Frontend Analysis Report

## 1. Page Table
| Route | Component File (path:line) | Status |
| :--- | :--- | :--- |
| `/` | `src/app/routes.tsx:38` (RootRoute -> `src/pages/Landing/LandingPage.tsx:37` or `src/pages/Dashboard/DashboardPage.tsx:14`) | Working |
| `/login` | `src/pages/Login/LoginPage.tsx:15` | Working |
| `/landing` | `src/pages/Landing/LandingPage.tsx:37` | Working |
| `/invoices` | `src/pages/Invoices/InvoicesPage.tsx:13` | Working |
| `/invoices/:id` | `src/pages/InvoiceDetail/InvoiceDetailPage.tsx:17` | Working (Document viewer is stub) |
| `/approvals` | `src/pages/Approvals/ApprovalsPage.tsx:18` | Working |
| `/payments` | `src/pages/Payments/PaymentsPage.tsx:18` | Working |
| `/vendors` | `src/pages/Vendors/VendorsPage.tsx:12` | Working |
| `/vendors/:id` | `src/pages/VendorDetail/VendorDetailPage.tsx:12` | Working |
| `/reports` | `src/pages/Reports/ReportsPage.tsx:8` | Working (PDF export is stub; client-side calc) |
| `/audit-log` | `src/pages/AuditLog/AuditLogPage.tsx:10` | Working |
| `*` | `src/app/routes.tsx:135` (`Navigate to="/"`) | Working |

## 2. API Calls
| METHOD | URL | file:line | Expected Response |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | `src/services/api/auth.ts:14` | `{ token: string, user: User }` |
| `GET` | `/auth/me` | `src/services/api/auth.ts:30` | `{ user: User }` |
| `GET` | `/auth/users` | `src/services/api/users.ts:6` | `User[]` |
| `GET` | `/auth/users/:id` | `src/services/api/users.ts:11` | `User` |
| `GET` | `/invoices` | `src/services/api/invoices.ts:19` | `Invoice[]` |
| `GET` | `/invoices/:id` | `src/services/api/invoices.ts:24` | `Invoice` |
| `POST` | `/invoices` | `src/services/api/invoices.ts:36` | `Invoice` |
| `PATCH` | `/invoices/:id/status` | `src/services/api/invoices.ts:53` | `Invoice` |
| `POST` | `/invoices/:id/attachment` | `src/services/api/invoices.ts:71` | `Invoice` (UNVERIFIED: never invoked by UI) |
| `GET` | `/invoices/:id/attachment` | `src/services/api/invoices.ts:82` | `Blob` (UNVERIFIED: never invoked by UI) |
| `GET` | `/purchase-orders` | `src/services/api/purchaseOrders.ts:9` | `PurchaseOrder[]` |
| `GET` | `/purchase-orders/:id` | `src/services/api/purchaseOrders.ts:16` | `PurchaseOrder` |
| `GET` | `/vendors` | `src/services/api/vendors.ts:6` | `Vendor[]` |
| `GET` | `/vendors/:id` | `src/services/api/vendors.ts:11` | `Vendor` |
| `POST` | `/vendors` | `src/services/api/vendors.ts:21` | `Vendor` |
| `GET` | `/notifications` | `src/services/api/notifications.ts:9` | `Notification[]` |
| `PATCH` | `/notifications/:id/read` | `src/services/api/notifications.ts:13` | `void` |
| `POST` | `/notifications/read-all` | `src/services/api/notifications.ts:21` | `void` |
| `GET` | `/audit-log` | `src/services/api/auditLog.ts:9` | `AuditEntry[]` |
| `GET` | `/reports/summary` | `src/services/api/reports.ts:35` | `ReportsSummaryResponse` (Bypassed by ReportsPage) |
| `GET` | `/reports/vendor-breakdown` | `src/services/api/reports.ts:46` | `VendorReportRow[]` (Bypassed by ReportsPage) |

## 3. Architecture, State & UI Findings
- **State Management**: `DataContext` (`src/context/DataContext.tsx:120`) fetches core entities on mount via `Promise.allSettled`. However, `ReportsPage` completely ignores `reportsSummary` from `DataContext` and computes all metrics client-side from `invoices`. `InvoiceDetailPage` manages local audit state merged with context (`src/pages/InvoiceDetail/InvoiceDetailPage.tsx:64`).
- **Missing Loading/Error States**: `DashboardPage` (`src/pages/Dashboard/DashboardPage.tsx:24`) ignores `loading` and `error`, flashing 0 metrics. `InvoicesPage` (`src/pages/Invoices/InvoicesPage.tsx:23`), `ApprovalsPage` (`src/pages/Approvals/ApprovalsPage.tsx:28`), `PaymentsPage` (`src/pages/Payments/PaymentsPage.tsx:27`), and `VendorsPage` (`src/pages/Vendors/VendorsPage.tsx:23`) never render `dataContext.error` or `resourceErrors`, silently rendering empty tables on API failure.
- **Dead Controls**: `TopBar` global search input (`src/components/layout/TopBar.tsx:65`) updates local state but has no submit or enter action. "Export PDF (Stub)" (`src/pages/Reports/ExportButtons.tsx:88`) only executes `console.log`.
- **Forms & Validation**: `InvoiceFormDialog` (`src/pages/Invoices/InvoiceFormDialog.tsx:240`) validates required fields and line items, but discards actual file payload (`src/pages/Invoices/InvoiceFormDialog.tsx:214`). `VendorFormDialog` (`src/pages/Vendors/VendorFormDialog.tsx:89`) validates name/email/taxId, but has no phone validation format.
- **Mobile/Responsive**: Sidebar collapses properly with overlay (`src/components/layout/layout.css:585`). `DataTable` uses `overflowX: auto` (`src/components/shared/DataTable.tsx:299`). Two-column detail layout switches to 1-column below 900px (`src/pages/InvoiceDetail/invoiceDetail.css:388`).

## 4. Placeholders, Stubs & Hardcoded Data
- Document Viewer Stub (`src/pages/InvoiceDetail/DocumentViewerStub.tsx:75`): renders mock CSS wireframe lines with fake download handler (`src/pages/InvoiceDetail/DocumentViewerStub.tsx:41`).
- File Upload Stub (`src/pages/Invoices/InvoiceFormDialog.tsx:624`): saves filename string only; binary is never sent to API.
- PDF Export Stub (`src/pages/Reports/ExportButtons.tsx:68`): button labeled "Export PDF (Stub)" logs to console.
- Hardcoded Reference Date (`src/pages/Reports/ReportsPage.tsx:24`): `const now = new Date('2026-09-15')` used for date-range calculations.
- Hardcoded Default Metric (`src/pages/Reports/ReportsPage.tsx:65`): `avgProcessingDays` defaults to `4.0` when completed count is 0.
- Orphaned Landing Components (`src/pages/Landing/components/LandingHero.tsx:4`, `LandingStats.tsx:9`, `LandingFeatures.tsx:80`, `LandingNav.tsx:4`, `LandingFooter.tsx:4`, `LandingAuthHub.tsx:26`): completely unmounted after LandingPage simplification.

## 5. Rated Frontend Issues
- `[P0]` `src/pages/Invoices/InvoiceFormDialog.tsx:214` - Document upload is non-functional: form stores `file.name` only and discards the `File` object; never calls `POST /api/invoices/:id/attachment` (`src/services/api/invoices.ts:71`).
- `[P0]` `src/pages/InvoiceDetail/DocumentViewerStub.tsx:41` - Document download is fake: clicking "Download PDF" prints `console.log` and toast instead of calling `downloadInvoiceAttachment` (`src/services/api/invoices.ts:77`).
- `[P0]` `src/pages/Reports/ReportsPage.tsx:21` - Reports view bypasses backend endpoints `GET /reports/summary` (`src/services/api/reports.ts:35`) and `GET /reports/vendor-breakdown` (`src/services/api/reports.ts:46`), recalculating client-side with a hardcoded date.
- `[P1]` `src/pages/Invoices/InvoicesPage.tsx:23` - Silent fetch failure: `dataContext.error` and `resourceErrors.invoices` are ignored; users see empty list with no error alert. (Also in `ApprovalsPage.tsx:28`, `PaymentsPage.tsx:27`, `VendorsPage.tsx:23`, `AuditLogPage.tsx:18`).
- `[P1]` `src/components/layout/TopBar.tsx:65` - Dead global search bar: search input has no form wrapper, enter-key handler, or routing to invoices/vendors search.
- `[P1]` `src/pages/Reports/ExportButtons.tsx:68` - "Export PDF (Stub)" is non-functional and triggers only a `console.log`.
- `[P1]` `src/pages/Dashboard/DashboardPage.tsx:24` - Dashboard ignores loading state, rendering 0/empty counters during initial data fetch.
- `[P1]` `src/pages/Reports/ReportsPage.tsx:24` - Hardcoded date `'2026-09-15'` skews 30d/quarter date range filtering for actual calendar dates.
- `[P2]` `src/pages/Landing/components/LandingHero.tsx:4` - Orphaned components in `src/pages/Landing/components/` remain in tree without active callers.
- `[P2]` `src/app/routes.tsx:19` - Legacy placeholder route aliases (`LoginPlaceholder`, `DashboardPlaceholder`, etc.) clutter route exports.
- `[P2]` `src/pages/Vendors/VendorFormDialog.tsx:116` - Phone field lacks validation formatting.

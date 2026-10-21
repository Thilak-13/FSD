# Frontend <-> Backend Integration Report

## 1. Application Startup & Runtime Status
- **Backend**: Starts cleanly via runner `scripts/startApp.js:106-117` on port 5000 (`backend/src/server.js:32-34`). Ephemeral in-memory MongoDB connects and auto-seeds 32 invoices, 5 vendors, and 8 POs (`backend/src/config/seed.js:1255`).
- **Frontend**: Compiles with zero errors via `npm run build` (`package.json:10`). Dev server runs on port 5173 with `/api` proxy targeting `http://localhost:5000` (`vite.config.ts:15-18`).
- **Startup Trap**: Running `node backend/src/server.js` directly without `NODE_ENV=development` fails immediately on connection (`backend/src/config/env.js:8` <-> `backend/src/config/db.js:76`).

## 2. Test Execution Results
- **Frontend Unit/Component (Vitest)**: 21/21 suites passed, 331/331 tests passed (`tests/setup.ts:1`).
- **Playwright E2E Integration (Real Mode)**: 7/7 tests passed in 29.1s (`e2e/smoke.spec.ts:1-367`). Tested unauthenticated landing, Admin/Approver/Requester RBAC scoping, triage queue approval, settlement, and attachment retrieval.
- **Backend Tests (Jest)**: 9/11 suites passed, 145/147 tests passed (`backend/tests/contracts.test.js:67` passed 10/10 with strict JSON schema parity). 2 tests failed due to currency symbol assertion mismatch (`₹` vs `$`).

## 3. Endpoints Matrix & Mismatch Analysis
| Frontend Caller | Backend Route & Controller | Method | Match Status | Notes |
| :--- | :--- | :---: | :---: | :--- |
| `src/services/api/auth.ts:14` | `backend/src/routes/auth.routes.js:14` | `POST /auth/login` | **MATCH** | `{ email, password }` -> `{ token, user }` |
| `src/services/api/auth.ts:30` | `backend/src/routes/auth.routes.js:15` | `GET /auth/me` | **MATCH** | JWT auth -> `{ user }` |
| `src/services/api/users.ts:6` | `backend/src/routes/auth.routes.js:16` | `GET /auth/users` | **MATCH** | Admin-only -> `User[]` |
| `src/services/api/users.ts:11` | `backend/src/routes/auth.routes.js:22` | `GET /auth/users/:id` | **MATCH** | Admin-only -> `User` (404 on missing) |
| `src/services/api/vendors.ts:6` | `backend/src/routes/vendors.routes.js:9` | `GET /vendors` | **MATCH** | Returns `Vendor[]` with computed `totalInvoices` |
| `src/services/api/vendors.ts:11` | `backend/src/routes/vendors.routes.js:10` | `GET /vendors/:id` | **MATCH** | Returns `Vendor` with linked `invoices[]` |
| `src/services/api/vendors.ts:21` | `backend/src/routes/vendors.routes.js:11` | `POST /vendors` | **MATCH** | Admin-only; validates `paymentTerms` enum |
| `src/services/api/purchaseOrders.ts:9` | `backend/src/routes/purchaseOrders.routes.js:8` | `GET /purchase-orders` | **MATCH** | Filterable by `vendorId` query param |
| `src/services/api/purchaseOrders.ts:16` | `backend/src/routes/purchaseOrders.routes.js:9` | `GET /purchase-orders/:id` | **MATCH** | Resolves by `id` or `poNumber` -> `PurchaseOrder` |
| `src/services/api/invoices.ts:19` | `backend/src/routes/invoices.routes.js:9` | `GET /invoices` | **MATCH** | Scoped to owner for Requester; filters by status/vendor/dates |
| `src/services/api/invoices.ts:24` | `backend/src/routes/invoices.routes.js:11` | `GET /invoices/:id` | **MATCH** | 404 for Requesters targeting foreign invoices |
| `src/services/api/invoices.ts:36` | `backend/src/routes/invoices.routes.js:14` | `POST /invoices` | **MATCH** | Auto-runs verification against PO; logs `SUBMISSION` audit |
| `src/services/api/invoices.ts:53` | `backend/src/routes/invoices.routes.js:15` | `PATCH /invoices/:id/status` | **MATCH** | Admin/Approver only; updates status & logs audit entry |
| `src/services/api/invoices.ts:71` | `backend/src/routes/invoices.routes.js:21` | `POST /invoices/:id/attachment`| **MATCH** | Multer multipart file upload (API ready, see Issue 1) |
| `src/services/api/invoices.ts:82` | `backend/src/routes/invoices.routes.js:10` | `GET /invoices/:id/attachment` | **MATCH** | Serves static octet-stream / PDF with attachment header |
| `src/services/api/notifications.ts:9` | `backend/src/routes/notifications.routes.js:7` | `GET /notifications` | **MATCH** | Dynamically derived notifications from invoice state |
| `src/services/api/notifications.ts:13`| `backend/src/routes/notifications.routes.js:10`| `PATCH /notifications/:id/read`| **MATCH** | Idempotent upsert in `NotificationRead` model |
| `src/services/api/notifications.ts:21`| `backend/src/routes/notifications.routes.js:14`| `POST /notifications/read-all` | **MATCH** | Marks all active user notifications as read |
| `src/services/api/reports.ts:35` | `backend/src/routes/reports.routes.js:8` | `GET /reports/summary` | **MATCH** | Scoped metrics; date filters `from`/`to` supported |
| `src/services/api/reports.ts:46` | `backend/src/routes/reports.routes.js:9` | `GET /reports/vendor-breakdown`| **MATCH** | Admin/Approver only; computes spend & cycle times |
| `src/services/api/auditLog.ts:9` | `backend/src/routes/auditLog.routes.js:25` | `GET /audit-log` | **MATCH** | Without `invoiceId` requires Admin; with `invoiceId` allows owner |

## 4. Nonexistent & Unused Endpoints
- **Calls to nonexistent endpoints**: None. All frontend API client calls map to existing routes in `backend/src/app.js:32-38`.
- **Unused endpoint**: `POST /api/purchase-orders` (`backend/src/routes/purchaseOrders.routes.js:13`) implemented in backend controller `backend/src/controllers/purchaseOrderController.js:63-95` but not invoked by frontend.
- **Unused alias**: `POST /api/notifications/:id/read` (`backend/src/routes/notifications.routes.js:11`) duplicate of `PATCH`.
- **Unused health check**: `GET /api/health` (`backend/src/app.js:27`) not polled by frontend UI.

## 5. User Journeys & End-to-End Walkthrough
- **Auth Flow**: `/login` quick chips load demo personas (`src/context/AuthContext.tsx:42-46`). `POST /api/auth/login` issues JWT; stored in `sessionStorage` (`src/services/api/client.ts:27`). Restores cleanly on page reload via `GET /api/auth/me`.
- **Main Dashboard**: Loads 4 KPIs (`spendPending`, `requiresApprovalCount`, `flaggedCount`, `scheduledDisbursements`), volume charts, and recent 5 invoices (`src/pages/Dashboard/DashboardPage.tsx:34-66`). Navigation links filter dynamically (Admin: 7, Approver: 6, Requester: 3).
- **Invoice CRUD**: Invoice submission dialog (`src/pages/Invoices/InvoiceFormDialog.tsx:264-287`) calls `POST /api/invoices`. Verification engine compares against PO line items within ±₹0.01 tolerance (`backend/src/services/verificationService.js:120-126`).
- **Approvals Triage**: Approver navigates to `/approvals` (`src/pages/Approvals/ApprovalsPage.tsx:72-84`). Executes single or batch approval via `PATCH /api/invoices/:id/status` (`src/context/DataContext.tsx:381-392`), generating `APPROVAL` audit entries.
- **Payments Flow**: Admin schedules payment via `/payments` or invoice detail modal (`src/context/DataContext.tsx:427-443`). Mark paid updates invoice status to `Paid` and records `PAYMENT_COMPLETED` audit entry.
- **Vendors Directory**: Admin creates vendors via modal (`src/context/DataContext.tsx:465-474`); non-Admins restricted. Dynamic `totalInvoices` aggregation prevents count drift (`backend/src/controllers/vendorController.js:17-32`).
- **Reports & Audit Trail**: Admin and Approver inspect spend breakdown and cycle times (`src/pages/Reports/ReportsPage.tsx:20-50`). Audit Log page (`src/pages/AuditLog/AuditLogPage.tsx:20-60`) renders immutable trail with direct links to invoices.

## 6. Integration Issues Rated by Severity
- **[P1]** `src/pages/InvoiceDetail/DocumentViewerStub.tsx:41-43` & `src/pages/Invoices/InvoiceFormDialog.tsx:213-222, 271` <-> `backend/src/routes/invoices.routes.js:10, 21`: **UI File Attachment Stubbed**. Frontend client has working download/upload methods (`src/services/api/invoices.ts:64-87`), but UI only simulates file names and logs to console without triggering binary transfers.
- **[P1]** `backend/src/services/verificationService.js:124` & `backend/src/config/seed.js:421` <-> `backend/tests/invoices.test.js:284` & `backend/tests/seed.test.js:123`: **Currency Assertion Desync**. Verification service outputs Rupee sign `₹` (`exceeds ±₹0.01 tolerance`) while legacy Jest test assertions expect Dollar sign `$` (`exceeds ±$0.01 tolerance`), failing 2 test assertions.
- **[P1]** `backend/src/config/env.js:8-11` <-> `backend/src/config/db.js:76-78`: **Missing Default NODE_ENV in Standalone Backend**. Starting backend directly via `node src/server.js` omits `NODE_ENV=development`, disabling memory server fallback and crashing if local mongod is absent.
- **[P2]** `backend/src/controllers/invoiceController.js:237` <-> `src/types/index.ts:134`: **Silent Fallback for Invalid vendorId**. When `req.body.vendorId` is not a valid ObjectId, backend falls back to `new mongoose.Types.ObjectId()` rather than returning a 400 validation error.
- **[P2]** `src/pages/Reports/ExportButtons.tsx:68`: **PDF Export Action Stubbed**. Clicking "Export PDF" only outputs a toast notification and console message; CSV export functions normally.
- **[P2]** `backend/src/routes/purchaseOrders.routes.js:13-18` <-> `src/services/api/purchaseOrders.ts:5-23`: **Orphaned PO Creation Endpoint**. Backend defines `POST /api/purchase-orders`, but client API and frontend UI do not implement purchase order creation.

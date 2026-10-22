# PayVerify Remediation & Handoff Tasks

Deduplicated master task list for project stabilization and feature completion.
- Tag `[AG]`: Simple, mechanical fixes suitable for Antigravity (All Completed).
- Tag `[CC]`: Complex logic, architecture, or UI state tasks assigned to Claude Code.
- Priority:
  - `[P0]`: Breaks app, failing tests, or core feature missing. Completing P0s in sequence produces a fully working end-to-end demo.
  - `[P1]`: Works badly, degraded UX, unhandled errors, or security/architecture flaws.
  - `[P2]`: Polish, validation refinement, dead code, and hygiene.

---

### Priority 0: Core End-to-End Demo Blockers

1. [x] **[P0] [AG] Standardize Currency to Indian Rupees (₹) Everywhere**
   - **Files**: `backend/src/services/verificationService.js:124`, `backend/src/config/seed.js:626`, `backend/tests/invoices.test.js:284`, `backend/tests/seed.test.js:123`
   - **Problem**: Inconsistent currency symbols between backend verification messages (`₹`), test assertions (`$`), and frontend locale formatting.
   - **Fix**: Standardize on Indian Rupee (`₹` / `en-IN` locale) everywhere across verificationService, seed data, backend tests, and frontend components.

2. [x] ✅ **[P0] [CC] Implement End-to-End Invoice Document Upload and Attachment Viewing**
   - **Files**: `src/pages/Invoices/InvoiceFormDialog.tsx:214-222,271`, `src/pages/InvoiceDetail/DocumentViewerStub.tsx:41-43,75`, `src/services/api/invoices.ts:71,82`, `backend/src/routes/invoices.routes.js:10,21`
   - **Problem**: Document upload in invoice dialog saves only the filename string and discards binary data, while document viewer renders wireframe CSS and logs downloads to console.
   - **Fix**: Wire `InvoiceFormDialog` to send the `File` object via `uploadInvoiceAttachment` API, and replace `DocumentViewerStub` with real document fetching via `downloadInvoiceAttachment` with PDF/image preview.
   - **Done**: Files are stored on local disk (`backend/uploads/`, gitignored) through the existing Multer route. Server accepts only PDF/PNG/JPEG (MIME type **and** extension), max 10 MB, and returns a 400 `{ error }` otherwise; the dialog runs the same checks before submit. The dialog creates the invoice, then uploads the file. `DocumentViewerStub` fetches the file and shows a PDF (iframe) or image preview with a real Download button. In `VITE_API_MODE=mock` only the file name is kept (no file store).
   - **How to test it manually**:
     1. `npm start`, log in as `jordan.lee@apex.corp` / `DemoPassword!2026` (or any demo persona).
     2. Invoices → New Invoice → fill vendor, due date, one line item → Choose File → pick a PDF or PNG under 10 MB → Submit.
     3. Open the new invoice: the Attached Document panel shows the file name, real size, and a PDF/image preview. Click Download and the original file is saved.
     4. Try a `.txt` file or a file over 10 MB in the dialog: an inline error appears and the file is not attached.
     5. Seeded invoices list a document name but have no file on disk, so their panel shows "The document file is not available on the server." This is expected.

3. [x] ✅ **[P0] [CC] Connect Reports Page to Backend Analytics API**
   - **Files**: `src/pages/Reports/ReportsPage.tsx:21-65`, `src/services/api/reports.ts:35-50`, `src/context/DataContext.tsx:120`, `backend/src/controllers/reportsController.js:14,82`
   - **Problem**: `ReportsPage` bypasses backend `/api/reports/summary` and `/api/reports/vendor-breakdown` endpoints, calculating metrics client-side with a hardcoded reference date `'2026-09-15'`.
   - **Fix**: Refactor `ReportsPage` to consume `reportsSummary` and `vendorBreakdown` from `DataContext`/API, and dynamically pass user-selected date ranges instead of hardcoded date math.
   - **Notes**: `src/context/DataContext.tsx` was updated during Task 10 to safely export the `useDataContext()` hook.
   - **Done**: `ReportsPage` now calls `dataApi.getReportsSummary(from)` and `dataApi.getVendorBreakdown(from)` (real API or mock, per `VITE_API_MODE`) and re-fetches when the range changes. `from` is computed from today's date (`getRangeStart`): 30 days, 90 days, or 1 Jan. There are no client-side totals and no hardcoded date. Metric cards show `—` while loading, and a red banner with a Retry button appears on failure. Amounts are `₹` / `en-IN`.
   - **Decisions (made unattended)**: The page fetches directly instead of going through `DataContext`, because the context only holds an all-time summary with no range parameter. The page no longer needs a `DataProvider`, so the old "fallback without DataContext" test was replaced. "Active Vendors" now counts vendors with status `Active` instead of all vendors, matching its label.
   - **How to test manually**: `npm start`, log in as an Admin or Approver, open Reports. The totals and vendor table load from `/api/reports/*` (visible in the browser Network tab). Switch Date Range to "Last 30 Days" and both requests repeat with `?from=YYYY-MM-DD`, and the numbers change. Stop the backend and switch the range: the error banner appears. Restart the backend, click Retry, and the data comes back.

---

### Priority 1: Degraded Experience & Architectural Flaws

4. [x] **[P1] [AG] Enable Ephemeral Memory DB by Default in Standalone Backend**
   - **Files**: `backend/src/config/env.js:8-11`, `backend/src/config/db.js:76-78`, `backend/src/server.js:9-12`
   - **Problem**: Running `node backend/src/server.js` directly crashes if local MongoDB daemon is absent because `NODE_ENV` defaults to undefined.
   - **Fix**: Set default fallback `NODE_ENV = process.env.NODE_ENV || 'development'` in `backend/src/config/env.js` and auto-enable memory DB fallback in `server.js` for standalone development runs.

5. [x] ✅ **[P1] [CC] Render API Error States and Alerts on Data Pages**
   - **Files**: `src/pages/Invoices/InvoicesPage.tsx:23`, `src/pages/Approvals/ApprovalsPage.tsx:28`, `src/pages/Payments/PaymentsPage.tsx:27`, `src/pages/Vendors/VendorsPage.tsx:23`, `src/pages/AuditLog/AuditLogPage.tsx:18`, `src/context/DataContext.tsx:165`
   - **Problem**: Data pages ignore `dataContext.error` and `resourceErrors.*`, silently displaying empty tables when API calls fail without user feedback or retry actions.
   - **Fix**: Add error alert banners and retry triggers to table page components when `resourceErrors[entity]` is present.
   - **Notes**: `src/context/DataContext.tsx` was updated during Task 10 to safely export the `useDataContext()` hook.
   - **Done**: New shared `src/components/shared/ResourceErrorAlert.tsx` (red `role="alert"` banner + Retry that calls `refreshAll`). Placed under the header of Invoices / Approvals / Payments (`resourceErrors.invoices`), Vendors (`resourceErrors.vendors`), and Audit Log (`resourceErrors.auditLog`). Tests: `tests/pages/ResourceErrors.test.tsx`.
   - **Decision (made unattended)**: Banners key off `resourceErrors[entity]` only, as specified. The dev "simulate error" toggle sets just the global `error`, so it does not trigger them.
   - **How to test manually**: `npm start`, log in as Admin, open Invoices. Stop the backend (Ctrl+C on the server process), then click the Retry button on any page or reload the page. A red banner with the API error appears above the table instead of a silently empty table. Restart the backend and click Retry: the banner disappears and the rows load. Repeat on Vendors and Audit Log.

6. [x] ✅ **[P1] [CC] Standardize Invoice `submittedBy` Foreign Key Schema**
   - **Files**: `backend/src/models/Invoice.js:84`, `backend/src/controllers/invoiceController.js:14-49,83-120`, `backend/src/controllers/reportsController.js:40-77`
   - **Problem**: `submittedBy` is defined as `Mixed` instead of `ObjectId`, necessitating fragile string-vs-ObjectId heuristic branches across multiple controllers.
   - **Fix**: Migrate `submittedBy` to `mongoose.Schema.Types.ObjectId` referencing `User` with a migration/coercion helper for seed and legacy string IDs.
   - **Notes**: `backend/src/controllers/invoiceController.js` was modified during Task 12 to add strict `vendorId` ObjectId validation and existence checking against the `Vendor` collection.
   - **Done**: `submittedBy` is now `ObjectId` ref `User`; ownership/scoping in both controllers is a single ObjectId match. Legacy string/email values are converted by `Invoice.migrateLegacySubmittedBy()` (not yet called at boot; wire into `db.js` if a persistent DB holds legacy data).

7. [x] **[P1] [AG] Fix Insecure CORS Fallback and Dev Proxy Bypass**
   - **Files**: `backend/src/app.js:19`, `src/services/api/client.ts:3`, `.env:5`, `vite.config.ts:14`
   - **Problem**: Backend sets `origin: CLIENT_ORIGIN || '*'` with credentials (invalid CORS in browsers), while frontend uses absolute URL bypassing Vite dev proxy.
   - **Fix**: Reject wildcard origin when `credentials: true` in `app.js`, and update client base URL to relative `/api` in development to route through Vite proxy.

8. [x] **[P1] [AG] Add Rate Limiting Middleware to Authentication Endpoints**
   - **Files**: `backend/src/routes/auth.routes.js:14`, `backend/package.json:18`
   - **Problem**: `/api/auth/login` lacks request throttling, leaving user credentials vulnerable to brute-force attacks.
   - **Fix**: Add lightweight in-memory rate limiting middleware on `/login` and `/api/auth/login` allowing 10 attempts per 15-minute sliding window per IP.

9. [x] ✅ **[P1] [CC] Implement Global Search Functionality**
   - **Files**: `src/components/layout/TopBar.tsx:65-75`, `src/pages/Invoices/InvoicesPage.tsx:35`
   - **Problem**: TopBar search input updates local component state but provides no submit handler, Enter key listener, or navigation to invoices/vendors.
   - **Fix**: Wrap TopBar search in a form that on submit navigates to `/invoices?search=${query}` and sets search filter in table state.
   - **Done**: New `src/components/layout/GlobalSearch.tsx`, used by `TopBar`. Input is debounced (250 ms, min 2 chars) and searches already-loaded `DataContext` data: invoices by number or vendor name, vendors by name, up to 5 of each. The dropdown is an accessible combobox: ↑/↓ to move, Enter or click to open `/invoices/:id` or `/vendors/:id`, Esc to close. Enter with nothing highlighted goes to `/invoices?search=<q>`, and `InvoicesPage` now seeds its search filter from `?search=`. Tests: `tests/components/GlobalSearch.test.tsx`.
   - **Decisions (made unattended)**: Search is client-side over data already loaded (no new endpoint). Requester results are scoped to their own invoices, the same as `InvoicesPage`. Input role changed from `searchbox` to `combobox`, and `tests/components/layout.test.tsx` was updated to match.
   - **How to test manually**: `npm start`, log in. Type `apex` in the top-bar search: after a short pause a dropdown lists matching invoices and the vendor. Click the vendor to open its detail page. Type `INV-2026`, press ↓ then Enter to open that invoice. Type `cloud` and press Enter straight away to land on Invoices with the search box pre-filled and the table filtered.

10. [x] **[P1] [AG] Add Loading Skeleton to Dashboard Page**
    - **Files**: `src/pages/Dashboard/DashboardPage.tsx:24-30`
    - **Problem**: Dashboard does not check `loading` state from `DataContext`, causing KPI tiles to flash `0` / empty counters before API data arrives.
    - **Fix**: Check `loading` from `useDataContext()` and display skeleton placeholder cards while initial metrics are being fetched.

---

### Priority 2: Polish & Code Hygiene

11. [ ] **[P2] [CC] Implement PDF Export for Reports**
    - **Files**: `src/pages/Reports/ExportButtons.tsx:68-80`
    - **Problem**: "Export PDF (Stub)" button only logs to console and displays a toast without generating a file.
    - **Fix**: Implement printable PDF generation using browser print stylesheets or a client-side PDF export utility.

12. [x] **[P2] [AG] Return 400 Bad Request on Invalid `vendorId` in Invoice Creation**
    - **Files**: `backend/src/controllers/invoiceController.js:237`, `src/types/index.ts:134`
    - **Problem**: When `vendorId` is invalid, backend silently generates a random `ObjectId` instead of returning a 400 validation error.
    - **Fix**: Add `mongoose.Types.ObjectId.isValid(req.body.vendorId)` check and verify vendor existence in `createInvoice`, returning 400 if invalid or not found.

13. [x] **[P2] [AG] Clean Up Redundant Controller Aliases and Fix Smoke Test Auth**
    - **Files**: `backend/src/controllers/invoicesController.js:1-2`, `backend/scripts/smokeTest.js:137`, `backend/src/routes/notifications.routes.js:11`
    - **Problem**: Untracked duplicate controller alias `invoicesController.js` clutters tree; smoke test calls `/api/reports/summary` unauthenticated and gets 401; duplicate `POST /notifications/:id/read` route alias exists.
    - **Fix**: Delete `invoicesController.js`, add auth token header to smoke test report request, and document backwards-compatible notifications route alias.

14. [x] **[P2] [AG] Remove Unused Native `bcrypt` Dependency and Prune Dead Env Keys**
    - **Files**: `backend/package.json:14`, `backend/.env.example:32,35`
    - **Problem**: `backend/package.json` declares unused native `bcrypt` requiring C++ compilation, while `EMAIL_FROM` and `REMINDER_CRON_SCHEDULE` in `.env.example` are ignored in code.
    - **Fix**: Remove `"bcrypt"` from `backend/package.json` dependencies and prune unreferenced keys from `backend/.env.example`.

15. [x] **[P2] [AG] Prune Orphaned Landing Subcomponents and Clean Legacy Route Placeholders**
    - **Files**: `src/pages/Landing/components/LandingHero.tsx:4`, `LandingStats.tsx`, `LandingFeatures.tsx`, `LandingNav.tsx`, `LandingFooter.tsx`, `LandingAuthHub.tsx`, `src/app/routes.tsx:19-24`
    - **Problem**: Dead unmounted subcomponents remain from simplified landing page, and unused placeholder component imports clutter `routes.tsx`.
    - **Fix**: Remove unused components in `src/pages/Landing/components/` and delete unused legacy placeholder imports from `routes.tsx`.

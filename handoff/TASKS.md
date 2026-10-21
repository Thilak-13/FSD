# PayVerify Remediation & Handoff Tasks

Deduplicated master task list for project stabilization and feature completion.
- Tag `[AG]`: Simple, mechanical fixes suitable for Antigravity.
- Tag `[CC]`: Complex logic, architecture, or UI state tasks assigned to Claude Code.
- Priority:
  - `[P0]`: Breaks app, failing tests, or core feature missing. Completing P0s in sequence produces a fully working end-to-end demo.
  - `[P1]`: Works badly, degraded UX, unhandled errors, or security/architecture flaws.
  - `[P2]`: Polish, validation refinement, dead code, and hygiene.

---

### Priority 0: Core End-to-End Demo Blockers

1. **[P0] [AG] Fix Currency Symbol Mismatch in Variance Assertion**
   - **Files**: `backend/src/services/verificationService.js:124`, `backend/src/config/seed.js:626`, `backend/tests/invoices.test.js:284`, `backend/tests/seed.test.js:123`
   - **Problem**: Verification service and seed data output Rupee symbol (`±₹0.01 tolerance`) while Jest test assertions expect Dollar (`±$0.01 tolerance`), causing 2 test suite failures.
   - **Fix**: Align the tolerance message in `verificationService.js` and `seed.js` with test expectations (`±$0.01 tolerance`) so `npm run server:test` passes 100%.

2. **[P0] [CC] Implement End-to-End Invoice Document Upload and Attachment Viewing**
   - **Files**: `src/pages/Invoices/InvoiceFormDialog.tsx:214-222,271`, `src/pages/InvoiceDetail/DocumentViewerStub.tsx:41-43,75`, `src/services/api/invoices.ts:71,82`, `backend/src/routes/invoices.routes.js:10,21`
   - **Problem**: Document upload in invoice dialog saves only the filename string and discards binary data, while document viewer renders wireframe CSS and logs downloads to console.
   - **Fix**: Wire `InvoiceFormDialog` to send the `File` object via `uploadInvoiceAttachment` API, and replace `DocumentViewerStub` with real document fetching via `downloadInvoiceAttachment` with PDF/image preview.

3. **[P0] [CC] Connect Reports Page to Backend Analytics API**
   - **Files**: `src/pages/Reports/ReportsPage.tsx:21-65`, `src/services/api/reports.ts:35-50`, `src/context/DataContext.tsx:120`, `backend/src/controllers/reportsController.js:14,82`
   - **Problem**: `ReportsPage` bypasses backend `/api/reports/summary` and `/api/reports/vendor-breakdown` endpoints, calculating metrics client-side with a hardcoded reference date `'2026-09-15'`.
   - **Fix**: Refactor `ReportsPage` to consume `reportsSummary` and `vendorBreakdown` from `DataContext`/API, and dynamically pass user-selected date ranges instead of hardcoded date math.

---

### Priority 1: Degraded Experience & Architectural Flaws

4. **[P1] [AG] Enable Ephemeral Memory DB by Default in Standalone Backend**
   - **Files**: `backend/src/config/env.js:8-11`, `backend/src/config/db.js:76-78`
   - **Problem**: Running `node backend/src/server.js` directly crashes if local MongoDB daemon is absent because `NODE_ENV` defaults to undefined.
   - **Fix**: Set default fallback `NODE_ENV = process.env.NODE_ENV || 'development'` in `backend/src/config/env.js` so memory server fallback activates automatically.

5. **[P1] [CC] Render API Error States and Alerts on Data Pages**
   - **Files**: `src/pages/Invoices/InvoicesPage.tsx:23`, `src/pages/Approvals/ApprovalsPage.tsx:28`, `src/pages/Payments/PaymentsPage.tsx:27`, `src/pages/Vendors/VendorsPage.tsx:23`, `src/pages/AuditLog/AuditLogPage.tsx:18`, `src/context/DataContext.tsx:165`
   - **Problem**: Data pages ignore `dataContext.error` and `resourceErrors.*`, silently displaying empty tables when API calls fail without user feedback or retry actions.
   - **Fix**: Add error alert banners and retry triggers to table page components when `resourceErrors[entity]` is present.

6. **[P1] [CC] Standardize Invoice `submittedBy` Foreign Key Schema**
   - **Files**: `backend/src/models/Invoice.js:84`, `backend/src/controllers/invoiceController.js:14-49,83-120`, `backend/src/controllers/reportsController.js:40-77`
   - **Problem**: `submittedBy` is defined as `Mixed` instead of `ObjectId`, necessitating fragile string-vs-ObjectId heuristic branches across multiple controllers.
   - **Fix**: Migrate `submittedBy` to `mongoose.Schema.Types.ObjectId` referencing `User` with a migration/coercion helper for seed and legacy string IDs.

7. **[P1] [AG] Fix Insecure CORS Fallback and Dev Proxy Bypass**
   - **Files**: `backend/src/app.js:19`, `src/services/api/client.ts:3`, `.env:5`, `vite.config.ts:14`
   - **Problem**: Backend sets `origin: CLIENT_ORIGIN || '*'` with credentials (invalid CORS in browsers), while frontend uses absolute URL bypassing Vite dev proxy.
   - **Fix**: Reject wildcard origin when `credentials: true` in `app.js`, and update client base URL to relative `/api` in development to route through Vite proxy.

8. **[P1] [AG] Add Rate Limiting Middleware to Authentication Endpoints**
   - **Files**: `backend/src/routes/auth.routes.js:14`, `backend/package.json:18`
   - **Problem**: `/api/auth/login` lacks request throttling, leaving user credentials vulnerable to brute-force attacks.
   - **Fix**: Install `express-rate-limit` and attach a 5-attempts per 15-minute limiter to `/api/auth/login`.

9. **[P1] [CC] Implement Global Search Functionality**
   - **Files**: `src/components/layout/TopBar.tsx:65-75`, `src/pages/Invoices/InvoicesPage.tsx:35`
   - **Problem**: TopBar search input updates local component state but provides no submit handler, Enter key listener, or navigation to invoices/vendors.
   - **Fix**: Wrap TopBar search in a form that on submit navigates to `/invoices?search=${query}` and sets search filter in table state.

10. **[P1] [AG] Add Loading Skeleton to Dashboard Page**
    - **Files**: `src/pages/Dashboard/DashboardPage.tsx:24-30`
    - **Problem**: Dashboard does not check `loading` state from `DataContext`, causing KPI tiles to flash `0` / empty counters before API data arrives.
    - **Fix**: Check `loading` from `useDataContext()` and display skeleton placeholder cards while initial metrics are being fetched.

---

### Priority 2: Polish & Code Hygiene

11. **[P2] [CC] Implement PDF Export for Reports**
    - **Files**: `src/pages/Reports/ExportButtons.tsx:68-80`
    - **Problem**: "Export PDF (Stub)" button only logs to console and displays a toast without generating a file.
    - **Fix**: Implement printable PDF generation using browser print stylesheets or a client-side PDF export utility.

12. **[P2] [AG] Return 400 Bad Request on Invalid `vendorId` in Invoice Creation**
    - **Files**: `backend/src/controllers/invoiceController.js:237`, `src/types/index.ts:134`
    - **Problem**: When `vendorId` is invalid, backend silently generates a random `ObjectId` instead of returning a 400 validation error.
    - **Fix**: Add `mongoose.Types.ObjectId.isValid(req.body.vendorId)` check in `createInvoice` and return 400 if invalid.

13. **[P2] [AG] Clean Up Redundant Controller Aliases and Fix Smoke Test Auth**
    - **Files**: `backend/src/controllers/invoicesController.js:1-2`, `backend/scripts/smokeTest.js:137`, `backend/src/routes/notifications.routes.js:11`
    - **Problem**: Untracked duplicate controller alias `invoicesController.js` clutters tree; smoke test calls `/api/reports/summary` unauthenticated and gets 401; duplicate `POST /notifications/:id/read` route alias exists.
    - **Fix**: Delete `invoicesController.js`, add auth token header to smoke test report request, and remove duplicate route alias.

14. **[P2] [AG] Remove Unused Native `bcrypt` Dependency and Prune Dead Env Keys**
    - **Files**: `backend/package.json:14`, `backend/.env.example:32,35`
    - **Problem**: `backend/package.json` declares unused native `bcrypt` requiring C++ compilation, while `EMAIL_FROM` and `REMINDER_CRON_SCHEDULE` in `.env.example` are ignored in code.
    - **Fix**: Remove `"bcrypt"` from `backend/package.json` dependencies and prune unreferenced keys from `backend/.env.example`.

15. **[P2] [AG] Prune Orphaned Landing Subcomponents and Clean Legacy Route Placeholders**
    - **Files**: `src/pages/Landing/components/LandingHero.tsx:4`, `LandingStats.tsx`, `LandingFeatures.tsx`, `LandingNav.tsx`, `LandingFooter.tsx`, `LandingAuthHub.tsx`, `src/app/routes.tsx:19-24`
    - **Problem**: Dead unmounted subcomponents remain from simplified landing page, and unused placeholder component imports clutter `routes.tsx`.
    - **Fix**: Remove unused components in `src/pages/Landing/components/` and delete unused legacy placeholder imports from `routes.tsx`.

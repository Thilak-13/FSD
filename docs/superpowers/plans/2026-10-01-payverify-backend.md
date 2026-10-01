# PayVerify Backend API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:dispatching-parallel-agents with the user's explicit directive to use 3 agents. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-grade Node.js / Express / MongoDB / TypeScript backend API for PayVerify that matches the existing frontend mock layer contracts, business logic, verification rules, file attachments, and scheduled jobs.

**Architecture:** A standalone Express application in `server/` with isolated dependencies, TypeScript compilation, Mongoose data models, JWT authentication, role-based access control, Multer file upload, node-cron scheduled background tasks, Nodemailer delivery, and comprehensive Jest + Supertest integration tests utilizing `mongodb-memory-server`.

**Tech Stack:** Node.js, Express, TypeScript, MongoDB / Mongoose, JWT (`jsonwebtoken`), `bcryptjs`, Multer, `node-cron`, Nodemailer, Jest, Supertest, `mongodb-memory-server`.

## Global Constraints
- Do not modify any `.tsx` files or files in `src/pages/` or `src/components/`.
- Maintain exact field names and shapes matching `src/types/index.ts` so frontend integration is a clean service-layer swap.
- Tolerance rule: invoice amount vs. PO amount must match within ±$0.01; line item unit prices within ±$0.001; quantities must not exceed PO quantities.
- Scheduled cron job sends emails via Nodemailer; on-read notifications are dynamically derived via `GET /api/notifications`.
- No secrets committed to source control; provide `.env.example`.
- Every "done" claim must include real command output and passing test results.

---

### Task 1: Backend Foundation, Database Connection & In-Memory Test Setup

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/jest.config.ts`
- Create: `server/.env.example`
- Create: `server/src/config/env.ts`
- Create: `server/src/db/connection.ts`
- Create: `server/src/test/setup.ts`
- Create: `server/src/app.ts`
- Create: `server/src/server.ts`

**Interfaces:**
- Produces: `app` Express application instance, `connectDB()`, `disconnectDB()`, and `setupTestDB()` test harness.

- [ ] **Step 1: Create `server/package.json` and install dependencies**
  Configure scripts: `"dev": "tsx watch src/server.ts"`, `"build": "tsc"`, `"test": "jest --runInBand --detectOpenHandles"`.
  Dependencies: `express`, `mongoose`, `cors`, `dotenv`, `jsonwebtoken`, `bcryptjs`, `multer`, `node-cron`, `nodemailer`.
  DevDependencies: `typescript`, `@types/node`, `@types/express`, `@types/cors`, `@types/jsonwebtoken`, `@types/bcryptjs`, `@types/multer`, `@types/node-cron`, `@types/nodemailer`, `jest`, `ts-jest`, `@types/jest`, `supertest`, `@types/supertest`, `mongodb-memory-server`, `tsx`.

- [ ] **Step 2: Configure TypeScript (`server/tsconfig.json`) and Jest (`server/jest.config.ts`)**
  Configure TypeScript for Node Next / CommonJS module resolution and Jest with `ts-jest` preset and global test setup for `mongodb-memory-server`.

- [ ] **Step 3: Implement Database Connection (`server/src/db/connection.ts`) and Test DB Setup (`server/src/test/setup.ts`)**
  Manage MongoDB connection via Mongoose with clean connection handling and support for in-memory MongoDB server during testing.

- [ ] **Step 4: Implement Express App Configuration (`server/src/app.ts`) and Bootstrap (`server/src/server.ts`)**
  Setup CORS for `http://localhost:5173`, JSON body parsing with Express, health check route `GET /health`, and centralized error handling middleware.

- [ ] **Step 5: Verify test harness runs**
  Run: `npm test --prefix server`
  Expected: Passes with health check test.

---

### Task 2 (Agent 1 Track): Auth, RBAC, Users, Vendors & Purchase Orders

**Files:**
- Create: `server/src/models/User.ts`
- Create: `server/src/models/Vendor.ts`
- Create: `server/src/models/PurchaseOrder.ts`
- Create: `server/src/middleware/auth.ts`
- Create: `server/src/routes/auth.routes.ts`
- Create: `server/src/routes/vendors.routes.ts`
- Create: `server/src/routes/purchaseOrders.routes.ts`
- Create: `server/src/db/seed.ts`
- Test: `server/src/test/auth.test.ts`
- Test: `server/src/test/rbac.test.ts`
- Test: `server/src/test/vendors.test.ts`
- Test: `server/src/test/purchaseOrders.test.ts`

**Interfaces:**
- Consumes: `app` from Task 1
- Produces:
  - `authenticateJWT` middleware attaching `req.user: { id, email, role, name }`
  - `requireRole(roles: Role[])` middleware
  - `POST /api/auth/login` -> `{ token, user }`
  - `GET /api/vendors` -> `Vendor[]`
  - `GET /api/vendors/:id` -> `Vendor & { invoices: Invoice[] }`
  - `POST /api/vendors` (Admin only) -> `Vendor`
  - `GET /api/purchase-orders?vendorId=` -> `PurchaseOrder[]`

- [ ] **Step 1: Implement Mongoose Models (`User`, `Vendor`, `PurchaseOrder`)**
  Port fields from `src/types/index.ts`. Add transform to expose virtual `id` without `_id` and `__v`.

- [ ] **Step 2: Implement Auth & RBAC Middleware (`server/src/middleware/auth.ts`)**
  JWT token parsing and role-check authorization guard.

- [ ] **Step 3: Implement Auth Routes (`server/src/routes/auth.routes.ts`)**
  Verify email and password with bcrypt; sign JWT token with 8h expiry.

- [ ] **Step 4: Implement Vendor & PO Routes (`server/src/routes/vendors.routes.ts`, `server/src/routes/purchaseOrders.routes.ts`)**
  List and create vendors (Admin restricted); list POs with optional `vendorId` filter.

- [ ] **Step 5: Run integration tests for Auth, RBAC, Vendors, and POs**
  Run: `npx jest src/test/auth.test.ts src/test/rbac.test.ts src/test/vendors.test.ts src/test/purchaseOrders.test.ts`
  Expected: All suites pass.

---

### Task 3 (Agent 2 Track): Invoices Core, Verification Rules, File Upload & Auto-Audit Trail

**Files:**
- Create: `server/src/models/Invoice.ts`
- Create: `server/src/models/AuditEntry.ts`
- Create: `server/src/middleware/upload.ts`
- Create: `server/src/services/verification.service.ts`
- Create: `server/src/services/audit.service.ts`
- Create: `server/src/routes/invoices.routes.ts`
- Create: `server/src/routes/auditLog.routes.ts`
- Test: `server/src/test/verification.test.ts`
- Test: `server/src/test/invoices.test.ts`
- Test: `server/src/test/auditLog.test.ts`

**Interfaces:**
- Consumes: `authenticateJWT`, `requireRole`, `User`, `Vendor`, `PurchaseOrder`
- Produces:
  - `verifyInvoice(input, linkedPo)` -> `{ status, flagReason, items }`
  - `recordAuditEntry(invoiceId, action, performedBy, details)` -> `AuditEntry`
  - `GET /api/invoices?status=&vendor=&from=&to=&search=` -> `Invoice[]`
  - `GET /api/invoices/:id` -> `Invoice`
  - `POST /api/invoices` -> `Invoice`
  - `PATCH /api/invoices/:id/status` -> `Invoice` (with auto-audit entry)
  - `POST /api/invoices/:id/attachment` -> `{ message, documentName, documentPath }`
  - `GET /api/audit-log?invoiceId=&user=&action=` -> `AuditEntry[]`

- [ ] **Step 1: Implement Models (`Invoice`, `AuditEntry`) and Multer Upload Middleware (`upload.ts`)**
  Define Invoice and AuditEntry Mongoose schemas. Configure Multer disk storage in `server/uploads/` with sanitized filenames.

- [ ] **Step 2: Implement Verification Engine (`server/src/services/verification.service.ts`)**
  Implement PO amount matching (±$0.01 tolerance), line-item price (±$0.001) & quantity checks, and duplicate invoice number check.

- [ ] **Step 3: Implement Automated Audit Service (`server/src/services/audit.service.ts`)**
  Persist audit records for every creation and status change (`SUBMISSION`, `VERIFICATION`, `APPROVAL`, `FLAGGED`, `PAYMENT_SCHEDULED`, `PAYMENT_COMPLETED`).

- [ ] **Step 4: Implement Invoices & Audit Log Routes (`invoices.routes.ts`, `auditLog.routes.ts`)**
  Connect verification engine to `POST /api/invoices`, audit logging to `PATCH /api/invoices/:id/status`, and file upload to `POST /api/invoices/:id/attachment`.

- [ ] **Step 5: Run integration tests for Verification, Invoices, and Audit Log**
  Run: `npx jest src/test/verification.test.ts src/test/invoices.test.ts src/test/auditLog.test.ts`
  Expected: All suites pass with explicit pass/fail tolerance fixtures.

---

### Task 4 (Agent 3 Track): Reports, Dynamic Notifications, Scheduled Cron & Nodemailer

**Files:**
- Create: `server/src/services/reports.service.ts`
- Create: `server/src/services/notifications.service.ts`
- Create: `server/src/services/mailer.service.ts`
- Create: `server/src/services/cron.service.ts`
- Create: `server/src/routes/reports.routes.ts`
- Create: `server/src/routes/notifications.routes.ts`
- Test: `server/src/test/reports.test.ts`
- Test: `server/src/test/notifications.test.ts`
- Test: `server/src/test/cron.test.ts`

**Interfaces:**
- Consumes: `Invoice`, `Vendor`, `User`, `authenticateJWT`
- Produces:
  - `GET /api/reports/summary?from=&to=` -> `{ totalBilled, totalPaid, pendingBalance, spendPending, requiresApprovalCount, flaggedCount, scheduledDisbursements }`
  - `GET /api/reports/vendor-breakdown?from=&to=` -> `VendorReportRow[]`
  - `GET /api/notifications` -> `Notification[]`
  - `initCronJobs()` scheduled service and `runInvoiceReminderScan()` programmatic scan helper

- [ ] **Step 1: Implement Reports Analytics Service & Routes (`reports.service.ts`, `reports.routes.ts`)**
  Calculate financial summary KPIs and per-vendor statistics matching frontend formulas and date range filters.

- [ ] **Step 2: Implement Dynamic Notifications Service & Routes (`notifications.service.ts`, `notifications.routes.ts`)**
  Evaluate invoice conditions (>3d pending, due in <=5d, overdue, flagged). Scope results to user roles.

- [ ] **Step 3: Implement Nodemailer Service (`mailer.service.ts`) & Node-Cron Scheduled Job (`cron.service.ts`)**
  Scan pending/overdue invoices, group reminders, and dispatch email notifications via Nodemailer test transport.

- [ ] **Step 4: Run integration tests for Reports, Notifications, and Cron**
  Run: `npx jest src/test/reports.test.ts src/test/notifications.test.ts src/test/cron.test.ts`
  Expected: All suites pass.

---

### Task 5: Integration, Real API Client Adapter, Cutover Documentation & Verification

**Files:**
- Create: `server/src/db/seed.ts` (Database seed script with initial mock data and hashed passwords)
- Create: `src/services/api/index.ts`
- Create: `src/services/api/invoices.ts`
- Create: `src/services/api/vendors.ts`
- Create: `src/services/api/purchaseOrders.ts`
- Create: `src/services/api/auditLog.ts`
- Create: `src/services/api/notifications.ts`
- Create: `src/services/api/reports.ts`
- Modify: `package.json` (add root convenience scripts: `"server:dev"`, `"server:test"`, `"server:seed"`)
- Document: Cutover instructions and response shape parity report

- [ ] **Step 1: Implement Seed Script (`server/src/db/seed.ts`)**
  Populate MongoDB with `INITIAL_USERS`, `INITIAL_VENDORS`, `INITIAL_PURCHASE_ORDERS`, and `INITIAL_INVOICES`, hashing passwords with bcrypt.

- [ ] **Step 2: Implement Frontend Real API Client Adapter (`src/services/api/*.ts`)**
  Implement identical TypeScript function signatures calling backend endpoints via `fetch`, passing stored auth token in `Authorization` header.

- [ ] **Step 3: Run the full backend test suite**
  Run: `npm test --prefix server`
  Ensure 100% passing tests across all test suites with zero warnings or unhandled promises.

- [ ] **Step 4: Verify concurrent execution setup & document Cutover Plan**
  Test server startup and seed script. Document cutover instructions for switching `DataContext.tsx`.

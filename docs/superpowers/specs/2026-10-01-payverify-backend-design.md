# PayVerify Backend API Specification & Architecture Design

- **Date**: 2026-10-01
- **Status**: Approved
- **Topic**: PayVerify Backend API, Database, Auth/RBAC, Business Logic & Background Jobs

---

## 1. Overview & Objective

PayVerify is an invoice verification and vendor payment platform. Currently, the frontend runs against an in-memory mock data layer at `src/services/mockApi/*.ts`. 

The objective is to implement a robust, production-grade Node.js/Express/MongoDB backend API that faithfully mirrors the data shapes, verification rules, and lifecycle logic of the frontend mock layer. This ensures that frontend integration is a seamless service-layer swap (`src/services/api/*.ts`) requiring zero changes to existing React components or pages.

---

## 2. Scope Boundaries

- **In Scope**:
  - Standalone backend server in `server/` with Express, TypeScript, Mongoose, JWT, bcryptjs, Multer, node-cron, Nodemailer, Jest, and Supertest.
  - Integration testing with `mongodb-memory-server` for deterministic offline verification.
  - Server-side business logic: 3-way match verification (tolerance ±$0.01 amount, ±$0.001 unit price, no quantity overbill), duplicate invoice detection, auto-audit logging, dynamic notification derivation, and scheduled email alerts.
  - Real API service adapter `src/services/api/*.ts` matching `src/services/mockApi/*.ts` signatures.
  - Dev setup with `.env.example`, CORS configured for Vite dev server (`http://localhost:5173`), and concurrent dev scripts.
- **Out of Scope**:
  - Modifying any `.tsx` files or files under `src/pages/` or `src/components/`.
  - Modifying frontend `LoginPage.tsx` (real credential form submission will be flagged as a follow-up).
  - Executing frontend cutover in `DataContext.tsx` (design and prepare for cutover, do not switch until directed).

---

## 3. Tech Stack & Directory Structure

### 3.1 Tech Stack
- **Runtime & Framework**: Node.js (ES modules / CommonJS via TS), Express 4.x
- **Language**: TypeScript 5.x
- **Database**: MongoDB via Mongoose 8.x
- **Testing**: Jest 29.x, `ts-jest`, Supertest 7.x, `mongodb-memory-server` 10.x
- **Authentication**: `jsonwebtoken` (JWT access token), `bcryptjs` for password hashing
- **File Uploads**: `multer` (local disk storage in `server/uploads/`)
- **Scheduled Jobs**: `node-cron`
- **Email Delivery**: `nodemailer` (with Ethereal / test transport in dev/test)
- **CORS**: `cors` package configured for Vite dev server

### 3.2 Directory Structure
```
server/
├── package.json
├── tsconfig.json
├── jest.config.ts
├── .env.example
├── uploads/                    # Local storage for invoice attachments (.gitignored)
└── src/
    ├── app.ts                  # Express app setup (middleware, routes, error handling)
    ├── server.ts               # HTTP listen & MongoDB connection bootstrap
    ├── config/
    │   └── env.ts              # Strongly typed environment configuration
    ├── db/
    │   ├── connection.ts       # Mongoose connect & disconnect helpers
    │   └── seed.ts             # Initial database seed script (users, vendors, POs, invoices, audits)
    ├── middleware/
    │   ├── auth.ts             # authenticateJWT & requireRole
    │   ├── upload.ts           # Multer file upload handler
    │   └── errorHandler.ts     # Global HTTP error handler
    ├── models/
    │   ├── User.ts
    │   ├── Vendor.ts
    │   ├── PurchaseOrder.ts
    │   ├── Invoice.ts
    │   └── AuditEntry.ts
    ├── routes/
    │   ├── auth.routes.ts
    │   ├── vendors.routes.ts
    │   ├── purchaseOrders.routes.ts
    │   ├── invoices.routes.ts
    │   ├── auditLog.routes.ts
    │   ├── reports.routes.ts
    │   └── notifications.routes.ts
    ├── services/
    │   ├── verification.service.ts   # 3-way match, tolerance & duplicate rules
    │   ├── audit.service.ts          # Automated audit trail recorder
    │   ├── reports.service.ts        # KPIs and vendor breakdown aggregations
    │   ├── notifications.service.ts  # Dynamic notification derivation
    │   ├── mailer.service.ts         # Nodemailer email dispatcher
    │   └── cron.service.ts           # node-cron scheduled reminder runner
    └── types/
        └── index.ts                  # Domain & Express types matching frontend contracts
```

---

## 4. Data Models & Mongoose Schemas

All schemas maintain exact parity with `src/types/index.ts`. All documents include a virtual `id` mapping `_id.toString()` with JSON transform removing `_id` and `__v` to match frontend interface shapes.

### 4.1 User Schema
- `name`: String, required
- `email`: String, required, unique, lowercase, trimmed
- `passwordHash`: String, required
- `role`: String, enum: `['Admin', 'Approver', 'Requester']`, required
- `department`: String, optional
- `avatarUrl`: String, optional

### 4.2 Vendor Schema
- `name`: String, required
- `contactEmail`: String, required
- `paymentTerms`: String, enum: `['Net 15', 'Net 30', 'Net 45', 'Net 60']`, required
- `address`: String, required
- `taxId`: String, required
- `status`: String, enum: `['Active', 'Under Review', 'Inactive']`, default: `'Active'`
- `phone`: String, optional
- `totalInvoices`: Number, default: 0

### 4.3 PurchaseOrder Schema
- `poNumber`: String, required, unique
- `vendorId`: String (references Vendor id), required
- `amount`: Number, required
- `description`: String, required
- `createdDate`: String (YYYY-MM-DD), required
- `status`: String, enum: `['Open', 'Partially Invoiced', 'Fulfilled', 'Closed']`, default: `'Open'`
- `items`: Subdocument array:
  - `id`: String
  - `description`: String
  - `quantity`: Number
  - `unitPrice`: Number
  - `total`: Number

### 4.4 Invoice Schema
- `invoiceNumber`: String, required, unique
- `vendorId`: String, required
- `poId`: String, optional
- `amount`: Number, required
- `dueDate`: String (YYYY-MM-DD), required
- `submittedDate`: String (YYYY-MM-DD), required
- `status`: String, enum: `['Submitted', 'Under Verification', 'Approved', 'Flagged', 'Payment Scheduled', 'Paid']`, default: `'Submitted'`
- `submittedBy`: String, required
- `attachedDocumentName`: String, optional
- `attachedDocumentPath`: String, optional
- `flagReason`: String, optional
- `scheduledPaymentDate`: String, optional
- `paidDate`: String, optional
- `notes`: String, optional
- `items`: Subdocument array:
  - `id`: String
  - `description`: String
  - `quantity`: Number
  - `unitPrice`: Number
  - `total`: Number
  - `matchedPoItemId`: String, optional
  - `priceMismatch`: Boolean, default: false
  - `quantityMismatch`: Boolean, default: false

### 4.5 AuditEntry Schema
- `invoiceId`: String, required
- `action`: String, enum: `['SUBMISSION', 'VERIFICATION', 'APPROVAL', 'FLAGGED', 'PAYMENT_SCHEDULED', 'PAYMENT_COMPLETED']`, required
- `performedBy`: String, required
- `timestamp`: String (ISO 8601), required
- `details`: String, optional

### 4.6 Notification
- Dynamically computed at runtime on read via `GET /api/notifications` without persistent storage overhead, preserving the frontend's runtime derivation model.

---

## 5. Auth & RBAC Specification

### 5.1 Endpoints
- `POST /api/auth/login`:
  - Request body: `{ email: string, password: string }`
  - Validates credentials using `bcrypt.compare`.
  - Generates JWT token with payload `{ id: user.id, email: user.email, role: user.role, name: user.name }`.
  - Response: `{ token: string, user: User }` (excluding `passwordHash`).

### 5.2 Middleware
- `authenticateJWT`:
  - Reads `Authorization: Bearer <token>` header.
  - Verifies token with `JWT_SECRET`.
  - Attaches `req.user = decoded`.
  - Returns `401 Unauthorized` if token is missing, expired, or invalid.
- `requireRole(allowedRoles: Role[])`:
  - Checks if `req.user.role` is in `allowedRoles`.
  - Returns `403 Forbidden` with `{ error: 'Forbidden: Insufficient permissions' }` if not allowed.

### 5.3 Route Permissions Matrix
| Method | Route | Allowed Roles |
|---|---|---|
| POST | `/api/auth/login` | Public |
| GET | `/api/invoices` | Admin, Approver, Requester (Requesters filtered to own submissions) |
| GET | `/api/invoices/:id` | Admin, Approver, Requester (own or privileged) |
| POST | `/api/invoices` | Requester, Admin |
| PATCH | `/api/invoices/:id/status` | Approver, Admin |
| POST | `/api/invoices/:id/attachment` | Requester, Approver, Admin |
| GET | `/api/vendors` | All authenticated |
| GET | `/api/vendors/:id` | All authenticated |
| POST | `/api/vendors` | Admin only |
| GET | `/api/purchase-orders` | All authenticated |
| GET | `/api/audit-log` | Admin, Approver |
| GET | `/api/reports/summary` | Admin, Approver |
| GET | `/api/reports/vendor-breakdown` | Admin, Approver |
| GET | `/api/notifications` | All authenticated (Requesters receive own alerts; Admins/Approvers receive all) |

---

## 6. Business Logic Engine

### 6.1 Verification Rules (`services/verification.service.ts`)
Run on `POST /api/invoices`:
1. **Duplicate Invoice Number Check**:
   - Queries `Invoice` model for matching `invoiceNumber`.
   - If found, invoice is marked `'Flagged'` with `flagReason: 'Duplicate invoice number detected: ${invoiceNumber}'`.
2. **PO Matching (3-Way Verification)**:
   - If `poId` is provided, fetch `PurchaseOrder`.
   - **Amount Tolerance**: Math.abs(invoice.amount - po.amount) <= 0.01. If variance > $0.01, mark `priceMismatch` or flag amount discrepancy.
   - **Line Item Checks**:
     - Match line items by `matchedPoItemId` or exact/case-insensitive description.
     - **Price Check**: Math.abs(item.unitPrice - poItem.unitPrice) > 0.001 flags `priceMismatch = true`.
     - **Quantity Check**: item.quantity > poItem.quantity flags `quantityMismatch = true`.
   - **Status Outcome**:
     - If any discrepancies exist -> status `'Flagged'`, `flagReason` populated with specific mismatches.
     - If all items and amounts match -> status `'Under Verification'`.
   - If no `poId` is provided -> status `'Submitted'`.

### 6.2 Automatic Audit Logging (`services/audit.service.ts`)
- On invoice creation: writes `SUBMISSION` entry.
- On `PATCH /api/invoices/:id/status`:
  - `status === 'Approved'` -> `APPROVAL`
  - `status === 'Flagged'` -> `FLAGGED`
  - `status === 'Payment Scheduled'` -> `PAYMENT_SCHEDULED`
  - `status === 'Paid'` -> `PAYMENT_COMPLETED`
  - `status === 'Under Verification'` -> `VERIFICATION`
- Recorded atomically with performer identity, timestamp, and transition details.

### 6.3 Notification Derivation (`services/notifications.service.ts`)
- Evaluated on-read for active invoices:
  - `pending_approval`: status is `Submitted` or `Under Verification` and submission age > 3 days.
  - `due_soon`: status is not `Paid` and due within 0 to 5 days.
  - `overdue`: status is not `Paid` and current date > dueDate.
  - `flagged`: status is `Flagged`.
- Role-scoped: Requesters only receive notifications for invoices where `submittedBy === req.user.id`.

---

## 7. Scheduled Jobs & Email Alerts

### 7.1 node-cron Job
- Runs daily (cron expression configurable in `.env`, e.g. `0 8 * * *`, with manual trigger helper for tests/dev).
- Scans active invoices for:
  - Invoices pending approval > 3 days.
  - Invoices overdue or due within 5 days.
- Groups alerts and prepares digest emails.

### 7.2 Nodemailer Dispatcher
- Dispatches alert email via SMTP configured through `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`.
- In test/dev environments, uses Ethereal test account or mocked SMTP transport so no external network dependency is required.

---

## 8. Integration Testing & Verification Strategy

- **Test Framework**: Jest with `ts-jest` and Supertest.
- **Database Engine**: `mongodb-memory-server` spins up an in-memory MongoDB daemon per test suite, guaranteeing complete isolation and rapid execution without requiring local MongoDB installation.
- **Coverage**:
  - `auth.test.ts`: Login success, wrong password, non-existent user, JWT validation.
  - `rbac.test.ts`: Admin, Approver, and Requester permissions on gated routes (e.g. POST /api/vendors, PATCH /api/invoices/:id/status).
  - `vendors.test.ts`: List vendors, detail with invoice history, admin creation.
  - `purchaseOrders.test.ts`: List POs, filter by vendorId.
  - `verification.test.ts`: Strict tolerance checks (amount ±$0.01 pass/fail, unit price ±$0.001 mismatch, quantity overbill, duplicate detection).
  - `invoices.test.ts`: Full lifecycle transitions, file upload with Multer, automatic audit log generation.
  - `reports.test.ts`: KPI summary calculations, date range filtering, vendor breakdown aggregations.
  - `notifications.test.ts`: Role-aware notification derivation.
  - `cron.test.ts`: Scheduled job execution and Nodemailer email dispatch.

---

## 9. 3-Agent Parallel Subagent Plan

- **Lead Agent (Foundation & Integration)**:
  - Sets up `server/` directory, `package.json`, `tsconfig.json`, `jest.config.ts`, `.env.example`, Express app skeleton, Mongoose connection, and test harness (`mongodb-memory-server`).
  - Sets up parallel `src/services/api/` client service layer.
- **Agent 1 (Auth, Users, Vendors & POs)**:
  - Models: `User`, `Vendor`, `PurchaseOrder`.
  - Auth routes, controllers, JWT issuance, `authenticateJWT` and `requireRole` middleware.
  - Vendors and Purchase Orders routes and controllers.
  - Test suites: `auth.test.ts`, `rbac.test.ts`, `vendors.test.ts`, `purchaseOrders.test.ts`.
- **Agent 2 (Invoices, Verification Engine, Multer & Audit Trail)**:
  - Models: `Invoice`, `AuditEntry`.
  - Multer upload configuration.
  - Verification service: 3-way match, amount tolerance, line item matching, duplicate detection.
  - Invoices routes and controllers (`GET`, `POST`, `PATCH /status`, `POST /attachment`).
  - Automatic audit entry generation.
  - Test suites: `verification.test.ts`, `invoices.test.ts`.
- **Agent 3 (Reports, Notifications, Cron & Nodemailer)**:
  - Reports service and endpoints (`/api/reports/summary`, `/api/reports/vendor-breakdown`).
  - Dynamic notification derivation service and endpoint (`/api/notifications`).
  - Mailer service (Nodemailer) and cron service (node-cron).
  - Test suites: `reports.test.ts`, `notifications.test.ts`, `cron.test.ts`.

---

## 10. Cutover Plan & Contract Parity Analysis

The frontend currently uses `src/services/mockApi/*.ts`. We will provide a parallel `src/services/api/*.ts` exporting identical function signatures:
- `getInvoices(filters?: InvoiceFilters): Promise<Invoice[]>`
- `getInvoiceById(id: string): Promise<Invoice | null>`
- `createInvoice(input: NewInvoiceInput): Promise<Invoice>`
- `updateInvoiceStatus(id: string, status: InvoiceStatus, comment?: string, performedBy?: string, extra?: ...): Promise<Invoice>`
- `getVendors(): Promise<Vendor[]>`
- `getVendorById(id: string): Promise<Vendor | null>`
- `createVendor(input: NewVendorInput): Promise<Vendor>`
- `getPurchaseOrders(): Promise<PurchaseOrder[]>`
- `getPurchaseOrderById(id: string): Promise<PurchaseOrder | null>`
- `getAuditLog(invoiceId?: string): Promise<AuditEntry[]>`
- `getNotifications(userId?: string): Promise<Notification[]>`

**Shape Parity Note**:
All field names (`id`, `poNumber`, `vendorId`, `amount`, `dueDate`, `submittedDate`, `status`, `items`, etc.) match 1:1. The Mongoose models convert MongoDB `_id` to virtual `id` on JSON serialization. There are zero divergences between mock return shapes and real API response shapes.

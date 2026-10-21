# PayVerify Backend Technical Assessment

## 1. Architecture & Database
- **Engine**: Node.js (Express 4.21.2) + MongoDB (Mongoose 8.9.2).
- **Storage Mode**: Standalone MongoDB (`backend/src/config/db.js:48`) with opt-in memory fallback via `mongodb-memory-server` in dev/test (`backend/src/config/db.js:80-97`).
- **Migrations**: No migration framework (e.g., migrate-mongo); schemas and indexes are auto-managed by Mongoose.
- **Seeding**: Deterministic 1-month dataset in `backend/src/config/seed.js:1263` (3 users, 6 vendors, 12 POs, 32 invoices, audit logs) run on server start if `SEED_DEMO_DATA=true` or in memory DB (`backend/src/server.js:18`).

## 2. API Endpoints Table
| Method | Path | file:line | Auth? | Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | `backend/src/app.js:27` | None | Working |
| `POST` | `/api/auth/login` | `backend/src/routes/auth.routes.js:14` | None | Working |
| `GET` | `/api/auth/me` | `backend/src/routes/auth.routes.js:15` | Bearer/Cookie | Working |
| `GET` | `/api/auth/users` | `backend/src/routes/auth.routes.js:16` | Bearer (Admin) | Working |
| `GET` | `/api/auth/users/:id` | `backend/src/routes/auth.routes.js:22` | Bearer (Admin) | Working |
| `GET` | `/api/invoices` | `backend/src/routes/invoices.routes.js:9` | Bearer (Scoped) | Working |
| `POST` | `/api/invoices` | `backend/src/routes/invoices.routes.js:14` | Bearer | Working |
| `GET` | `/api/invoices/:id` | `backend/src/routes/invoices.routes.js:11` | Bearer (Scoped) | Working |
| `PATCH` | `/api/invoices/:id/status` | `backend/src/routes/invoices.routes.js:15` | Bearer (Admin, Approver) | Working |
| `POST` | `/api/invoices/:id/attachment` | `backend/src/routes/invoices.routes.js:21` | Bearer (Owner/Privileged) | Working |
| `GET` | `/api/invoices/:id/attachment` | `backend/src/routes/invoices.routes.js:10` | Bearer (Owner/Privileged) | Working |
| `GET` | `/api/vendors` | `backend/src/routes/vendors.routes.js:9` | Bearer | Working |
| `GET` | `/api/vendors/:id` | `backend/src/routes/vendors.routes.js:10` | Bearer | Working |
| `POST` | `/api/vendors` | `backend/src/routes/vendors.routes.js:11` | Bearer (Admin) | Working |
| `GET` | `/api/purchase-orders` | `backend/src/routes/purchaseOrders.routes.js:8` | Bearer | Working |
| `GET` | `/api/purchase-orders/:id` | `backend/src/routes/purchaseOrders.routes.js:9` | Bearer | Working |
| `POST` | `/api/purchase-orders` | `backend/src/routes/purchaseOrders.routes.js:13` | Bearer (Admin) | Working |
| `GET` | `/api/reports/summary` | `backend/src/routes/reports.routes.js:8` | Bearer (Scoped) | Working |
| `GET` | `/api/reports/vendor-breakdown` | `backend/src/routes/reports.routes.js:9` | Bearer (Admin, Approver) | Working |
| `GET` | `/api/notifications` | `backend/src/routes/notifications.routes.js:7` | Bearer (Derived) | Working |
| `PATCH` | `/api/notifications/:id/read` | `backend/src/routes/notifications.routes.js:10` | Bearer | Working |
| `POST` | `/api/notifications/:id/read` | `backend/src/routes/notifications.routes.js:11` | Bearer | Working |
| `POST` | `/api/notifications/read-all` | `backend/src/routes/notifications.routes.js:14` | Bearer | Working |
| `GET` | `/api/audit-log` | `backend/src/routes/auditLog.routes.js:25` | Bearer (Admin / Scoped) | Working |

## 3. Database Models & Schema
- **User** (`backend/src/models/User.js:14`): `name`, `email` (unique), `passwordHash`, `role` (`Admin`\|`Approver`\|`Requester`), `department`, `avatarUrl`.
- **Vendor** (`backend/src/models/Vendor.js:13`): `name`, `contactEmail`, `paymentTerms` (`Net 15`\|`Net 30`\|`Net 45`\|`Net 60`), `address`, `taxId`, `status` (`Active`\|`Under Review`\|`Inactive`), `phone`, `totalInvoices` (dynamically aggregated).
- **PurchaseOrder** (`backend/src/models/PurchaseOrder.js:24`): `vendorId` (ref Vendor), `amount`, `description`, `poNumber`, `createdDate`, `status` (`Open`\|`Partially Invoiced`\|`Fulfilled`\|`Closed`), `items` (`[{ id, description, quantity, unitPrice, total }]`).
- **Invoice** (`backend/src/models/Invoice.js:42`): `vendorId` (ref Vendor), `poId` (ref PO), `amount`, `dueDate`, `submittedDate`, `status` (`Draft`\|`Submitted`\|`Under Verification`\|`Approved`\|`Flagged`\|`Payment Scheduled`\|`Paid`), `submittedBy` (Mixed ref User), `attachedDocumentPath`, `attachedDocumentName`, `invoiceNumber`, `flagReason`, `scheduledPaymentDate`, `paidDate`, `notes`, `items`.
- **AuditEntry** (`backend/src/models/AuditEntry.js:23`): `invoiceId` (ref Invoice), `action`, `performedBy` (ref User), `timestamp`, `details`.
- **NotificationRead** (`backend/src/models/NotificationRead.js:3`): `userId`, `notificationKey`, `readAt`. Unique compound index on `(userId, notificationKey)`.

## 4. Auth Flow, Validation & Error Handling
- **Flow**: `login` verifies bcrypt password hash and issues 8h signed JWT (`backend/src/controllers/authController.js:47`). `requireAuth` (`backend/src/middleware/auth.js:9`) checks `Authorization: Bearer <token>` or cookie `token`.
- **Role Enforcement**: `requireRole` (`backend/src/middleware/roleGuard.js:6`) blocks unauthorized roles with 403. Requester identity is strictly scoped to owned invoices (`backend/src/controllers/invoiceController.js:83-120`).
- **Validation**: Payload schemas validated in controllers (`validateInvoice` at `backend/src/services/verificationService.js:9`). 404 returned on invalid/nonexistent IDs (`backend/src/controllers/invoiceController.js:176`).
- **Where It Breaks**: Lack of token revocation / refresh token rotation; Requester scoping requires multi-type fallback logic due to `submittedBy` schema being declared as `Mixed` (`backend/src/models/Invoice.js:84`).

## 5. Security Posture
- **Passwords**: Hashed with bcrypt (`saltRounds=10`, `backend/src/config/seed.js:1303`, `backend/scripts/createAdmin.js:53`). Stripped from JSON serialization (`backend/src/models/User.js:8,63`).
- **Secrets**: Fails fast if `JWT_SECRET` is missing in production (`backend/src/config/env.js:14`). Enforces length >= 32 in production (`backend/src/config/env.js:23`).
- **CORS**: `CLIENT_ORIGIN || '*'` with `credentials: true` (`backend/src/app.js:19`). If `CLIENT_ORIGIN` is undefined, wildcard origin with credentials violates CORS specs.
- **Uploads**: Restricted to PDF/PNG/JPEG, 10MB limit, randomized storage filenames (`backend/src/middleware/upload.js:17,43`). File download verifies role/ownership (`backend/src/controllers/invoiceController.js:446-456`).
- **Vulnerabilities**: No rate limiting on `/api/auth/login` or upload endpoints.

## 6. Code Hygiene: TODOs, Empty Functions & Mock Data
- **TODOs/FIXMEs**: 0 occurrences found in `backend/src/`.
- **Mock Data**: No mock data in backend runtime; all data backed by MongoDB. Seed dataset defined in `backend/src/config/seed.js:20-1250`.
- **Empty Functions / Silent Catches**: Empty error catches in owner/user fallbacks (`backend/src/controllers/invoiceController.js:46,110`, `backend/src/services/verificationService.js:94-96,113-115`, `backend/src/controllers/auditLogController.js:82,120,174`).

## 7. Rated Issues
- **[P0] Currency Symbol Discrepancy Breaking Integration Tests**: `backend/src/services/verificationService.js:124` uses `₹` in variance string (`exceeds ±₹0.01 tolerance`), while test assertions in `backend/tests/invoices.test.js:284` and `backend/tests/seed.test.js:123` expect `exceeds ±$0.01 tolerance`, causing 2 test suite failures during `npm test`.
- **[P1] Inconsistent Foreign Key Type for User Reference**: `backend/src/models/Invoice.js:84` declares `submittedBy` as `Mixed` instead of `ObjectId`, forcing complex multi-format resolution across `backend/src/controllers/invoiceController.js:14-49,83-120` and `backend/src/controllers/reportsController.js:40-77`.
- **[P1] Missing Rate Limiting on Login & Public Routes**: `backend/src/routes/auth.routes.js:14` lacks rate limiting middleware, leaving auth vulnerable to credential brute-forcing.
- **[P1] Permissive CORS Fallback with Credentials**: `backend/src/app.js:19` falls back to `origin: '*'` when `CLIENT_ORIGIN` is unset, which breaks standard browser CORS when `credentials: true` is enabled.
- **[P2] Redundant Controller Alias**: `backend/src/controllers/invoicesController.js:1-2` is an untracked 2-line alias duplicating `backend/src/controllers/invoiceController.js`.
- **[P2] Plaintext Demo Passwords in Seed Config**: `backend/src/config/seed.js:24,32,40` exposes plaintext passwords in source code for demo accounts (mitigated by startup warning in non-dev `backend/src/server.js:20`).
- **[P2] Smoke Test Unauthenticated Call**: `backend/scripts/smokeTest.js:137` requests `/api/reports/summary` without Authorization header, receiving 401 instead of validating output.

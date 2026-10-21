# PayVerify - Project Overview & Developer Guide

PayVerify is an invoice verification platform featuring 3-way matching against purchase orders, role-based approval workflows, and automated financial auditing.

> **RULE:** Only read files explicitly named in the task. Do not explore the codebase. Known issues are in handoff/TASKS.md.

## Tech Stack
- **Frontend**: React 18.3, TypeScript 5.6, Vite 5.4, React Router DOM 6.28, Recharts 2.13
- **Backend**: Node.js 24, Express 4.21, Mongoose 8.9, MongoDB (ephemeral memory DB fallback in dev/test)
- **Auth & Security**: JWT (8h expiration), bcryptjs, role-based access control (Admin, Approver, Requester)
- **Testing**: Vitest 2.1 (frontend), Jest 29.7 & Supertest 7.0 (backend), Playwright 1.63 (E2E)

## Folder Map
- `src/`: React frontend (Vite)
  - `components/`: UI, shared layout, forms, table components
  - `context/`: `AuthContext.tsx` (auth session), `DataContext.tsx` (entity state)
  - `pages/`: Route pages (Dashboard, Invoices, Approvals, Payments, Reports, Vendors, AuditLog)
  - `services/api/`: Typed API client modules (`auth.ts`, `invoices.ts`, `reports.ts`, etc.)
  - `types/`: `index.ts` shared domain interfaces
- `backend/src/`: Express API server
  - `config/`: `db.js` (Mongoose + memory DB fallback), `env.js`, `seed.js`
  - `controllers/`: Request handlers for auth, invoices, POs, vendors, reports, audit log
  - `middleware/`: `auth.js` (JWT guard), `roleGuard.js` (RBAC), `upload.js` (Multer)
  - `models/`: Mongoose schemas (User, Vendor, PurchaseOrder, Invoice, AuditEntry, NotificationRead)
  - `routes/`: Express routers mounted under `/api`
  - `services/`: `verificationService.js` (3-way matching), `emailService.js`, `notificationService.js`
- `scripts/`: `startApp.js` (orchestrator for mongod, backend, and vite)
- `handoff/`: Pre-scanned audit reports and `TASKS.md`

## Run & Test Commands
- Install: `npm install && npm install --prefix backend`
- Dev (fullstack): `npm start` or `npm run dev:all` (Frontend: `http://localhost:5173`, Backend: `http://localhost:5000`)
- Frontend only: `npm run dev` | Backend only: `npm run server:dev`
- Build: `npm run build` (runs `tsc && vite build`)
- Tests:
  - Frontend: `npm test` (Vitest, 331 tests)
  - Backend: `npm run server:test` (Jest, 147 tests)
  - E2E: `npx playwright test` (Playwright smoke suite)
  - Smoke test: `node backend/scripts/smokeTest.js`

## Key Environment Variables
- `VITE_API_URL`: Backend base URL (default: `http://localhost:5000/api` or `/api`)
- `VITE_API_MODE`: `'real'` for Express backend or `'mock'` for local in-memory mock data
- `VITE_DEMO_LOGINS`: `'true'` to display 1-click persona chips on login page
- `PORT`: Backend port (default `5000`)
- `MONGODB_URI`: Mongo connection string (default `mongodb://127.0.0.1:27017/payverify`)
- `USE_MEMORY_DB`: `'true'` to use ephemeral in-memory MongoDB
- `SEED_DEMO_DATA`: `'true'` to auto-seed demo dataset on boot
- `JWT_SECRET`: Secret key for JWT signing

## Conventions & Rules
- Do NOT read `node_modules`, `dist`, `build`, `.git`, or lock files.
- Refer to code locations using exact `path/file.ext:LINE` syntax.
- Maintain contract synchronization between `src/types/index.ts` and backend models.
- All backend endpoints must be prefixed with `/api`.
- Never bypass authentication guards or role permissions (`Admin`, `Approver`, `Requester`).

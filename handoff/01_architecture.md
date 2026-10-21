# Architecture Report: PayVerify Invoice Verification Platform

## 1. Tech Stack & Versions
- **Frontend**: React 18.3.1 (`package.json:19`), React DOM 18.3.1 (`package.json:20`), React Router DOM 6.28.0 (`package.json:21`), Recharts 2.13.3 (`package.json:22`), TypeScript 5.6.3 (`package.json:34`), Vite 5.4.10 / runtime 5.4.21 (`package.json:35`).
- **Frontend Testing**: Vitest 2.1.4 / runtime 2.1.9 (`package.json:36`), @testing-library/react 16.0.1 (`package.json:26`), jsdom 25.0.1 (`package.json:33`), axe-core 4.13.0 (`package.json:32`), Playwright 1.63.0 (`package.json:25`).
- **Backend**: Node.js v24.12.0 runtime, Express 4.21.2 (`backend/package.json:18`), Mongoose 8.9.2 (`backend/package.json:20`), MongoDB standalone (`mongodb://127.0.0.1:27017/payverify`) with opt-in fallback to mongodb-memory-server 10.1.2 (`backend/package.json:27`, `backend/src/config/db.js:84`).
- **Backend Utilities & Security**: jsonwebtoken 9.0.2 (`backend/package.json:19`), bcryptjs 2.4.3 (`backend/package.json:15`), multer 1.4.5-lts.1 (`backend/package.json:21`), node-cron 3.0.3 (`backend/package.json:22`), nodemailer 6.9.16 (`backend/package.json:23`), dotenv 16.4.7 (`backend/package.json:17`), cors 2.8.5 (`backend/package.json:16`).
- **Backend Testing**: Jest 29.7.0 (`backend/package.json:26`), supertest 7.0.0 (`backend/package.json:28`).
- **Tooling & Orchestration**: Full-stack orchestrator runner in `scripts/startApp.js:1` (`package.json:7`, `package.json:9`).

## 2. Key Folder Tree & Entry Points
```
FSD/
├── backend/
│   ├── data/ (db storage)
│   ├── scripts/ (createAdmin.js, seed.js, sendRealEmail.js, smokeTest.js, startE2EServer.js)
│   ├── src/
│   │   ├── config/ (db.js, env.js, seed.js)
│   │   ├── controllers/ (auditLog, auth, invoice, invoices, notifications, purchaseOrder, reports, vendor)
│   │   ├── jobs/ (reminderCron.js)
│   │   ├── middleware/ (auth.js, roleGuard.js, upload.js)
│   │   ├── models/ (AuditEntry.js, Invoice.js, NotificationRead.js, PurchaseOrder.js, User.js, Vendor.js)
│   │   ├── routes/ (auditLog, auth, invoices, notifications, purchaseOrders, reports, vendors)
│   │   ├── services/ (emailService.js, notificationService.js, verificationService.js)
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/ (Jest integration & unit suites)
│   └── uploads/ (attachment storage)
├── scripts/
│   └── startApp.js (fullstack launcher: mongod, backend, vite)
├── src/
│   ├── components/ (layout/, shared/, ui/)
│   ├── context/ (AuthContext.tsx, DataContext.tsx)
│   ├── pages/ (Approvals, AuditLog, Dashboard, InvoiceDetail, Invoices, Landing, Login, Payments, Reports, Vendors)
│   ├── services/ (api/, mockApi/, dataSource.ts, mockAuth.ts)
│   ├── types/ (index.ts)
│   ├── App.tsx
│   └── main.tsx
└── tests/ (Vitest unit, component, page, context, a11y)
```
- **Frontend Entry Points**: `index.html:1` -> `src/main.tsx:6` -> `src/App.tsx:12`.
- **Backend Entry Points**: `backend/src/server.js:60` (startup, DB, cron, listen) -> `backend/src/app.js:14` (Express app, middleware, routes).
- **Fullstack Launcher**: `scripts/startApp.js:107`, `scripts/startApp.js:130`.

## 3. Verified Install, Dev, Build & Test Commands
- `npm install` & `npm install --prefix backend`: Install dependencies.
- `npm run build` (`package.json:10`): Verified. Runs `tsc && vite build`, producing `dist/` bundle in 5.73s (Exit code 0).
- `npm run server:build` (`package.json:14`, `backend/package.json:9`): Verified. No-op verification step (Exit code 0).
- `npm run dev` (`package.json:8`): Starts Vite frontend server on `http://localhost:5173`.
- `npm run server:dev` (`package.json:13`, `backend/package.json:8`): Starts backend API server on `http://localhost:5000`.
- `npm start` / `npm run dev:all` (`package.json:7`, `package.json:9`, `scripts/startApp.js:1`): Starts backend and frontend concurrently.
- `npm test` (`package.json:12`): Verified. Runs Vitest; 21 test files passed, 331 tests passed in 26.55s (Exit code 0).
- `npm run server:test` (`package.json:15`, `backend/package.json:11`): Verified. Runs Jest; 9 test suites passed, 2 failed (145 passed, 2 failed out of 147; Exit code 1). Failures in `backend/tests/invoices.test.js:284` and `backend/tests/seed.test.js:123` due to `₹` vs `$` currency symbol mismatch.
- `node backend/scripts/smokeTest.js` (`backend/scripts/smokeTest.js:13`): Verified. All 8 integration steps (health, auth, vendors, POs, invoices, reports, notifs, audit) pass (Exit code 0).

## 4. Environment Variables Map
### Frontend (`src/` & configs)
- `VITE_API_MODE`: `src/context/DataContext.tsx:188`, `src/services/dataSource.ts:8`, `vite.config.ts:53`
- `VITE_API_URL`: `src/services/api/client.ts:3`
- `VITE_DEMO_LOGINS`: `src/pages/Landing/LandingPage.tsx:57`, `vite.config.ts:54`
- `CI`: `playwright.config.ts:14`

### Backend & Orchestrator (`backend/` & `scripts/`)
- `PORT`: `backend/src/config/env.js:28`, `backend/scripts/startE2EServer.js:6`, `scripts/startApp.js:111`
- `NODE_ENV`: `backend/src/config/env.js:8`, `backend/src/server.js:19`, `backend/src/config/db.js:76`, `backend/src/services/emailService.js:18`, `backend/scripts/startE2EServer.js:5`, `scripts/startApp.js:106`
- `MONGODB_URI`: `backend/src/config/env.js:29`, `backend/scripts/createAdmin.js:26`, `backend/scripts/seed.js:20`, `scripts/startApp.js:114`
- `JWT_SECRET`: `backend/src/config/env.js:14`, `backend/scripts/startE2EServer.js:7`
- `CLIENT_ORIGIN`: `backend/src/config/env.js:35`
- `USE_MEMORY_DB`: `backend/src/config/db.js:77`, `scripts/startApp.js:113`
- `SEED_DEMO_DATA`: `backend/src/server.js:18`
- `SMTP_HOST`: `backend/src/config/env.js:31`, `backend/src/services/emailService.js:29`, `backend/scripts/sendRealEmail.js:27`
- `SMTP_PORT`: `backend/src/config/env.js:32`, `backend/src/services/emailService.js:41`, `backend/scripts/sendRealEmail.js:28`
- `SMTP_USER`: `backend/src/config/env.js:33`, `backend/src/jobs/reminderCron.js:102`, `backend/src/services/emailService.js:35`, `backend/src/services/emailService.js:123`, `backend/scripts/sendRealEmail.js:29`
- `SMTP_PASS`: `backend/src/config/env.js:34`, `backend/src/services/emailService.js:44`, `backend/scripts/sendRealEmail.js:30`
- `INITIAL_ADMIN_EMAIL`: `backend/scripts/createAdmin.js:22`
- `INITIAL_ADMIN_PASSWORD`: `backend/scripts/createAdmin.js:23`
- `INITIAL_ADMIN_NAME`: `backend/scripts/createAdmin.js:24`
- `INITIAL_ADMIN_DEPARTMENT`: `backend/scripts/createAdmin.js:25`
- `PERSIST_DB`: `scripts/startApp.js:86`
- **Dead/Unread Env Vars**: `EMAIL_FROM` (`backend/.env.example:32`, unused in `backend/src/services/emailService.js:123`), `REMINDER_CRON_SCHEDULE` (`backend/.env.example:35`, hardcoded in `backend/src/server.js:28`).

## 5. Ports, URLs, Proxy, CORS & Dependencies
- **Ports & Base URLs**:
  - Frontend: `5173` -> `http://localhost:5173` (`scripts/startApp.js:82`).
  - Backend: `5000` -> `http://localhost:5000/api` (`backend/src/config/env.js:28`, `src/services/api/client.ts:3`).
  - MongoDB: `27017` -> `mongodb://127.0.0.1:27017/payverify` (`backend/src/config/env.js:29`, `scripts/startApp.js:93`) or ephemeral dynamic port when fallback memory server activates (`backend/src/config/db.js:88`).
- **Proxy**: Vite proxies `/api` to `http://localhost:5000` (`vite.config.ts:14`). However, `src/services/api/client.ts:3` specifies absolute URL `http://localhost:5000/api` in default `.env:5`, bypassing the Vite proxy in development.
- **CORS**: `backend/src/app.js:18` allows `origin: CLIENT_ORIGIN || '*'` with `credentials: true`. `CLIENT_ORIGIN` is configured as `http://localhost:5173` in `backend/.env:8` and `backend/.env.example:12`.
- **Dependencies**:
  - Conflicting / Redundant: `backend/package.json:14` specifies `"bcrypt": "^5.1.1"` while `backend/package.json:15` specifies `"bcryptjs": "^2.4.3"`. All application files (`backend/src/controllers/authController.js:1`, `backend/src/config/seed.js:3`, `backend/scripts/createAdmin.js:9`) import `bcryptjs`. Native `bcrypt` is unused and requires unnecessary C++ toolchains.
  - Extraneous: Root `node_modules` contains 90+ `@spectrum-web-components/*`, `@swc-react/*`, and `@lit/*` packages not declared in `package.json:18`.

## 6. Architectural Issues Rated [P0], [P1], [P2]
- **[P1] Tolerance Currency Symbol Mismatch**: `backend/src/services/verificationService.js:124` formats variance as `"exceeds ±₹0.01 tolerance"` and `backend/src/config/seed.js:626` seeds with `₹`, causing assertion failures in `backend/tests/invoices.test.js:284` and `backend/tests/seed.test.js:123` which expect `$` ("exceeds ±$0.01 tolerance").
- **[P1] Dev Proxy Bypass via Absolute API Base URL**: `src/services/api/client.ts:3` and `.env:5` default to `http://localhost:5000/api` instead of `/api`. This bypasses Vite's configured dev proxy in `vite.config.ts:14`, creating unnecessary cross-origin requests requiring CORS headers.
- **[P2] Redundant Native C++ Dependency**: `backend/package.json:14` includes `bcrypt`, while all backend auth code strictly imports pure-JS `bcryptjs` (`backend/src/controllers/authController.js:1`, `backend/src/config/seed.js:3`, `backend/scripts/createAdmin.js:9`).
- **[P2] Dead Environment Variables in Config Example**: `backend/.env.example:32` (`EMAIL_FROM`) and `backend/.env.example:35` (`REMINDER_CRON_SCHEDULE`) are documented but ignored in code (`backend/src/services/emailService.js:123`, `backend/src/server.js:28`).
- **[P2] Permissive Insecure CORS Fallback**: `backend/src/app.js:19` sets `origin: CLIENT_ORIGIN || '*'` alongside `credentials: true`. In standard browsers, `Access-Control-Allow-Origin: *` with credentials is an invalid CORS response if `CLIENT_ORIGIN` is not defined.
- **[P2] Extraneous Leftover Dependencies in Root**: Over 90 orphaned packages (Adobe Spectrum / Lit) persist in root `node_modules`, cluttering local disk without being tracked in `package.json:18`.

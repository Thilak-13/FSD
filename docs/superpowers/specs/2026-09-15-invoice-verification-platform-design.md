# Invoice Verification & Vendor Payment Platform — Design Specification

**Date**: 2026-09-15  
**Target Platform**: Web (Modern Browsers, Responsive Desktop & Mobile)  
**Implementation Mode**: Frontend-Only with Realistic In-Memory Mock Service Layer  

---

## 1. Executive Summary & Goals

The **Invoice Verification & Vendor Payment Platform** is an enterprise B2B frontend application designed for automated invoice ingestion, purchase order (PO) three-way matching, discrepancy flagging, multi-stage approval routing, payment scheduling, and vendor management.

### Key Objectives
1. **End-to-End Frontend Prototype**: Complete interactive workflow across 10 application views with zero reliance on an active backend or database.
2. **Adobe Spectrum Design System**: Full visual fidelity and accessibility using official `@swc-react/*` components and Spectrum CSS custom property design tokens (`--spectrum-*`).
3. **Role-Based Access Control (RBAC)**: Distinct permissions, visibility, and capabilities across three roles: `Admin`, `Approver`, and `Requester`.
4. **Automated Verification Engine**: Interactive 3-way matching between Invoices, Purchase Orders, and Line Items with variance highlighting.
5. **Decoupled Mock Architecture**: Clean service interfaces mirroring real REST APIs with simulated async latency (150–500ms), enabling drop-in backend integration in the future without altering component logic.

---

## 2. Tech Stack & Non-Negotiables

| Layer | Tool / Library | Usage |
|---|---|---|
| **Framework** | React 18+, TypeScript 5+ | Component architecture with strict typing |
| **Bundler / Build** | Vite | Rapid ESM build and fast HMR |
| **Component Kit** | `@swc-react/*` | Adobe Spectrum Web Components React wrappers (theme, button, action-button, table, textfield, picker, dialog, tabs, sidenav, badge, status-light, card, toast, menu, checkbox, switch, avatar, divider, progress-circle, search) |
| **Design Tokens** | Spectrum CSS Custom Properties | `--spectrum-*` variables for typography, colors, spacing, borders, contrast |
| **Routing** | React Router v6+ | Client-side routing, nested layouts, role-based protection |
| **Charts** | Recharts | Financial spend analytics and status breakdown visualizations |
| **State** | React Context + Custom Hooks | `AuthContext` (session & role), `DataContext` (reactive mock store) |

### Strict Boundaries
- **No external server**: All "API calls" resolve locally via Promises.
- **No real file uploads / PDF backend**: Client-side filename storage and preview stubs.
- **No real email or payment gateway**: Console logging, client-side CSV downloads, and state updates.
- **Strict token adherence**: No hardcoded hex values or non-Spectrum color palettes.

---

## 3. System Architecture & Project Structure

```
src/
  app/
    App.tsx                       # Root wrapper: Theme, AuthProvider, DataProvider, Router
    routes.tsx                    # Route definitions with role guards
  components/
    layout/
      AppShell.tsx                # Base layout, skip-to-content, responsive drawer container
      SideNav.tsx                 # Spectrum sidenav with role filtering
      TopBar.tsx                  # Search, notification popover, theme toggle, fast role switcher
      NotificationPanel.tsx       # Live derived notifications popover
    shared/
      StatusBadge.tsx             # Maps invoice/payment status -> <sp-status-light>
      DataTable.tsx               # Wrapper around <sp-table> with sorting & pagination
      EmptyState.tsx              # Empty data representation with clear CTA
      LoadingSkeleton.tsx         # Spectrum-themed progressive skeletons
      ConfirmDialog.tsx           # Accessible confirmation modal (<sp-dialog>)
      FormField.tsx               # Spectrum field label + input + alert region
  pages/
    Login/                        # Quick sign-in with 1-click role selection
    Dashboard/                    # Metric cards, volume trend chart, status donut
    Invoices/                     # Searchable table + New Invoice submission dialog
    InvoiceDetail/                # 3-way matching panel, approval actions, activity timeline
    Approvals/                    # Targeted triage queue for Submitted & Flagged invoices
    Payments/                     # Payment disbursement schedule and settlement table
    Vendors/                      # Directory of active/under-review vendors + Add Vendor modal
    VendorDetail/                 # Profile, payment terms, and linked invoice ledger
    Reports/                      # Date range filtering, spend by vendor, CSV export
    AuditLog/                     # Immutable timeline of all platform mutations (Admin only)
  context/
    AuthContext.tsx               # Current user, active role, switchRole testing helper
    DataContext.tsx               # Centralized reactive state store, mock service facade
  services/
    mockApi/
      invoices.ts                 # Invoice queries and status transitions
      vendors.ts                  # Vendor directory and terms
      purchaseOrders.ts           # PO data for verification matching
      users.ts                    # User profiles for all three roles
      auditLog.ts                 # Audit history recorder
      notifications.ts            # Dynamic notifications derived from invoice state
  types/
    index.ts                      # Strict TypeScript interfaces
  assets/
    brand/
      Logo.tsx                    # Modular SVG logo placeholder
      README.md                   # Asset drop-in instructions
```

---

## 4. Domain Data Models & Mock Layer

### 4.1 Data Models (`src/types/index.ts`)
- **User**: `id`, `name`, `email`, `role: 'Admin' | 'Approver' | 'Requester'`, `avatarUrl`.
- **Vendor**: `id`, `name`, `contactEmail`, `paymentTerms: 'Net 15' | 'Net 30' | 'Net 45' | 'Net 60'`, `address`, `taxId`, `status: 'Active' | 'Under Review' | 'Inactive'`.
- **PurchaseOrder**: `id`, `poNumber`, `vendorId`, `amount`, `description`, `items: PurchaseOrderItem[]`, `createdDate`.
- **Invoice**: `id`, `invoiceNumber`, `vendorId`, `poId`, `amount`, `dueDate`, `submittedDate`, `status: 'Submitted' | 'Under Verification' | 'Approved' | 'Flagged' | 'Payment Scheduled' | 'Paid'`, `submittedBy`, `attachedDocumentName`, `flagReason`, `scheduledPaymentDate`, `paidDate`, `items: InvoiceLineItem[]`.
- **InvoiceLineItem**: `id`, `description`, `quantity`, `unitPrice`, `total`, `matchedPoItemId`, `priceMismatch`, `quantityMismatch`.
- **AuditEntry**: `id`, `invoiceId`, `action`, `performedBy`, `timestamp`, `details`.
- **Notification**: `id`, `type: 'pending_approval' | 'due_soon' | 'overdue' | 'flagged' | 'paid'`, `invoiceId`, `message`, `read`, `createdAt`.

### 4.2 Seed Data
- **Users**: 3 accounts representing `Admin`, `Approver`, and `Requester`.
- **Vendors**: 5 realistic suppliers (*Apex Cloud Services*, *Northwest Logistics*, *ByteForce Technologies*, *Summit Creative*, *Pioneer Industrial*).
- **Purchase Orders**: 8 pre-configured POs with granular line items and set pricing.
- **Invoices**: 18 records spanning all lifecycle states:
  - 3 `Submitted`
  - 3 `Under Verification`
  - 4 `Approved`
  - 3 `Flagged` (unit price discrepancy, quantity mismatch, unauthorized vendor)
  - 3 `Payment Scheduled`
  - 2 `Paid`
- **Dynamic Derived Notifications**: Evaluated at runtime:
  - Invoices pending approval > 3 days.
  - Invoices due within 5 days.
  - Overdue invoices (`dueDate < today` and not `Paid`).
  - Flagged invoices requiring resolution.

---

## 5. Information Architecture & RBAC

| Route | View | Permitted Roles | Role-Specific Behavior |
|---|---|---|---|
| `/login` | Authentication Screen | Public | Role quick-picker; pre-fills test accounts |
| `/` | Dashboard | All Roles | Requesters see their own submission stats; Admins/Approvers see organization-wide metrics |
| `/invoices` | Invoice Directory & Submission | All Roles | Requesters see their own submissions; Admins/Approvers see all. "+ New Invoice" button available to all. |
| `/invoices/:id` | Invoice Detail & 3-Way Match | All Roles | Requesters have read-only view; Approvers/Admins can Approve, Flag, or Schedule Payment |
| `/approvals` | Approval Triage Queue | Approver, Admin | Requesters redirected to `/` with notice toast |
| `/payments` | Payment Tracking & Disbursement | Approver, Admin | Requesters redirected to `/` with notice toast |
| `/vendors` | Vendor Directory | All Roles | Requesters/Approvers view directory; Admin can Add/Edit |
| `/vendors/:id` | Vendor Detail & History | All Roles | Full profile, PO links, and invoice history |
| `/reports` | Financial Reporting & Analytics | Approver, Admin | Requesters redirected to `/` with notice toast |
| `/audit-log` | Audit Trail | Admin Only | Approvers and Requesters redirected to `/` with security toast |

---

## 6. Verification Engine & Detailed Workflows

### 6.1 3-Way Matching Logic
On `/invoices/:id`, when an invoice is linked to a PO:
1. **Header Level Match**: Total invoice amount compared against PO total. Flagged if discrepancy exists.
2. **Line Item Variance Detection**:
   - Each invoice item is compared with the corresponding PO item.
   - If `InvoiceItem.unitPrice !== POItem.unitPrice`, variance is flagged (`priceMismatch: true`).
   - If `InvoiceItem.quantity > POItem.quantity`, quantity overbill is flagged (`quantityMismatch: true`).
3. **Automated Verification Status**:
   - Clean match: Displays positive status light with "All line items matched successfully to PO #X".
   - Discrepancy match: Displays negative status light with itemized variance breakdown and pre-populates the "Flag for Review" dialogue.

### 6.2 Approval & Payment Pipeline
1. **Submission**: User submits invoice (`status = 'Submitted'`).
2. **Verification**: System checks against PO (`status = 'Under Verification'`).
3. **Approval Decision**:
   - *Approve*: Transition to `Approved`, creates audit record, triggers notification to requester.
   - *Flag*: Approver enters required reason (e.g., "Unit price exceeds PO agreed rate"), transition to `Flagged`, alerts requester.
4. **Payment Scheduling**: Approver/Admin selects payment date (defaults based on vendor terms e.g. Net 30), transition to `Payment Scheduled`.
5. **Disbursement**: Approver/Admin marks invoice as `Paid`, records timestamp, triggers settlement audit entry.

---

## 7. Accessibility (WCAG 2.1 AA) & Design System Compliance

1. **Spectrum Web Components**:
   - Native keyboard handling (`Enter`, `Space`, `Arrow keys`, `Escape` for modals).
   - Natural tab orders across all forms and data tables.
2. **Design Tokens**:
   - `--spectrum-global-color-*` for foreground, background, borders, and state.
   - Status mapping to `<sp-status-light>`:
     - `positive`: Approved / Paid / Active
     - `notice`: Submitted / Under Verification / Payment Scheduled
     - `negative`: Flagged / Overdue / Inactive
     - `info`: Informational messages
   - `<sp-badge>` strictly reserved for count indicators (e.g. unread count).
3. **Screen Readers & ARIA**:
   - Accessible skip link to `#main-content`.
   - `aria-live="polite"` on notification badges and toast notifications.
   - Explicit `<sp-field-label>` bound to all input elements.
   - Validation messages assigned `role="alert"`.
4. **Responsive Breakpoints**:
   - Sidenav collapses into an accessible slide-over drawer below `768px`.
   - Tables support horizontal scroll and mobile card stacking on compact screens.

---

## 8. Definition of Done Checklist (Per Page)

- [ ] **Loading State**: Progressive skeleton loader while mock delay resolves.
- [ ] **Empty State**: Clear contextual illustration and call-to-action button.
- [ ] **Error State**: Graceful error alert with retry button (tested via mock failure simulator).
- [ ] **Keyboard Navigation**: Complete tab order and visible Spectrum focus rings.
- [ ] **Role Visibility**: Action buttons, tabs, and routes strictly respect current user role.
- [ ] **Responsive Design**: Flawless layout on desktop and mobile viewports.
- [ ] **Color Contrast**: 100% token-based styling compliant with WCAG AA.

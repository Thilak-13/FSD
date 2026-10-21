import { test, expect, Page } from '@playwright/test';

test.describe('PayVerify Real-Mode Smoke Tests & RBAC Validation', () => {
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon.ico')) {
          consoleErrors.push(text);
        }
      }
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });
  });

  test.afterEach(async () => {
    expect(consoleErrors, `Unhandled console errors found: ${consoleErrors.join(', ')}`).toEqual([]);
  });

  async function loginAs(page: Page, role: 'Admin' | 'Approver' | 'Requester') {
    const logoutBtn = page.locator('.logout-btn');
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click();
      await page.waitForURL('**/login', { timeout: 5000 }).catch(() => {});
    } else {
      await page.goto('/login');
    }
    await page.waitForLoadState('networkidle');
    const chip = page.locator(`[data-testid="quick-login-${role}"]`);
    await expect(chip).toBeVisible();
    await chip.click();
    await page.waitForURL('**/', { timeout: 10000 });
    await expect(page.locator('.user-role-label')).toHaveText(role);
  }

  async function logout(page: Page) {
    const logoutBtn = page.locator('.logout-btn');
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click();
      await page.waitForURL('**/login', { timeout: 5000 }).catch(() => {});
    }
  }

  test('Test 1: Visit "/" as an unauthenticated user -> Verify Authentication Page appears directly as pure sign-in page with 1-click persona chips and login form', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify Authentication Landing Page appears
    const landing = page.locator('[data-testid="page-landing"], [data-testid="page-login"]');
    await expect(landing.first()).toBeVisible();

    // Verify Title and credentials form
    await expect(page.locator('.login-title')).toHaveText('Sign In to Invoice Platform');
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-submit-button"]')).toBeVisible();

    // Verify 1-click persona chips & cards
    const adminChip = page.locator('[data-testid="quick-login-Admin"]');
    const approverChip = page.locator('[data-testid="quick-login-Approver"]');
    const requesterChip = page.locator('[data-testid="quick-login-Requester"]');

    await expect(adminChip).toBeVisible();
    await expect(approverChip).toBeVisible();
    await expect(requesterChip).toBeVisible();

    await expect(page.locator('[data-testid="persona-card-admin"]')).toContainText('Alex Rivera');
    await expect(page.locator('[data-testid="persona-card-approver"]')).toContainText('Sarah Chen');
    await expect(page.locator('[data-testid="persona-card-requester"]')).toContainText('Jordan Lee');
  });

  test('Test 2: Click "Alex Rivera (Admin)" chip -> Log in -> Verify all 32 invoices load, all sidebar links (including Audit Log) are visible, and data is populated', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click 'Alex Rivera (Admin)' chip
    const adminChip = page.locator('[data-testid="quick-login-Admin"]');
    await expect(adminChip).toBeVisible();
    await adminChip.click();

    // Verify login success and user badge
    await page.waitForURL('**/', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.user-name-label')).toHaveText('Alex Rivera');
    await expect(page.locator('.user-role-label')).toHaveText('Admin');

    // Verify all 7 sidebar navigation links are visible (including Audit Log)
    const expectedAdminNav = ['Dashboard', 'Invoices', 'Approvals', 'Payments', 'Vendors', 'Reports', 'Audit Log'];
    const sidebarItems = page.locator('aside.app-sidebar .nav-link-item, aside.app-sidebar sp-sidenav-item');
    await expect(sidebarItems.first()).toBeVisible();
    expect(await sidebarItems.count()).toBe(expectedAdminNav.length);

    const labels: string[] = [];
    const count = await sidebarItems.count();
    for (let i = 0; i < count; i++) {
      labels.push((await sidebarItems.nth(i).innerText())?.trim());
    }
    expect(labels).toEqual(expectedAdminNav);
    await expect(page.locator('aside.app-sidebar', { hasText: 'Audit Log' })).toBeVisible();

    // Verify dashboard data is populated
    await expect(page.locator('[data-testid="kpi-spend-pending"] .summary-card-value')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-spend-pending"] .summary-card-value')).not.toHaveText('₹0.00');
    await expect(page.locator('[data-testid="kpi-requires-approval"] .summary-card-value')).toBeVisible();

    // Navigate to Invoices page
    await page.locator('aside.app-sidebar .nav-link-item, aside.app-sidebar sp-sidenav-item', { hasText: 'Invoices' }).click();
    await page.waitForURL('**/invoices');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="page-invoices"]')).toBeVisible();

    // Verify all 32 invoices load in the table
    const invoiceRows = page.locator('table tbody tr');
    await expect(invoiceRows.first()).toBeVisible();
    await expect(invoiceRows).toHaveCount(32);

    // Verify pagination summary confirms 32 total records
    await expect(page.getByText('32 of 32 entries')).toBeVisible();

    // Verify key sample invoices across the dataset are visible
    await expect(page.getByText('INV-2026-001')).toBeVisible();
    await expect(page.getByText('INV-2026-032')).toBeVisible();

    await logout(page);
  });

  test('Test 3: Switch or log in as "Sarah Chen (Approver)" -> Verify approvals queue has invoices awaiting verification, Audit Log link is hidden, reports load', async ({ page }) => {
    await loginAs(page, 'Approver');

    await expect(page.locator('.user-name-label')).toHaveText('Sarah Chen');
    await expect(page.locator('.user-role-label')).toHaveText('Approver');

    // Verify sidebar links: Approver sees 6 links, Audit Log is hidden
    const expectedApproverNav = ['Dashboard', 'Invoices', 'Approvals', 'Payments', 'Vendors', 'Reports'];
    const sidebarItems = page.locator('aside.app-sidebar .nav-link-item, aside.app-sidebar sp-sidenav-item');
    await expect(sidebarItems.first()).toBeVisible();
    expect(await sidebarItems.count()).toBe(expectedApproverNav.length);

    const labels: string[] = [];
    const count = await sidebarItems.count();
    for (let i = 0; i < count; i++) {
      labels.push((await sidebarItems.nth(i).innerText())?.trim());
    }
    expect(labels).toEqual(expectedApproverNav);
    expect(labels).not.toContain('Audit Log');
    await expect(page.locator('aside.app-sidebar', { hasText: 'Audit Log' })).toHaveCount(0);

    // Navigate to Approvals page -> verify approvals queue has invoices awaiting verification
    await page.locator('aside.app-sidebar .nav-link-item, aside.app-sidebar sp-sidenav-item', { hasText: 'Approvals' }).click();
    await page.waitForURL('**/approvals');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="page-approvals"]')).toBeVisible();

    // Verify queue displays invoices awaiting verification
    const verificationInvoices = page.locator('table tbody tr');
    await expect(verificationInvoices.first()).toBeVisible();
    expect(await verificationInvoices.count()).toBeGreaterThan(0);
    const underVerificationRow = page.locator('table tbody tr', { hasText: 'Under Verification' }).first();
    await expect(underVerificationRow).toBeVisible();

    // Navigate to Reports page -> verify reports load
    await page.locator('aside.app-sidebar .nav-link-item, aside.app-sidebar sp-sidenav-item', { hasText: 'Reports' }).click();
    await page.waitForURL('**/reports');
    await expect(page.locator('[data-testid="reports-page-view"], [data-testid="page-reports"]')).toBeVisible();

    await expect(page.locator('.reports-title')).toContainText('Financial Reports & Spend Analytics');
    await expect(page.locator('[data-testid="export-csv-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-pdf-btn"]')).toBeVisible();
    await expect(page.locator('.reports-metric-strip, .vendor-breakdown-card')).toBeVisible();

    await logout(page);
  });

  test('Test 4: Switch or log in as "Jordan Lee (Requester)" -> Verify only their submitted invoices load, Approvals/Payments/Reports/Audit Log links are hidden in navigation, access to restricted routes is blocked', async ({ page }) => {
    await loginAs(page, 'Requester');

    await expect(page.locator('.user-name-label')).toHaveText('Jordan Lee');
    await expect(page.locator('.user-role-label')).toHaveText('Requester');

    // Verify restricted navigation: only Dashboard, Invoices, Vendors are visible
    const expectedRequesterNav = ['Dashboard', 'Invoices', 'Vendors'];
    const sidebarItems = page.locator('aside.app-sidebar .nav-link-item, aside.app-sidebar sp-sidenav-item');
    await expect(sidebarItems.first()).toBeVisible();
    expect(await sidebarItems.count()).toBe(expectedRequesterNav.length);

    const labels: string[] = [];
    const count = await sidebarItems.count();
    for (let i = 0; i < count; i++) {
      labels.push((await sidebarItems.nth(i).innerText())?.trim());
    }
    expect(labels).toEqual(expectedRequesterNav);

    await expect(page.locator('aside.app-sidebar', { hasText: 'Approvals' })).toHaveCount(0);
    await expect(page.locator('aside.app-sidebar', { hasText: 'Payments' })).toHaveCount(0);
    await expect(page.locator('aside.app-sidebar', { hasText: 'Reports' })).toHaveCount(0);
    await expect(page.locator('aside.app-sidebar', { hasText: 'Audit Log' })).toHaveCount(0);

    // Navigate to Invoices page
    await page.locator('aside.app-sidebar .nav-link-item, aside.app-sidebar sp-sidenav-item', { hasText: 'Invoices' }).click();
    await page.waitForURL('**/invoices');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="page-invoices"]')).toBeVisible();

    // Verify only their submitted invoices load (INV-2026-001 visible, Admin's INV-2026-006 hidden)
    await expect(page.getByText('INV-2026-001')).toBeVisible();
    await expect(page.getByText('INV-2026-006')).toHaveCount(0);

    // Verify access to restricted routes is blocked by RouteGuard
    const restrictedRoutes = ['/approvals', '/payments', '/reports', '/audit-log'];
    for (const route of restrictedRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      // Access is blocked and redirected away from restricted route back to dashboard '/'
      expect(page.url()).not.toContain(route);
      expect(page.url()).toMatch(/\/(#.*)?$/);
      await expect(page.locator('[data-testid="page-dashboard"]')).toBeVisible();
    }

    await logout(page);
  });

  test('Dark mode theme toggle works', async ({ page }) => {
    await loginAs(page, 'Admin');

    const themeElement = page.locator('.app-root, sp-theme').first();
    await expect(themeElement).toHaveAttribute('data-theme', 'light');

    const themeToggle = page.locator('button[aria-label*="theme"], sp-action-button[aria-label*="theme"]');
    await expect(themeToggle).toBeVisible();

    // Toggle to dark mode
    await themeToggle.click();
    await expect(themeElement).toHaveAttribute('data-theme', 'dark');

    // Toggle back to light mode
    await themeToggle.click();
    await expect(themeElement).toHaveAttribute('data-theme', 'light');

    await logout(page);
  });

  test('Approver persona workflow: queue triage and approving an Under Verification invoice', async ({ page }) => {
    await loginAs(page, 'Approver');

    // Navigate to Approvals page
    await page.locator('aside.app-sidebar .nav-link-item, aside.app-sidebar sp-sidenav-item', { hasText: 'Approvals' }).click();
    await page.waitForURL('**/approvals');
    await expect(page.locator('[data-testid="page-approvals"]')).toBeVisible();

    // Verify queue displays invoices awaiting approval
    const invRow = page.locator('table tbody tr', { hasText: 'Under Verification' }).first();
    await expect(invRow).toBeVisible();
    const rowText = await invRow.innerText();
    const invoiceNumber = rowText.match(/INV-2026-\d+/)?.[0] || 'INV-2026-031';

    // Approve the Under Verification invoice
    const approveBtn = invRow.locator('[data-testid^="approve-btn-"], button:has-text("Approve"), sp-button:has-text("Approve")');
    await approveBtn.click();

    // ConfirmDialog opens
    const dialog = page.locator('[role="alertdialog"]');
    await expect(dialog).toBeVisible();
    const confirmBtn = dialog.locator('sp-button, button', { hasText: 'Approve Invoice' });
    await confirmBtn.click();

    // Toast notification confirms status change
    const toast = page.locator('[data-testid="approvals-toast-message"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(invoiceNumber);
    await expect(toast).toContainText('approved');

    // Approved invoice is removed from triage queue
    await expect(page.locator('table tbody tr', { hasText: invoiceNumber })).toHaveCount(0);

    await logout(page);
  });

  test('Admin persona workflow: schedule payment, mark paid, audit log, and attachment download', async ({ page }) => {
    await loginAs(page, 'Admin');

    // Navigate to Invoices
    await page.locator('aside.app-sidebar .nav-link-item, aside.app-sidebar sp-sidenav-item', { hasText: 'Invoices' }).click();
    await page.waitForURL('**/invoices');
    await page.waitForLoadState('networkidle');

    // Select an invoice that is Approved (not yet scheduled or paid)
    const approvedRow = page.locator('table tbody tr', { hasText: 'Approved' }).first();
    await expect(approvedRow).toBeVisible();

    await approvedRow.click();
    await page.waitForURL('**/invoices/*');
    await expect(page.locator('[data-testid="page-invoice-detail"]')).toBeVisible();

    // 1. Schedule payment
    const scheduleBtn = page.locator('[data-testid="schedule-payment-btn"]');
    await expect(scheduleBtn).toBeVisible();
    await scheduleBtn.click();

    const scheduleDialog = page.locator('[role="alertdialog"]');
    await expect(scheduleDialog).toBeVisible();
    const paymentDateInput = page.locator('[data-testid="payment-date-input"]');
    await paymentDateInput.fill('2026-11-28');
    const confirmScheduleBtn = scheduleDialog.locator('button, sp-button', { hasText: 'Schedule Payment' });
    await confirmScheduleBtn.click();

    // Verify toast and scheduled state
    const toast = page.locator('[data-testid="invoice-detail-toast"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('scheduled for 2026-11-28');

    // 2. Mark as Paid
    const markPaidBtn = page.locator('[data-testid="mark-paid-btn"]');
    await expect(markPaidBtn).toBeVisible();
    await markPaidBtn.click();

    const markPaidDialog = page.locator('[role="alertdialog"]');
    await expect(markPaidDialog).toBeVisible();
    const confirmPaidBtn = markPaidDialog.locator('button, sp-button', { hasText: 'Confirm Settlement' });
    await confirmPaidBtn.click();

    // Verify Paid notice
    await expect(page.locator('[data-testid="paid-notice"]')).toBeVisible();
    await expect(page.locator('[data-testid="paid-notice"]')).toContainText('Payment Completed');

    // 3. Load Audit Log page
    await page.locator('aside.app-sidebar .nav-link-item, aside.app-sidebar sp-sidenav-item', { hasText: 'Audit Log' }).click();
    await page.waitForURL('**/audit-log');
    await expect(page.locator('[data-testid="audit-log-page-view"]')).toBeVisible();
    await expect(page.locator('.audit-log-title')).toHaveText('System Audit Trail');

    // 4. Download attachment
    await page.locator('aside.app-sidebar .nav-link-item, aside.app-sidebar sp-sidenav-item', { hasText: 'Invoices' }).click();
    await page.waitForURL('**/invoices');
    await page.waitForLoadState('networkidle');
    await page.getByText('INV-2026-001').click();
    await page.waitForURL('**/invoices/*');

    const downloadBtn = page.locator('[data-testid="download-document-btn"]');
    await expect(downloadBtn).toBeVisible();
    await downloadBtn.click();

    // Verify download notice toast
    await expect(page.locator('[data-testid="invoice-detail-toast"]')).toBeVisible();
    await expect(page.locator('[data-testid="invoice-detail-toast"]')).toContainText('Downloading');

    // Verify backend endpoint serves attachment
    const currentUrl = page.url();
    const invoiceIdMatch = currentUrl.match(/\/invoices\/([a-zA-Z0-9_-]+)/);
    if (invoiceIdMatch) {
      const invoiceId = invoiceIdMatch[1];
      const token = await page.evaluate(() => sessionStorage.getItem('payverify_auth_token'));
      const attachResponse = await page.request.get(`/api/invoices/${invoiceId}/attachment`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      expect(attachResponse.status()).toBe(200);
      expect(attachResponse.headers()['content-disposition']).toContain('attachment');
    }

    await logout(page);
  });
});

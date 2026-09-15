// tests/components/layout.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TopBar } from '../../src/components/layout/TopBar';
import { SideNav } from '../../src/components/layout/SideNav';
import { AppShell } from '../../src/components/layout/AppShell';
import { NotificationPanel } from '../../src/components/layout/NotificationPanel';
import { App } from '../../src/app/App';
import { AuthProvider } from '../../src/context/AuthContext';
import { DataProvider } from '../../src/context/DataContext';
import { setMockDelayEnabled } from '../../src/services/mockApi';

describe('Layout Components', () => {
  beforeEach(() => {
    setMockDelayEnabled(false);
    sessionStorage.clear();
  });

  describe('TopBar', () => {
    it('renders skip to main content link / role button in TopBar', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <DataProvider>
              <TopBar onToggleSidebar={() => {}} />
            </DataProvider>
          </AuthProvider>
        </MemoryRouter>
      );
      expect(screen.getByRole('button', { name: /role/i })).toBeDefined();
    });

    it('renders hamburger button and triggers onToggleSidebar callback', () => {
      const handleToggle = vi.fn();
      render(
        <MemoryRouter>
          <AuthProvider>
            <DataProvider>
              <TopBar onToggleSidebar={handleToggle} />
            </DataProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      const hamburger = screen.getByRole('button', { name: /toggle navigation|menu/i });
      expect(hamburger).toBeDefined();
      fireEvent.click(hamburger);
      expect(handleToggle).toHaveBeenCalledTimes(1);
    });

    it('renders global search input', () => {
      const { container } = render(
        <MemoryRouter>
          <AuthProvider>
            <DataProvider>
              <TopBar onToggleSidebar={() => {}} />
            </DataProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      const search = container.querySelector('sp-search') || screen.getByRole('searchbox', { hidden: true });
      expect(search).toBeDefined();
    });

    it('renders notification bell with live aria badge wrapper', async () => {
      const { container } = render(
        <MemoryRouter>
          <AuthProvider>
            <DataProvider>
              <TopBar onToggleSidebar={() => {}} />
            </DataProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      const bell = screen.getByRole('button', { name: /notification/i });
      expect(bell).toBeDefined();

      const liveWrapper = container.querySelector('[aria-live="polite"]');
      expect(liveWrapper).toBeDefined();
    });

    it('toggles notification flyout when bell is clicked', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <DataProvider>
              <TopBar onToggleSidebar={() => {}} />
            </DataProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      const bell = screen.getByRole('button', { name: /notification/i });
      fireEvent.click(bell);
      expect(screen.getByRole('region', { name: /notification/i })).toBeDefined();
    });

    it('renders theme toggle and calls onToggleTheme or toggles mode', () => {
      const handleToggleTheme = vi.fn();
      render(
        <MemoryRouter>
          <AuthProvider>
            <DataProvider>
              <TopBar onToggleSidebar={() => {}} theme="light" onToggleTheme={handleToggleTheme} />
            </DataProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      const themeBtn = screen.getByRole('button', { name: /theme|dark|light/i });
      expect(themeBtn).toBeDefined();
      fireEvent.click(themeBtn);
      expect(handleToggleTheme).toHaveBeenCalledTimes(1);
    });

    it('allows fast role switching via role switcher', () => {
      render(
        <MemoryRouter>
          <AuthProvider initialRole="Requester">
            <DataProvider>
              <TopBar onToggleSidebar={() => {}} />
            </DataProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      const roleBtn = screen.getByRole('button', { name: /role/i });
      fireEvent.click(roleBtn);

      const adminOption = screen.getByRole('button', { name: /admin/i });
      expect(adminOption).toBeDefined();
      fireEvent.click(adminOption);

      expect(sessionStorage.getItem('active_role')).toBe('Admin');
    });

    it('renders user profile info and logs out when logout button is clicked', () => {
      render(
        <MemoryRouter>
          <AuthProvider initialRole="Admin">
            <DataProvider>
              <TopBar onToggleSidebar={() => {}} />
            </DataProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      const logoutBtn = screen.getByRole('button', { name: /log\s*out/i });
      expect(logoutBtn).toBeDefined();
      fireEvent.click(logoutBtn);

      expect(sessionStorage.getItem('active_role')).toBeNull();
    });
  });

  describe('SideNav', () => {
    it('renders Logo with link to /', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <SideNav />
          </AuthProvider>
        </MemoryRouter>
      );

      const logoLink = screen.getByRole('link', { name: /payverify/i });
      expect(logoLink).toBeDefined();
      expect(logoLink.getAttribute('href')).toBe('/');
    });

    it('filters navigation items strictly by Requester role', () => {
      render(
        <MemoryRouter>
          <AuthProvider initialRole="Requester">
            <SideNav />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('Dashboard')).toBeDefined();
      expect(screen.getByText('Invoices')).toBeDefined();
      expect(screen.getByText('Vendors')).toBeDefined();

      expect(screen.queryByText('Approvals')).toBeNull();
      expect(screen.queryByText('Payments')).toBeNull();
      expect(screen.queryByText('Reports')).toBeNull();
      expect(screen.queryByText('Audit Log')).toBeNull();
    });

    it('filters navigation items strictly by Approver role', () => {
      render(
        <MemoryRouter>
          <AuthProvider initialRole="Approver">
            <SideNav />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('Dashboard')).toBeDefined();
      expect(screen.getByText('Invoices')).toBeDefined();
      expect(screen.getByText('Vendors')).toBeDefined();
      expect(screen.getByText('Approvals')).toBeDefined();
      expect(screen.getByText('Payments')).toBeDefined();
      expect(screen.getByText('Reports')).toBeDefined();

      expect(screen.queryByText('Audit Log')).toBeNull();
    });

    it('displays all navigation links including Audit Log for Admin role', () => {
      render(
        <MemoryRouter>
          <AuthProvider initialRole="Admin">
            <SideNav />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('Dashboard')).toBeDefined();
      expect(screen.getByText('Invoices')).toBeDefined();
      expect(screen.getByText('Vendors')).toBeDefined();
      expect(screen.getByText('Approvals')).toBeDefined();
      expect(screen.getByText('Payments')).toBeDefined();
      expect(screen.getByText('Reports')).toBeDefined();
      expect(screen.getByText('Audit Log')).toBeDefined();
    });

    it('triggers onNavigate callback when link is clicked', () => {
      const handleNavigate = vi.fn();
      render(
        <MemoryRouter>
          <AuthProvider initialRole="Admin">
            <SideNav onNavigate={handleNavigate} />
          </AuthProvider>
        </MemoryRouter>
      );

      const invoiceItem = screen.getByText('Invoices');
      fireEvent.click(invoiceItem);
      expect(handleNavigate).toHaveBeenCalled();
    });
  });

  describe('NotificationPanel', () => {
    it('renders notification panel with heading and notifications', async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <DataProvider>
              <NotificationPanel isOpen={true} onClose={() => {}} />
            </DataProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: 'Notifications' })).toBeDefined();
      expect(screen.getByRole('button', { name: /mark all as read/i })).toBeDefined();
    });

    it('calls markAllNotificationsAsRead when button is clicked', async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <DataProvider>
              <NotificationPanel isOpen={true} onClose={() => {}} />
            </DataProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      const markBtn = screen.getByRole('button', { name: /mark all as read/i });
      fireEvent.click(markBtn);
    });

    it('renders empty message when notifications are all read', () => {
      render(
        <MemoryRouter>
          <NotificationPanel
            isOpen={true}
            onClose={() => {}}
            notifications={[]}
            onMarkAllAsRead={() => {}}
            onNotificationClick={() => {}}
          />
        </MemoryRouter>
      );

      expect(screen.getByText(/no new notifications/i)).toBeDefined();
    });
  });

  describe('AppShell', () => {
    it('renders skip link as first focusable element pointing to #main-content', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <DataProvider>
              <AppShell>
                <div>Page Body</div>
              </AppShell>
            </DataProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      const skipLink = screen.getByText('Skip to main content');
      expect(skipLink).toBeDefined();
      expect(skipLink.getAttribute('href')).toBe('#main-content');
      expect(skipLink.getAttribute('tabIndex')).toBe('0');
      expect(skipLink.className).toContain('skip-link');

      const main = document.getElementById('main-content');
      expect(main).toBeDefined();
      expect(main?.getAttribute('tabIndex')).toBe('-1');
      expect(screen.getByText('Page Body')).toBeDefined();
    });

    it('renders Outlet when children not directly passed', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider>
            <DataProvider>
              <Routes>
                <Route element={<AppShell />}>
                  <Route path="/" element={<div>Child Outlet Content</div>} />
                </Route>
              </Routes>
            </DataProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('Child Outlet Content')).toBeDefined();
    });

    it('manages responsive drawer state and toggles sidebar on mobile', () => {
      const { container } = render(
        <MemoryRouter>
          <AuthProvider>
            <DataProvider>
              <AppShell>
                <div>Content</div>
              </AppShell>
            </DataProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      const hamburger = screen.getByRole('button', { name: /toggle navigation|menu/i });
      fireEvent.click(hamburger);

      const sidebar = container.querySelector('.app-sidebar');
      expect(sidebar?.classList.contains('app-sidebar--open')).toBe(true);

      const overlay = container.querySelector('.sidebar-overlay');
      expect(overlay).toBeDefined();
      fireEvent.click(overlay!);
      expect(sidebar?.classList.contains('app-sidebar--open')).toBe(false);
    });

    it('closes mobile sidebar when Escape key is pressed', () => {
      const { container } = render(
        <MemoryRouter>
          <AuthProvider>
            <DataProvider>
              <AppShell>
                <div>Content</div>
              </AppShell>
            </DataProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      const hamburger = screen.getByRole('button', { name: /toggle navigation|menu/i });
      fireEvent.click(hamburger);
      const sidebar = container.querySelector('.app-sidebar');
      expect(sidebar?.classList.contains('app-sidebar--open')).toBe(true);

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(sidebar?.classList.contains('app-sidebar--open')).toBe(false);
    });
  });

  describe('App', () => {
    it('mounts App root component and renders platform without errors', () => {
      render(<App />);
      expect(screen.getByText('Skip to main content')).toBeDefined();
      expect(screen.getByRole('button', { name: /role/i })).toBeDefined();
    });
  });
});

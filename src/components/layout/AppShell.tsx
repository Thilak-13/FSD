// src/components/layout/AppShell.tsx
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { SideNav } from './SideNav';
import { TopBar } from './TopBar';
import './layout.css';

export interface AppShellProps {
  children?: React.ReactNode;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  theme = 'light',
  onToggleTheme,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  // Close mobile sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isSidebarOpen) {
        closeSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSidebarOpen]);

  return (
    <div className="app-shell">
      {/* WCAG AA: Skip to main content link as first focusable element */}
      <a href="#main-content" className="skip-link" tabIndex={0}>
        Skip to main content
      </a>

      <div className="app-container">
        {/* Responsive SideNav Drawer */}
        <SideNav isOpen={isSidebarOpen} onClose={closeSidebar} onNavigate={closeSidebar} />

        {/* Mobile backdrop overlay */}
        {isSidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={closeSidebar}
            aria-hidden="true"
          />
        )}

        {/* Main application area with TopBar and page content */}
        <div className="app-main-area">
          <TopBar
            onToggleSidebar={toggleSidebar}
            theme={theme}
            onToggleTheme={onToggleTheme}
          />
          <main id="main-content" className="app-main-content" tabIndex={-1}>
            {children ?? <Outlet />}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AppShell;

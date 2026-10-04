// src/components/layout/SideNav.tsx
import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { SideNav as SpSideNav, SideNavItem as SpSideNavItem } from '@swc-react/sidenav';
import { ActionButton } from '@swc-react/action-button';
import { Logo } from '../../assets/brand/Logo';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';

export interface NavItem {
  path: string;
  label: string;
  allowedRoles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Dashboard' },
  { path: '/invoices', label: 'Invoices' },
  { path: '/approvals', label: 'Approvals', allowedRoles: ['Admin', 'Approver'] },
  { path: '/payments', label: 'Payments', allowedRoles: ['Admin', 'Approver'] },
  { path: '/vendors', label: 'Vendors' },
  { path: '/reports', label: 'Reports', allowedRoles: ['Admin', 'Approver'] },
  { path: '/audit-log', label: 'Audit Log', allowedRoles: ['Admin'] },
];

export interface SideNavProps {
  isOpen?: boolean;
  onClose?: () => void;
  onNavigate?: () => void;
}

export const SideNav: React.FC<SideNavProps> = ({
  isOpen = false,
  onClose,
  onNavigate,
}) => {
  const { currentRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Filter navigation links based on user role
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.allowedRoles) return true;
    return item.allowedRoles.includes(currentRole);
  });

  const handleItemClick = (path: string, event: React.MouseEvent) => {
    event.preventDefault();
    navigate(path);
    if (onNavigate) {
      onNavigate();
    }
    if (onClose) {
      onClose();
    }
  };

  const isItemActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <aside
      className={`app-sidebar ${isOpen ? 'app-sidebar--open' : ''}`.trim()}
      aria-label="Sidebar Navigation"
    >
      <div className="sidebar-header">
        <Link
          to="/"
          className="sidebar-brand-link"
          aria-label="PayVerify Home"
          onClick={(e) => {
            e.preventDefault();
            navigate('/');
            onNavigate?.();
            onClose?.();
          }}
        >
          <Logo size={32} showText />
        </Link>
        <ActionButton
          quiet
          size="s"
          className="sidebar-close-btn"
          aria-label="Close navigation"
          role="button"
          onClick={onClose}
        >
          ✕
        </ActionButton>
      </div>

      <nav className="sidebar-nav-content" aria-label="Main Navigation">
        <SpSideNav>
          {visibleItems.map((item) => {
            const active = isItemActive(item.path);
            return (
              <SpSideNavItem
                key={item.path}
                href={item.path}
                value={item.path}
                role="link"
                selected={active}
                className={`nav-link-item ${active ? 'active' : ''}`}
                onClick={(e) => handleItemClick(item.path, e)}
              >
                {item.label}
              </SpSideNavItem>
            );
          })}
        </SpSideNav>
      </nav>
    </aside>
  );
};

export default SideNav;

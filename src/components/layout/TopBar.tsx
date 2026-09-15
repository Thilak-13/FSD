// src/components/layout/TopBar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SpSearch } from '@swc-react/search';
import { Badge as SpBadge } from '@swc-react/badge';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Role } from '../../types';
import { NotificationPanel } from './NotificationPanel';

export interface TopBarProps {
  onToggleSidebar?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onToggleSidebar,
  theme = 'light',
  onToggleTheme,
}) => {
  const { currentUser, currentRole, switchRole, logout } = useAuth();
  const navigate = useNavigate();

  let dataContext: ReturnType<typeof useData> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    dataContext = useData();
  } catch {
    // Graceful fallback if rendered outside DataProvider in tests
  }

  const notifications = dataContext?.notifications || [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [localTheme, setLocalTheme] = useState<'light' | 'dark'>(theme);
  const [searchTerm, setSearchTerm] = useState('');

  const roleMenuRef = useRef<HTMLDivElement>(null);

  // Sync prop theme with local state
  useEffect(() => {
    setLocalTheme(theme);
  }, [theme]);

  // Handle outside click to close role dropdown menu
  useEffect(() => {
    if (!isRoleMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setIsRoleMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsRoleMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRoleMenuOpen]);

  const handleRoleChange = (role: Role) => {
    switchRole(role);
    setIsRoleMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleToggleTheme = () => {
    if (onToggleTheme) {
      onToggleTheme();
    } else {
      setLocalTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    }
  };

  const roles: Role[] = ['Admin', 'Approver', 'Requester'];

  return (
    <header className="top-bar" role="banner">
      <div className="top-bar-left">
        <button
          type="button"
          className="hamburger-btn"
          aria-label="Toggle navigation"
          onClick={onToggleSidebar}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <rect y="3" width="20" height="2" rx="1" />
            <rect y="9" width="20" height="2" rx="1" />
            <rect y="15" width="20" height="2" rx="1" />
          </svg>
        </button>

        <div className="global-search-container">
          <SpSearch
            placeholder="Search invoices, vendors..."
            aria-label="Search"
            className="global-search-input"
            value={searchTerm}
            onInput={(e: any) => setSearchTerm(e.target?.value || '')}
          />
        </div>
      </div>

      <div className="top-bar-right">
        {/* Notification Bell with Live Badge */}
        <div className="notification-bell-container">
          <button
            type="button"
            className="icon-btn"
            aria-label={
              unreadCount > 0
                ? `Notifications (${unreadCount} unread)`
                : 'Notifications'
            }
            aria-expanded={isNotificationOpen}
            onClick={() => setIsNotificationOpen((prev) => !prev)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <div className="notification-badge-wrapper" aria-live="polite">
              {unreadCount > 0 && (
                <SpBadge size="s" variant="accent">
                  {unreadCount}
                </SpBadge>
              )}
            </div>
          </button>

          <NotificationPanel
            isOpen={isNotificationOpen}
            onClose={() => setIsNotificationOpen(false)}
          />
        </div>

        {/* Light / Dark Mode Toggle */}
        <button
          type="button"
          className="icon-btn"
          aria-label={
            localTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
          }
          title={
            localTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
          }
          onClick={handleToggleTheme}
        >
          {localTheme === 'dark' ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* Fast Role Switcher */}
        <div className="role-switcher-container" ref={roleMenuRef}>
          <button
            type="button"
            className="role-switcher-trigger"
            aria-label={`Role: ${currentRole}`}
            aria-haspopup="true"
            aria-expanded={isRoleMenuOpen}
            onClick={() => setIsRoleMenuOpen((prev) => !prev)}
          >
            Role: {currentRole} ▾
          </button>

          {isRoleMenuOpen && (
            <div className="role-dropdown-menu" aria-label="Role selector">
              {roles.map((role) => (
                <button
                  key={role}
                  type="button"
                  aria-label={`Switch to ${role} role`}
                  className={`role-dropdown-item ${currentRole === role ? 'active' : ''}`}
                  onClick={() => handleRoleChange(role)}
                >
                  <span>{role}</span>
                  {currentRole === role && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Profile & Logout */}
        <div className="user-profile-strip">
          <div
            className="user-avatar-badge"
            aria-hidden="true"
            title={currentUser?.name || currentRole}
          >
            {currentUser?.name?.charAt(0) || currentRole.charAt(0)}
          </div>
          <div className="user-info-text">
            <span className="user-name-label">{currentUser?.name || 'User'}</span>
            <span className="user-role-label">{currentRole}</span>
          </div>
          <button
            type="button"
            className="logout-btn"
            aria-label="Log out"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopBar;

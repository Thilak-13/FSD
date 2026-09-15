// src/components/layout/NotificationPanel.tsx
import React, { useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataContext } from '../../context/DataContext';
import { Notification } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';

export interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications?: Notification[];
  onMarkAllAsRead?: () => void;
  onNotificationClick?: (notification: Notification) => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  notifications: customNotifications,
  onMarkAllAsRead: customMarkAll,
  onNotificationClick: customOnClick,
}) => {
  const navigate = useNavigate();
  const dataCtx = useContext(DataContext);

  const notifications = customNotifications ?? (dataCtx?.notifications || []);
  const unreadNotifications = notifications.filter((n) => !n.read);
  const unreadCount = unreadNotifications.length;

  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape or outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // Only trigger if click wasn't on the toggle bell
        const target = e.target as HTMLElement;
        if (!target.closest('.notification-bell-container')) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleMarkAllRead = async () => {
    if (customMarkAll) {
      customMarkAll();
    } else if (dataCtx) {
      await dataCtx.markAllNotificationsAsRead();
    }
  };

  const handleItemClick = async (item: Notification) => {
    if (customOnClick) {
      customOnClick(item);
    } else {
      if (dataCtx && !item.read) {
        await dataCtx.markNotificationAsRead(item.id);
      }
      if (item.invoiceId) {
        navigate(`/invoices/${item.invoiceId}`);
      }
    }
    onClose();
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <div
      ref={panelRef}
      className="notification-panel-flyout"
      role="region"
      aria-label="Notifications Panel"
    >
      <div className="notification-panel-header">
        <h2 className="notification-panel-title">Notifications</h2>
        <button
          type="button"
          className="mark-all-read-btn"
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
          aria-label="Mark all as read"
        >
          Mark all as read
        </button>
      </div>

      {unreadCount === 0 ? (
        <div className="notification-empty">
          <p>No unread notifications</p>
        </div>
      ) : (
        <ul className="notification-list" role="list">
          {unreadNotifications.map((notif) => (
            <li key={notif.id} className="notification-item-container">
              <button
                type="button"
                className={`notification-item ${notif.read ? 'read' : 'unread'}`}
                onClick={() => handleItemClick(notif)}
                aria-label={`${notif.read ? 'Read' : 'Unread'} notification: ${notif.message}`}
              >
                <p className="notification-item-message">{notif.message}</p>
                <div className="notification-item-meta">
                  <StatusBadge status={notif.type} />
                  <span>{formatTimestamp(notif.createdAt)}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NotificationPanel;

// src/components/layout/NotificationPanel.tsx
import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { Notification } from '../../types';

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
  let dataContext: ReturnType<typeof useData> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    dataContext = useData();
  } catch {
    // Gracefully handle rendering without DataProvider if mocked
  }

  const notifications = customNotifications ?? (dataContext?.notifications || []);
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
    } else if (dataContext) {
      await dataContext.markAllNotificationsAsRead();
    }
  };

  const handleItemClick = async (item: Notification) => {
    if (customOnClick) {
      customOnClick(item);
    } else {
      if (dataContext && !item.read) {
        await dataContext.markNotificationAsRead(item.id);
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
          disabled={notifications.length === 0}
          aria-label="Mark all as read"
        >
          Mark all as read
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="notification-empty">
          <p>No new notifications</p>
        </div>
      ) : (
        <ul className="notification-list" role="list">
          {notifications.map((notif) => (
            <li
              key={notif.id}
              className={`notification-item ${notif.read ? 'read' : 'unread'}`}
              onClick={() => handleItemClick(notif)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleItemClick(notif);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`${notif.read ? 'Read' : 'Unread'} notification: ${notif.message}`}
            >
              <p className="notification-item-message">{notif.message}</p>
              <div className="notification-item-meta">
                <span>{notif.type}</span>
                <span>{formatTimestamp(notif.createdAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NotificationPanel;

// src/services/api/notifications.ts
import { Notification } from '../../types';
import { apiFetch } from './client';

export const getNotifications = async (
  userId?: string
): Promise<Notification[]> => {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  return apiFetch<Notification[]>(`/notifications${query}`);
};

export const markNotificationAsRead = async (id: string): Promise<void> => {
  await apiFetch<void>(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
};

export const markAllNotificationsAsRead = async (
  userId?: string
): Promise<void> => {
  await apiFetch<void>('/notifications/read-all', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
};

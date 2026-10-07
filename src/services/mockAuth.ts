// src/services/mockAuth.ts
import { User } from '../types';
import { INITIAL_USERS } from './mockApi/users';
import { setStoredToken, clearStoredToken, getStoredToken } from './api/client';

export const DEMO_USERS: User[] = [
  {
    id: 'user-alex',
    name: 'Alex Rivera',
    email: 'alex.rivera@apex.corp',
    role: 'Admin',
    department: 'Finance Operations',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&fit=crop&crop=face',
  },
  {
    id: 'user-sarah-apex',
    name: 'Sarah Chen',
    email: 'sarah.chen@apex.corp',
    role: 'Approver',
    department: 'Procurement & Operations',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&fit=crop&crop=face',
  },
  {
    id: 'user-jordan',
    name: 'Jordan Lee',
    email: 'jordan.lee@apex.corp',
    role: 'Requester',
    department: 'Engineering / Facilities',
    avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=128&fit=crop&crop=face',
  },
];

let storedUser: User | null = null;

export const login = async (
  email: string,
  password?: string
): Promise<{ token: string; user: User }> => {
  if (!password || password.trim() === '') {
    throw new Error('Invalid email or password');
  }

  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Invalid email or password');
  }

  const user =
    INITIAL_USERS.find((u) => u.email.toLowerCase() === normalizedEmail) ||
    DEMO_USERS.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    throw new Error('Invalid email or password');
  }

  const token = 'mock-token-' + user.id;
  storedUser = user;
  setStoredToken(token);
  return { token, user };
};

export const getCurrentUser = async (): Promise<User | null> => {
  if (storedUser) {
    return storedUser;
  }

  const token = getStoredToken();
  if (token && token.startsWith('mock-token-')) {
    const userId = token.replace('mock-token-', '');
    const found =
      INITIAL_USERS.find((u) => u.id === userId) ||
      DEMO_USERS.find((u) => u.id === userId);
    if (found) {
      storedUser = found;
      return storedUser;
    }
  }

  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const activeUser = sessionStorage.getItem('active_user');
      if (activeUser) {
        storedUser = JSON.parse(activeUser);
        return storedUser;
      }
    } catch {
      // Ignore
    }
  }

  return INITIAL_USERS[0];
};

export const logout = async (): Promise<void> => {
  storedUser = null;
  clearStoredToken();
};

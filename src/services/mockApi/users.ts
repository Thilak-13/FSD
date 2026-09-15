// src/services/mockApi/users.ts
import { User } from '../../types';
import { simulateDelay } from './delay';

export const INITIAL_USERS: User[] = [
  {
    id: 'user-1',
    name: 'Sarah Chen',
    email: 'sarah.chen@enterprise.com',
    role: 'Admin',
    department: 'Finance Operations',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&fit=crop&crop=face',
  },
  {
    id: 'user-2',
    name: 'Marcus Vance',
    email: 'marcus.vance@enterprise.com',
    role: 'Approver',
    department: 'Procurement & Approvals',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&fit=crop&crop=face',
  },
  {
    id: 'user-3',
    name: 'Elena Rodriguez',
    email: 'elena.rodriguez@enterprise.com',
    role: 'Requester',
    department: 'Engineering / Facilities',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&fit=crop&crop=face',
  },
];

let usersStore: User[] = [...INITIAL_USERS];

export const resetUsers = (): void => {
  usersStore = [...INITIAL_USERS];
};

export const getUsers = async (): Promise<User[]> => {
  await simulateDelay();
  return [...usersStore];
};

export const getUserById = async (id: string): Promise<User | null> => {
  await simulateDelay();
  const user = usersStore.find((u) => u.id === id);
  return user ? { ...user } : null;
};

// src/services/api/users.ts
import { User } from '../../types';
import { apiFetch } from './client';

export const getUsers = async (): Promise<User[]> => {
  return apiFetch<User[]>('/auth/users');
};

export const getUserById = async (id: string): Promise<User | null> => {
  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
    return null;
  }
  try {
    return await apiFetch<User>(`/auth/users/${id}`);
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err.message.includes('404') || err.message.toLowerCase().includes('not found'))
    ) {
      return null;
    }
    throw err;
  }
};

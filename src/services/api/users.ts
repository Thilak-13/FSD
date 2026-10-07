// src/services/api/users.ts
import { User } from '../../types';
import { apiFetch, ApiError } from './client';

export const getUsers = async (): Promise<User[]> => {
  return apiFetch<User[]>('/auth/users');
};

export const getUserById = async (id: string): Promise<User | null> => {
  try {
    return await apiFetch<User>(`/auth/users/${id}`);
  } catch (err: unknown) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
};

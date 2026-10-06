// src/services/api/auth.ts
import { User } from '../../types';
import { apiFetch, setStoredToken, clearStoredToken } from './client';

export interface LoginResponse {
  token: string;
  user: User;
}

export const login = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  const res = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (res?.token) {
    setStoredToken(res.token);
  }
  return res;
};

export const logout = async (): Promise<void> => {
  clearStoredToken();
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const res = await apiFetch<{ user: User }>('/auth/me');
    return res.user;
  } catch {
    return null;
  }
};

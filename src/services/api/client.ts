// src/services/api/client.ts
const metaEnv = typeof import.meta !== 'undefined' && (import.meta as Record<string, any>).env;
export const API_BASE_URL = metaEnv?.VITE_API_URL || '/api';
const TOKEN_KEY = 'payverify_auth_token';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export const getStoredToken = (): string | null => {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }
  return null;
};

export const setStoredToken = (token: string): void => {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Ignore
    }
  }
};

export const clearStoredToken = (): void => {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore
    }
  }
};

export const apiFetch = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const token = getStoredToken();

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Only set Content-Type to application/json if body is not FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData?.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // Fallback to status text
    }

    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('payverify:unauthorized'));
      }
    }

    throw new ApiError(response.status, errorMessage);
  }

  return response.json() as Promise<T>;
};

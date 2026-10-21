import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../../src/context/AuthContext';
import { authApi } from '../../src/services/dataSource';
import { setMockDelayEnabled } from '../../src/services/mockApi';

describe('AuthContext', () => {
  beforeEach(async () => {
    setMockDelayEnabled(false);
    sessionStorage.clear();
    await authApi.logout().catch(() => {});
  });

  it('should default to unauthenticated Requester and allow switching roles with real credentials', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.currentRole).toBe('Requester');
    expect(result.current.currentUser).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);

    await act(async () => {
      await result.current.switchRole('Admin');
    });

    expect(result.current.currentRole).toBe('Admin');
    expect(result.current.currentUser?.name).toBe('Alex Rivera');
    expect(result.current.currentUser?.email).toBe('alex.rivera@apex.corp');
    expect(result.current.isAuthenticated).toBe(true);
    expect(sessionStorage.getItem('active_role')).toBe('Admin');
    expect(sessionStorage.getItem('payverify_auth_token')).toBeTruthy();

    await act(async () => {
      await result.current.switchRole('Approver');
    });

    expect(result.current.currentRole).toBe('Approver');
    expect(result.current.currentUser?.name).toBe('Sarah Chen');
    expect(result.current.currentUser?.email).toBe('sarah.chen@apex.corp');
    expect(result.current.isAuthenticated).toBe(true);
    expect(sessionStorage.getItem('active_role')).toBe('Approver');
    expect(sessionStorage.getItem('payverify_auth_token')).toBeTruthy();

    await act(async () => {
      await result.current.switchRole('Requester');
    });

    expect(result.current.currentRole).toBe('Requester');
    expect(result.current.currentUser?.name).toBe('Jordan Lee');
    expect(result.current.currentUser?.email).toBe('jordan.lee@apex.corp');
    expect(result.current.isAuthenticated).toBe(true);
    expect(sessionStorage.getItem('active_role')).toBe('Requester');
    expect(sessionStorage.getItem('payverify_auth_token')).toBeTruthy();
  });

  it('should initialize role and user when initialRole prop is provided', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider initialRole="Approver">{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.currentRole).toBe('Approver');
    expect(result.current.currentUser?.name).toBe('Marcus Vance');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should initialize role from sessionStorage if present but remain unauthenticated without token', () => {
    sessionStorage.setItem('active_role', 'Approver');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.currentRole).toBe('Approver');
    expect(result.current.currentUser).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should initialize user and role from sessionStorage if token and user session exist', () => {
    const demoUser = {
      id: 'user-sarah-apex',
      name: 'Sarah Chen',
      email: 'sarah.chen@apex.corp',
      role: 'Approver' as const,
    };
    sessionStorage.setItem('payverify_auth_token', 'mock-token-user-sarah-apex');
    sessionStorage.setItem('active_user', JSON.stringify(demoUser));
    sessionStorage.setItem('active_role', 'Approver');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.currentRole).toBe('Approver');
    expect(result.current.currentUser?.name).toBe('Sarah Chen');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should handle logout and login', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.switchRole('Admin');
    });
    expect(sessionStorage.getItem('active_role')).toBe('Admin');

    act(() => {
      result.current.logout();
    });

    expect(result.current.currentUser).toBeNull();
    expect(result.current.currentRole).toBe('Requester');
    expect(result.current.isAuthenticated).toBe(false);
    expect(sessionStorage.getItem('active_role')).toBeNull();

    await act(async () => {
      await result.current.login('sarah.chen@enterprise.com', 'password123');
    });

    expect(result.current.currentRole).toBe('Admin');
    expect(result.current.currentUser?.name).toBe('Sarah Chen');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should restore session on mount when stored token exists', async () => {
    sessionStorage.setItem('payverify_auth_token', 'mock-token-user-1');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currentUser?.name).toBe('Sarah Chen');
    expect(result.current.currentRole).toBe('Admin');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should indicate loading while session restore is in progress on boot', async () => {
    sessionStorage.setItem('payverify_auth_token', 'mock-token-user-1');
    let resolveUser: (val: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveUser = resolve;
    });
    const getUserSpy = vi
      .spyOn(authApi, 'getCurrentUser')
      .mockImplementationOnce(() => pendingPromise as any);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveUser!({
        id: 'user-1',
        name: 'Sarah Chen',
        email: 'sarah.chen@enterprise.com',
        role: 'Admin',
      });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.currentUser?.name).toBe('Sarah Chen');
    getUserSpy.mockRestore();
  });

  it('should clear session and log out when stored token validation fails on boot', async () => {
    sessionStorage.setItem('payverify_auth_token', 'invalid-token');
    const getUserSpy = vi
      .spyOn(authApi, 'getCurrentUser')
      .mockRejectedValueOnce(new Error('Invalid token'));

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.currentUser).toBeNull();
    expect(sessionStorage.getItem('payverify_auth_token')).toBeNull();
    getUserSpy.mockRestore();
  });

  it('should trigger logout when payverify:unauthorized window event is dispatched', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('sarah.chen@enterprise.com', 'password123');
    });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.currentUser?.name).toBe('Sarah Chen');

    act(() => {
      window.dispatchEvent(new Event('payverify:unauthorized'));
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.currentUser).toBeNull();
    });
  });

  it('should dispatch payverify:session-update event on login', async () => {
    const sessionUpdateListener = vi.fn();
    window.addEventListener('payverify:session-update', sessionUpdateListener);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('alex.rivera@apex.corp', 'DemoPassword!2026');
    });

    expect(sessionUpdateListener).toHaveBeenCalled();
    expect(result.current.currentUser?.name).toBe('Alex Rivera');
    expect(result.current.isAuthenticated).toBe(true);
    expect(sessionStorage.getItem('payverify_auth_token')).toBeTruthy();

    window.removeEventListener('payverify:session-update', sessionUpdateListener);
  });

  it('should dispatch payverify:logout event on logout and clear session', async () => {
    const logoutListener = vi.fn();
    window.addEventListener('payverify:logout', logoutListener);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('alex.rivera@apex.corp', 'DemoPassword!2026');
    });

    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.logout();
    });

    expect(logoutListener).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.currentUser).toBeNull();
    expect(sessionStorage.getItem('payverify_auth_token')).toBeNull();
    expect(sessionStorage.getItem('active_role')).toBeNull();

    window.removeEventListener('payverify:logout', logoutListener);
  });

  it('should switchRole by calling authApi.login with DEMO_ACCOUNTS credentials and storing JWT token', async () => {
    const loginSpy = vi.spyOn(authApi, 'login');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.switchRole('Requester');
    });

    expect(loginSpy).toHaveBeenCalledWith('jordan.lee@apex.corp', 'DemoPassword!2026');
    expect(result.current.currentRole).toBe('Requester');
    expect(result.current.currentUser?.name).toBe('Jordan Lee');
    expect(result.current.isAuthenticated).toBe(true);
    expect(sessionStorage.getItem('payverify_auth_token')).toBe('mock-token-user-jordan');

    loginSpy.mockRestore();
  });

  it('should throw an error when useAuth is called outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });
});

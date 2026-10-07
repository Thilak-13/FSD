import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../../src/context/AuthContext';
import { setMockDelayEnabled } from '../../src/services/mockApi';

describe('AuthContext', () => {
  beforeEach(() => {
    setMockDelayEnabled(false);
    sessionStorage.clear();
  });

  it('should default to Requester and allow switching roles', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.currentRole).toBe('Requester');
    expect(result.current.currentUser?.name).toBe('Elena Rodriguez');
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.switchRole('Admin');
    });

    expect(result.current.currentRole).toBe('Admin');
    expect(result.current.currentUser?.name).toBe('Sarah Chen');
    expect(sessionStorage.getItem('active_role')).toBe('Admin');

    act(() => {
      result.current.switchRole('Approver');
    });

    expect(result.current.currentRole).toBe('Approver');
    expect(result.current.currentUser?.name).toBe('Marcus Vance');
    expect(sessionStorage.getItem('active_role')).toBe('Approver');
  });

  it('should initialize role from sessionStorage if present', () => {
    sessionStorage.setItem('active_role', 'Approver');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.currentRole).toBe('Approver');
    expect(result.current.currentUser?.name).toBe('Marcus Vance');
  });

  it('should handle logout and login', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.switchRole('Admin');
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

  it('should throw an error when useAuth is called outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });
});

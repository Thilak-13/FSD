// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { User, Role } from '../types';
import { INITIAL_USERS } from '../services/mockApi/users';

const ROLE_STORAGE_KEY = 'active_role';

export interface AuthContextType {
  currentUser: User | null;
  currentRole: Role;
  isAuthenticated: boolean;
  switchRole: (role: Role) => void;
  login: (userOrRole?: User | Role | string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const findUserForRole = (role: Role): User => {
  const match = INITIAL_USERS.find((u) => u.role === role);
  return match || INITIAL_USERS[0];
};

const getInitialRole = (): Role => {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const stored = sessionStorage.getItem(ROLE_STORAGE_KEY) as Role | null;
      if (stored && ['Admin', 'Approver', 'Requester'].includes(stored)) {
        return stored;
      }
    } catch {
      // Ignore sessionStorage access errors
    }
  }
  return 'Requester';
};

export interface AuthProviderProps {
  children: React.ReactNode;
  initialRole?: Role;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  initialRole,
}) => {
  const [currentRole, setCurrentRole] = useState<Role>(() => initialRole || getInitialRole());
  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    findUserForRole(initialRole || getInitialRole())
  );

  // Sync role with session storage
  const saveRoleToSession = (role: Role) => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        sessionStorage.setItem(ROLE_STORAGE_KEY, role);
      } catch {
        // Ignore sessionStorage write errors
      }
    }
  };

  const switchRole = useCallback((role: Role) => {
    const user = findUserForRole(role);
    setCurrentRole(role);
    setCurrentUser(user);
    saveRoleToSession(role);
  }, []);

  const login = useCallback(
    (userOrRole?: User | Role | string) => {
      if (!userOrRole) {
        const defaultRole = getInitialRole();
        const user = findUserForRole(defaultRole);
        setCurrentRole(defaultRole);
        setCurrentUser(user);
        saveRoleToSession(defaultRole);
        return;
      }

      if (typeof userOrRole === 'object' && 'role' in userOrRole) {
        setCurrentUser(userOrRole);
        setCurrentRole(userOrRole.role);
        saveRoleToSession(userOrRole.role);
        return;
      }

      if (
        userOrRole === 'Admin' ||
        userOrRole === 'Approver' ||
        userOrRole === 'Requester'
      ) {
        switchRole(userOrRole);
        return;
      }

      // Check if email match
      const matched = INITIAL_USERS.find(
        (u) =>
          u.email.toLowerCase() === userOrRole.toLowerCase() ||
          u.name.toLowerCase() === userOrRole.toLowerCase()
      );
      if (matched) {
        setCurrentUser(matched);
        setCurrentRole(matched.role);
        saveRoleToSession(matched.role);
      } else {
        // Default to Requester
        switchRole('Requester');
      }
    },
    [switchRole]
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const isAuthenticated = currentUser !== null;

  const value: AuthContextType = {
    currentUser,
    currentRole,
    isAuthenticated,
    switchRole,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

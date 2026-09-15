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
  login: (userOrRole?: User | Role | string, role?: Role) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_ACCOUNTS: Record<string, { name: string; role: Role; email: string }> = {
  'alex.rivera@apex.corp': { name: 'Alex Rivera', role: 'Admin', email: 'alex.rivera@apex.corp' },
  'sarah.chen@apex.corp': { name: 'Sarah Chen', role: 'Approver', email: 'sarah.chen@apex.corp' },
  'jordan.lee@apex.corp': { name: 'Jordan Lee', role: 'Requester', email: 'jordan.lee@apex.corp' },
};

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
    (userOrRole?: User | Role | string, role?: Role) => {
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

      const query = userOrRole.toLowerCase().trim();
      const demoMatch = DEMO_ACCOUNTS[query];

      if (demoMatch) {
        const targetRole = role || demoMatch.role;
        const demoUser: User = {
          id: `demo-${targetRole.toLowerCase()}`,
          name: demoMatch.name,
          email: demoMatch.email,
          role: targetRole,
          department:
            targetRole === 'Admin'
              ? 'Finance Operations'
              : targetRole === 'Approver'
              ? 'Procurement & Approvals'
              : 'Engineering / Facilities',
        };
        setCurrentUser(demoUser);
        setCurrentRole(targetRole);
        saveRoleToSession(targetRole);
        return;
      }

      // Check if email match in INITIAL_USERS
      const matched = INITIAL_USERS.find(
        (u) =>
          u.email.toLowerCase() === query ||
          u.name.toLowerCase() === query
      );

      if (matched && !role) {
        setCurrentUser(matched);
        setCurrentRole(matched.role);
        saveRoleToSession(matched.role);
      } else if (role) {
        const customUser: User = {
          id: `user-${Date.now()}`,
          name: query.includes('@') ? query.split('@')[0] : userOrRole,
          email: query.includes('@') ? userOrRole : `${userOrRole}@apex.corp`,
          role: role,
          department: 'General Operations',
        };
        setCurrentUser(customUser);
        setCurrentRole(role);
        saveRoleToSession(role);
      } else {
        // Default to Requester
        switchRole('Requester');
      }
    },
    [switchRole]
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
    setCurrentRole('Requester');
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        sessionStorage.removeItem(ROLE_STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
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

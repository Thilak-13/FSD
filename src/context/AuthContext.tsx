// src/context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { User, Role } from '../types';
import { INITIAL_USERS } from '../services/mockApi/users';
import { authApi } from '../services/dataSource';
import { getStoredToken, clearStoredToken } from '../services/api/client';

const ROLE_STORAGE_KEY = 'active_role';
const USER_STORAGE_KEY = 'active_user';

export interface AuthContextType {
  currentUser: User | null;
  currentRole: Role;
  isAuthenticated: boolean;
  loading: boolean;
  switchRole: (role: Role) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_ACCOUNTS: Record<string, { name: string; role: Role; email: string }> = {
  'alex.rivera@apex.corp': { name: 'Alex Rivera', role: 'Admin', email: 'alex.rivera@apex.corp' },
  'sarah.chen@apex.corp': { name: 'Sarah Chen', role: 'Approver', email: 'sarah.chen@apex.corp' },
  'jordan.lee@apex.corp': { name: 'Jordan Lee', role: 'Requester', email: 'jordan.lee@apex.corp' },
  'sarah.chen@enterprise.com': { name: 'Sarah Chen', role: 'Admin', email: 'sarah.chen@enterprise.com' },
  'marcus.vance@enterprise.com': { name: 'Marcus Vance', role: 'Approver', email: 'marcus.vance@enterprise.com' },
  'elena.rodriguez@enterprise.com': { name: 'Elena Rodriguez', role: 'Requester', email: 'elena.rodriguez@enterprise.com' },
  'sarah@platform.io': { name: 'Sarah Chen', role: 'Admin', email: 'sarah@platform.io' },
  'marcus@platform.io': { name: 'Marcus Vance', role: 'Approver', email: 'marcus@platform.io' },
  'elena@platform.io': { name: 'Elena Rodriguez', role: 'Requester', email: 'elena@platform.io' },
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

const getInitialUser = (role: Role): User | null => {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const storedUser = sessionStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        return JSON.parse(storedUser);
      }
    } catch {
      // Ignore
    }
  }
  return findUserForRole(role);
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
    initialRole ? findUserForRole(initialRole) : getInitialUser(getInitialRole())
  );
  const [loading, setLoading] = useState<boolean>(() => {
    return Boolean(getStoredToken());
  });

  // Sync role and user with session storage
  const saveSession = (role: Role, user: User | null) => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        sessionStorage.setItem(ROLE_STORAGE_KEY, role);
        if (user) {
          sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
        } else {
          sessionStorage.removeItem(USER_STORAGE_KEY);
        }
      } catch {
        // Ignore sessionStorage write errors
      }
    }
  };

  const switchRole = useCallback((role: Role) => {
    const user = findUserForRole(role);
    setCurrentRole(role);
    setCurrentUser(user);
    saveSession(role, user);
  }, []);

  const logout = useCallback(() => {
    authApi.logout().catch(() => {});
    setCurrentUser(null);
    setCurrentRole('Requester');
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        sessionStorage.removeItem(ROLE_STORAGE_KEY);
        sessionStorage.removeItem(USER_STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
    clearStoredToken();
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const res = await authApi.login(email, password);
      setCurrentUser(res.user);
      setCurrentRole(res.user.role);
      saveSession(res.user.role, res.user);
    },
    []
  );

  // Session restore on app mount
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      setLoading(true);
      authApi
        .getCurrentUser()
        .then((user) => {
          if (user) {
            setCurrentUser(user);
            setCurrentRole(user.role);
            saveSession(user.role, user);
          } else {
            logout();
          }
        })
        .catch(() => {
          logout();
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [logout]);

  // Listen for 'payverify:unauthorized' window event
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('payverify:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('payverify:unauthorized', handleUnauthorized);
    };
  }, [logout]);

  const isAuthenticated = currentUser !== null;

  const value: AuthContextType = {
    currentUser,
    currentRole,
    isAuthenticated,
    loading,
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

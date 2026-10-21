// src/context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { User, Role } from '../types';
import { INITIAL_USERS } from '../services/mockApi/users';
import { authApi } from '../services/dataSource';
import { getStoredToken, setStoredToken, clearStoredToken } from '../services/api/client';

const ROLE_STORAGE_KEY = 'active_role';
const USER_STORAGE_KEY = 'active_user';

export interface AuthContextType {
  currentUser: User | null;
  currentRole: Role;
  isAuthenticated: boolean;
  loading: boolean;
  switchRole: (role: Role) => Promise<void> | void;
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

export const DEMO_ROLE_CREDENTIALS: Record<Role, { email: string; password: string }> = {
  Admin: { email: 'alex.rivera@apex.corp', password: 'DemoPassword!2026' },
  Approver: { email: 'sarah.chen@apex.corp', password: 'DemoPassword!2026' },
  Requester: { email: 'jordan.lee@apex.corp', password: 'DemoPassword!2026' },
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

const getInitialUser = (): User | null => {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const token = getStoredToken();
      const storedUser = sessionStorage.getItem(USER_STORAGE_KEY);
      if (token && storedUser) {
        return JSON.parse(storedUser);
      }
    } catch {
      // Ignore
    }
  }
  return null;
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
    initialRole ? findUserForRole(initialRole) : getInitialUser()
  );
  const [loading, setLoading] = useState<boolean>(() => {
    return Boolean(getStoredToken());
  });

  const isLoggingOutRef = useRef(false);

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

  const logout = useCallback(() => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    try {
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

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('payverify:logout'));
        window.dispatchEvent(new Event('payverify:unauthorized'));
        window.dispatchEvent(
          new CustomEvent('payverify:session-update', {
            detail: { user: null, role: 'Requester', token: null },
          })
        );
      }
    } finally {
      isLoggingOutRef.current = false;
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const res = await authApi.login(email, password);
      if (res?.token) {
        setStoredToken(res.token);
      }
      setCurrentUser(res.user);
      setCurrentRole(res.user.role);
      saveSession(res.user.role, res.user);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('payverify:session-update', {
            detail: { user: res.user, role: res.user.role, token: res.token },
          })
        );
        window.dispatchEvent(
          new CustomEvent('session-update', {
            detail: { user: res.user, role: res.user.role, token: res.token },
          })
        );
      }
    },
    []
  );

  const switchRole = useCallback(
    async (role: Role): Promise<void> => {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        try {
          sessionStorage.setItem(ROLE_STORAGE_KEY, role);
        } catch {
          // Ignore
        }
      }
      setCurrentRole(role);

      const creds = DEMO_ROLE_CREDENTIALS[role] || {
        email:
          Object.values(DEMO_ACCOUNTS).find((acc) => acc.role === role)?.email ||
          `${role.toLowerCase()}@apex.corp`,
        password: 'DemoPassword!2026',
      };
      await login(creds.email, creds.password);
    },
    [login]
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

// src/app/App.tsx
import React, { useState } from 'react';
import {
  BrowserRouter,
  useLocation,
  useInRouterContext,
} from 'react-router-dom';
import { useAuth, AuthProvider } from '../context/AuthContext';
import { DataProvider } from '../context/DataContext';
import { AppRoutes } from './routes';
import { AppShell } from '../components/layout/AppShell';

interface AppContentProps {
  themeMode: 'light' | 'dark';
  toggleTheme: () => void;
}

const AppContent: React.FC<AppContentProps> = ({ themeMode, toggleTheme }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/landing';

  if (!isAuthenticated || isAuthPage) {
    return <AppRoutes />;
  }

  return (
    <AppShell theme={themeMode} onToggleTheme={toggleTheme}>
      <AppRoutes />
    </AppShell>
  );
};

const SafeRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <>{children}</>;
  }
  return <BrowserRouter>{children}</BrowserRouter>;
};

export const App: React.FC = () => {
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className={`app-root theme-${themeMode}`} data-theme={themeMode}>
      <AuthProvider>
        <DataProvider>
          <SafeRouter>
            <AppContent themeMode={themeMode} toggleTheme={toggleTheme} />
          </SafeRouter>
        </DataProvider>
      </AuthProvider>
    </div>
  );
};

export default App;

// src/app/App.tsx
import React, { useState } from 'react';
import {
  BrowserRouter,
  useLocation,
  useInRouterContext,
} from 'react-router-dom';
import { Theme } from '@swc-react/theme';
import '@spectrum-web-components/theme/theme-light.js';
import '@spectrum-web-components/theme/theme-dark.js';
import '@spectrum-web-components/theme/scale-medium.js';
import '@spectrum-web-components/theme/sp-theme.js';
import { AuthProvider } from '../context/AuthContext';
import { DataProvider } from '../context/DataContext';
import { AppRoutes } from './routes';
import { AppShell } from '../components/layout/AppShell';

interface AppContentProps {
  themeMode: 'light' | 'dark';
  toggleTheme: () => void;
}

const AppContent: React.FC<AppContentProps> = ({ themeMode, toggleTheme }) => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
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
    <Theme system="spectrum" color={themeMode} scale="medium">
      <AuthProvider>
        <DataProvider>
          <SafeRouter>
            <AppContent themeMode={themeMode} toggleTheme={toggleTheme} />
          </SafeRouter>
        </DataProvider>
      </AuthProvider>
    </Theme>
  );
};

export default App;

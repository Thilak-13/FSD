import React from 'react';
import ReactDOM from 'react-dom/client';
import { Theme } from '@swc-react/theme';
import '@spectrum-web-components/theme/theme-light.js';
import '@spectrum-web-components/theme/theme-dark.js';
import '@spectrum-web-components/theme/scale-medium.js';
import '@spectrum-web-components/theme/sp-theme.js';
import './app/index.css';
import { Logo } from './assets/brand/Logo';

export const RootApp: React.FC = () => {
  return (
    <main id="main-content" style={{ padding: '2rem' }}>
      <header>
        <Logo size={48} showText />
      </header>
      <section style={{ marginTop: '1.5rem' }}>
        <h1
          style={{
            fontFamily: 'var(--spectrum-alias-body-text-font-family, "Adobe Clean", sans-serif)',
            color: 'var(--spectrum-global-color-gray-900, #2c2c2c)',
            fontSize: 'var(--spectrum-alias-font-size-heading, 20px)',
          }}
        >
          Invoice Verification & Vendor Payment Platform
        </h1>
        <p
          style={{
            color: 'var(--spectrum-global-color-gray-700, #6e6e6e)',
            fontSize: 'var(--spectrum-alias-font-size-default, 14px)',
          }}
        >
          Platform scaffolding and Adobe Spectrum Web Components initialized.
        </p>
      </section>
    </main>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <Theme system="spectrum" color="light" scale="medium">
        <RootApp />
      </Theme>
    </React.StrictMode>
  );
}

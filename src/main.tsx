import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProviders } from '@/app/providers/AppProviders';
import { AppRouter } from '@/app/router/AppRouter';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import '@/styles/global.css';
import '@/styles/marketing-scope.css';
import '@/styles/ui-polish.css';
import '@/styles/mobile-overhaul-fixes.css';
import '@/styles/runtime-mobile-hotfix.css';
import '@/styles/report-logo-and-settings-fixes.css';
import '@/styles/premium-mobile-theme.css';
import '@/styles/premium-dashboard-reference.css';
import '@/styles/premium-tile-reference.css';
import '@/styles/premium-app-consistency.css';
import { installFrontendEnglish } from '@/lib/frontend-english';
import { initSentry } from '@/lib/sentry';

void initSentry();
installFrontendEnglish();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </ErrorBoundary>
  </React.StrictMode>,
);

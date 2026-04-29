import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProviders } from '@/app/providers/AppProviders';
import { AppRouter } from '@/app/router/AppRouter';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import '@/styles/global.css';
import '@/styles/marketing-scope.css';
import '@/styles/ui-polish.css';
import '@/styles/mobile-overhaul-fixes.css';
import { installFrontendEnglish } from '@/lib/frontend-english';

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

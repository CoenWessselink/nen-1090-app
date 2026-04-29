import { Navigate } from 'react-router-dom';
import { AppShell } from '@/app/layout/AppShell';
import { ProtectedRoute } from '@/app/router/ProtectedRoute';
import { MobileDashboardPage } from '@/features/mobile/MobileDashboardPage';
import { MobileProjectsPage } from '@/features/mobile/MobileProjectsPage';
import BillingPage from '@/features/billing/BillingPage';
import BillingSuccessPage from '@/features/billing/BillingSuccessPage';
import LoginPage from '@/features/auth/LoginPage';

// FIX: restore appRouteMeta for components that depend on it
export const appRouteMeta = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/projecten', label: 'Projecten' },
  { path: '/billing', label: 'Billing' }
];

export const routerConfig = [
  { path: '/login', element: <LoginPage /> },
  { path: '/billing/success', element: <BillingSuccessPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <MobileDashboardPage /> },
      { path: 'projecten', element: <MobileProjectsPage /> },
      { path: 'billing', element: <BillingPage /> }
    ]
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> }
];

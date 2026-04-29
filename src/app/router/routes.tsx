import { Navigate } from 'react-router-dom';
import { AppShell } from '@/app/layout/AppShell';
import { ProtectedRoute } from '@/app/router/ProtectedRoute';
import { MobileDashboardPage } from '@/features/mobile/MobileDashboardPage';
import { MobileProjectsPage } from '@/features/mobile/MobileProjectsPage';
import BillingPage from '@/features/billing/BillingPage';
import BillingSuccessPage from '@/features/billing/BillingSuccessPage';
import LoginPage from '@/features/auth/LoginPage';

// FIX: full meta type to satisfy all components using it
export type AppRouteMeta = {
  path: string;
  label: string;
  icon?: any;
  roles?: string[];
  showInSidebar?: boolean;
  description?: string;
  keywords?: string[];
};

export const appRouteMeta: AppRouteMeta[] = [
  { path: '/dashboard', label: 'Dashboard', showInSidebar: true },
  { path: '/projecten', label: 'Projecten', showInSidebar: true },
  { path: '/billing', label: 'Billing', showInSidebar: true }
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

import { Navigate } from 'react-router-dom';
import { AppShell } from '@/app/layout/AppShell';
import { ProtectedRoute } from '@/app/router/ProtectedRoute';
import { MobileDashboardPage } from '@/features/mobile/MobileDashboardPage';
import { MobileProjectsPage } from '@/features/mobile/MobileProjectsPage';
import BillingPage from '@/features/billing/BillingPage';
import BillingSuccessPage from '@/features/billing/BillingSuccessPage';
import LoginPage from '@/features/auth/LoginPage';
import ActivateAccountPage from '@/features/auth/ActivateAccountPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import SuperadminBillingPage from '@/features/superadmin/SuperadminBillingPage';

// 🔴 CRITICAL FIX: restore appRouteMeta (used in multiple components)
export const appRouteMeta = [
  { path: '/dashboard', label: 'Dashboard', showInSidebar: true },
  { path: '/projecten', label: 'Projecten', showInSidebar: true },
  { path: '/billing', label: 'Billing', showInSidebar: true },
  { path: '/superadmin/billing', label: 'Superadmin Billing', showInSidebar: false }
];

export const routerConfig = [
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/activate', element: <ActivateAccountPage /> },
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
      { path: 'billing', element: <BillingPage /> },
      { path: 'superadmin/billing', element: <SuperadminBillingPage /> }
    ]
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> }
];

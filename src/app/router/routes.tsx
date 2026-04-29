import { Navigate } from 'react-router-dom';
import type { ComponentType } from 'react';
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

type RouteIcon = ComponentType<{ size?: number | string; className?: string }>;

export type AppRouteMeta = {
  path: string;
  label: string;
  icon?: RouteIcon;
  roles?: string[];
  showInSidebar?: boolean;
  description?: string;
  keywords?: string[];
};

export const appRouteMeta: AppRouteMeta[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    showInSidebar: true,
    description: 'Operationeel overzicht',
    keywords: ['dashboard', 'home', 'overzicht'],
  },
  {
    path: '/projecten',
    label: 'Projecten',
    showInSidebar: true,
    description: 'Projecten, lassen en Project 360',
    keywords: ['projecten', 'lassen', 'project 360'],
  },
  {
    path: '/billing',
    label: 'Billing',
    showInSidebar: true,
    roles: ['tenant_admin', 'platform_admin', 'superadmin', 'admin'],
    description: 'Abonnement, betalingen, facturen en seats',
    keywords: ['billing', 'facturatie', 'mollie', 'betaling'],
  },
  {
    path: '/superadmin/billing',
    label: 'Superadmin Billing',
    showInSidebar: false,
    roles: ['platform_admin', 'superadmin'],
    description: 'MRR, ARR, payments, invoices en tenant billing status',
    keywords: ['superadmin', 'billing', 'mrr', 'arr', 'revenue'],
  },
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
      { path: 'superadmin/billing', element: <SuperadminBillingPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
];

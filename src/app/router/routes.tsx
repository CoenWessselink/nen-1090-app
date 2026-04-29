import { Navigate } from 'react-router-dom';
import type { ComponentType } from 'react';
import { LayoutDashboard, FolderKanban, ClipboardCheck, FileText, Settings, CreditCard, Shield } from 'lucide-react';
import { AppShell } from '@/app/layout/AppShell';
import { ProtectedRoute } from '@/app/router/ProtectedRoute';
import { MobileDashboardPage } from '@/features/mobile/MobileDashboardPage';
import { MobileProjectsPage } from '@/features/mobile/MobileProjectsPage';
import { MobileWeldsPage } from '@/features/mobile/MobileWeldsPage';
import { MobileRapportagePage } from '@/features/mobile/MobileRapportagePage';
import { MobileCeDossierPage } from '@/features/mobile/MobileCeDossierPage';
import { InstellingenPage } from '@/features/instellingen/InstellingenPage';
import { SuperadminPage } from '@/features/superadmin/SuperadminPage';
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
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, showInSidebar: true, description: 'Operationeel overzicht', keywords: ['dashboard', 'home', 'overzicht'] },
  { path: '/projecten', label: 'Projects', icon: FolderKanban, showInSidebar: true, description: 'Projecten, lassen en Project 360', keywords: ['projecten', 'projects', 'lassen', 'project 360'] },
  { path: '/lascontrole', label: 'Lascontrole', icon: ClipboardCheck, showInSidebar: true, description: 'Lascontrole, inspecties en weld-first workflow', keywords: ['lascontrole', 'welds', 'lassen', 'inspectie'] },
  { path: '/rapportage', label: 'Reports', icon: FileText, showInSidebar: true, description: 'Rapportage en CE dossier routes', keywords: ['rapportage', 'reports', 'ce', 'dossier'] },
  { path: '/instellingen', label: 'Settings', icon: Settings, showInSidebar: true, description: 'Masterdata, inspectietemplates en instellingen', keywords: ['instellingen', 'settings', 'masterdata'] },
  { path: '/billing', label: 'Billing', icon: CreditCard, showInSidebar: true, roles: ['tenant_admin', 'platform_admin', 'superadmin', 'admin'], description: 'Abonnement, betalingen, facturen en seats', keywords: ['billing', 'facturatie', 'mollie', 'betaling'] },
  { path: '/superadmin', label: 'Superadmin', icon: Shield, showInSidebar: false, roles: ['platform_admin', 'superadmin'], description: 'Platformbeheer en tenantbeheer', keywords: ['superadmin', 'platform', 'tenants'] },
  { path: '/superadmin/billing', label: 'Superadmin Billing', icon: CreditCard, showInSidebar: false, roles: ['platform_admin', 'superadmin'], description: 'MRR, ARR, payments, invoices en tenant billing status', keywords: ['superadmin', 'billing', 'mrr', 'arr', 'revenue'] },
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
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <MobileDashboardPage /> },
      { path: 'projecten', element: <MobileProjectsPage /> },
      { path: 'projects', element: <Navigate to="/projecten" replace /> },
      { path: 'lascontrole', element: <MobileWeldsPage /> },
      { path: 'lassen', element: <MobileWeldsPage /> },
      { path: 'rapportage', element: <MobileRapportagePage /> },
      { path: 'reports', element: <MobileRapportagePage /> },
      { path: 'ce-dossier', element: <MobileCeDossierPage /> },
      { path: 'instellingen', element: <InstellingenPage /> },
      { path: 'settings', element: <InstellingenPage /> },
      { path: 'billing', element: <BillingPage /> },
      { path: 'superadmin', element: <SuperadminPage /> },
      { path: 'superadmin/billing', element: <SuperadminBillingPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
];

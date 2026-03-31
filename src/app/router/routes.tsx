import { Building2, CreditCard, FileCheck2, FolderKanban, LayoutDashboard, Settings } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { AppShell } from '@/app/layout/AppShell';
import { ProtectedRoute } from '@/app/router/ProtectedRoute';
import { RoleGuard } from '@/app/router/RoleGuard';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { Project360Page } from '@/features/projecten/Project360Page';
import { ProjectenPage } from '@/features/projecten/ProjectenPage';
import { LascontrolePage } from '@/features/lascontrole/LascontrolePage';
import { CeDossierPage } from '@/features/ce-dossier/CeDossierPage';
import { RapportagePage } from '@/features/rapportage/RapportagePage';
import { InstellingenPage } from '@/features/instellingen/InstellingenPage';
import { SuperadminPage } from '@/features/superadmin/SuperadminPage';
import { BillingPage } from '@/features/billing/BillingPage';
import LoginPage from '@/features/auth/LoginPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { LogoutPage } from '@/features/auth/LogoutPage';
import { ChangePasswordPage } from '@/features/auth/ChangePasswordPage';

const Login = LoginPage;

export type AppRouteMeta = {
  path: string;
  label: string;
  icon?: typeof LayoutDashboard;
  description: string;
  roles?: string[];
  showInSidebar?: boolean;
  keywords?: string[];
};

export const appRouteMeta: AppRouteMeta[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Operationeel overzicht en projectnavigatie', showInSidebar: true, keywords: ['kpi', 'overzicht', 'home'] },
  { path: '/projecten', label: 'Projecten', icon: FolderKanban, description: 'Projectlijst en Project 360', showInSidebar: true, keywords: ['project', 'assemblies', 'lassen', 'documenten'] },
  { path: '/rapportage', label: 'Rapportage', icon: FileCheck2, description: 'Rapportages, exports en managementoverzicht', showInSidebar: true, keywords: ['rapporten', 'status', 'audit'] },
  { path: '/billing', label: 'Billing', icon: CreditCard, description: 'Abonnement, betalingen en planwissels', roles: ['SUPERADMIN', 'ADMIN', 'TenantAdmin'], showInSidebar: true, keywords: ['billing', 'mollie', 'betaling', 'subscription'] },
  { path: '/instellingen', label: 'Instellingen', icon: Settings, description: 'Tenant-, security- en integratie-instellingen', showInSidebar: true, keywords: ['tenant', 'security', 'integraties', 'wps', 'materials', 'welders'] },
  { path: '/superadmin', label: 'Superadmin', icon: Building2, description: 'Tenant-overzicht en platformbeheer', roles: ['SUPERADMIN', 'ADMIN'], showInSidebar: true, keywords: ['tenants', 'beheer', 'billing'] },
];

export const routerConfig = [
  { path: '/login', element: <Login /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/logout', element: <LogoutPage /> },
  { path: '/change-password', element: <ChangePasswordPage /> },
  { path: '/app/login', element: <Navigate to="/login" replace /> },
  { path: '/app/forgot-password', element: <Navigate to="/forgot-password" replace /> },
  { path: '/app/reset-password', element: <Navigate to="/reset-password" replace /> },
  { path: '/app/logout', element: <Navigate to="/logout" replace /> },
  { path: '/app/change-password', element: <Navigate to="/change-password" replace /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'projecten', element: <ProjectenPage /> },
      { path: 'projecten/:projectId', element: <Navigate to="overzicht" replace /> },
      { path: 'projecten/:projectId/overzicht', element: <Project360Page /> },
      { path: 'projecten/:projectId/assemblies', element: <Project360Page /> },
      { path: 'projecten/:projectId/assemblies/:assemblyId', element: <Project360Page /> },
      { path: 'projecten/:projectId/lassen', element: <Project360Page /> },
      { path: 'projecten/:projectId/lassen/:weldId', element: <Project360Page /> },
      { path: 'projecten/:projectId/documenten', element: <Project360Page /> },
      { path: 'projecten/:projectId/historie', element: <Project360Page /> },
      { path: 'projecten/:projectId/lascontrole', element: <LascontrolePage /> },
      { path: 'projecten/:projectId/ce-dossier', element: <CeDossierPage /> },
      { path: 'lascontrole', element: <Navigate to="/projecten" replace /> },
      { path: 'ce-dossier', element: <Navigate to="/projecten" replace /> },
      { path: 'planning', element: <Navigate to="/projecten" replace /> },
      { path: 'rapportage', element: <RapportagePage /> },
      { path: 'billing', element: <BillingPage /> },
      { path: 'instellingen', element: <InstellingenPage /> },
      { path: 'superadmin', element: <RoleGuard allow={['SUPERADMIN', 'ADMIN']}><SuperadminPage /></RoleGuard> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
];


import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Building2,
  ClipboardCheck,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  Settings,
  Shield,
} from 'lucide-react';
import type { RouteObject } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { AppShell } from '@/app/layout/AppShell';
import { ProtectedRoute } from '@/app/router/ProtectedRoute';
import { ProjectScopedRoute } from '@/app/router/ProjectScopedRoute';
import LoginPage from '@/features/auth/LoginPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { ChangePasswordPage } from '@/features/auth/ChangePasswordPage';
import { LogoutPage } from '@/features/auth/LogoutPage';
import DashboardPage from '@/features/dashboard/DashboardPage';
import { ProjectenPage } from '@/features/projecten/ProjectenPage';
import { Project360Page } from '@/features/projecten/Project360Page';
import { LascontrolePage } from '@/features/lascontrole/LascontrolePage';
import { CeDossierPage } from '@/features/ce-dossier/CeDossierPage';
import RapportagePage from '@/features/rapportage/RapportagePage';
import { InstellingenPage } from '@/features/instellingen/InstellingenPage';
import { InspectionTemplatesPage } from '@/features/instellingen/InspectionTemplatesPage';
import { BillingPage } from '@/features/billing/BillingPage';
import { SuperadminPage } from '@/features/superadmin/SuperadminPage';

export type AppRouteMeta = {
  path: string;
  label: string;
  description?: string;
  keywords?: string[];
  showInSidebar?: boolean;
  roles?: string[];
  icon?: LucideIcon;
};

export const appRouteMeta: AppRouteMeta[] = [
  { path: '/dashboard', label: 'Dashboard', description: 'Hoofdoverzicht van het platform', keywords: ['home', 'overview', 'dashboard'], showInSidebar: true, icon: LayoutDashboard },
  { path: '/projecten', label: 'Projecten', description: 'Projecten en projectdetail', keywords: ['projecten', 'project', 'project 360'], showInSidebar: true, icon: FolderKanban },
  { path: '/lascontrole', label: 'Lascontrole', description: 'Inspecties, afwijkingen en lassen', keywords: ['lascontrole', 'lassen', 'inspecties'], showInSidebar: true, icon: ClipboardCheck },
  { path: '/ce-dossier', label: 'CE dossier', description: 'CE documentatie en export', keywords: ['ce', 'dossier', 'export'], showInSidebar: true, icon: Shield },
  { path: '/rapportage', label: 'Rapportage', description: 'Rapportages en overzichten', keywords: ['rapportage', 'reports'], showInSidebar: true, icon: BarChart3 },
  { path: '/instellingen', label: 'Instellingen', description: 'Masterdata en configuratie', keywords: ['instellingen', 'settings', 'masterdata'], showInSidebar: true, icon: Settings },
  { path: '/billing', label: 'Billing', description: 'Abonnement en facturatie', keywords: ['billing', 'abonnement', 'facturen'], showInSidebar: true, icon: CreditCard },
  { path: '/superadmin', label: 'Superadmin', description: 'Tenant- en platformbeheer', keywords: ['superadmin', 'tenant', 'beheer'], showInSidebar: true, icon: Building2 },
];

const protectedElement = (element: React.ReactNode) => (
  <ProtectedRoute>
    <AppShell>{element}</AppShell>
  </ProtectedRoute>
);

export const routerConfig: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/change-password', element: <ChangePasswordPage /> },
  { path: '/logout', element: <LogoutPage /> },

  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '/dashboard', element: protectedElement(<DashboardPage />) },
  { path: '/projecten', element: protectedElement(<ProjectenPage />) },
  { path: '/lascontrole', element: protectedElement(<LascontrolePage />) },
  { path: '/ce-dossier', element: protectedElement(<Navigate to="/projecten" replace />) },
  { path: '/rapportage', element: protectedElement(<RapportagePage />) },
  { path: '/instellingen', element: protectedElement(<InstellingenPage />) },
  { path: '/instellingen/templates', element: protectedElement(<InspectionTemplatesPage />) },
  { path: '/billing', element: protectedElement(<BillingPage />) },
  { path: '/superadmin', element: protectedElement(<SuperadminPage />) },

  {
    path: '/projecten/:projectId',
    element: (
      <ProtectedRoute>
        <ProjectScopedRoute />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="overzicht" replace /> },
      { path: 'overzicht', element: protectedElement(<Project360Page />) },
      { path: 'assemblies', element: protectedElement(<Project360Page />) },
      { path: 'lassen', element: protectedElement(<Project360Page />) },
      { path: 'lascontrole', element: protectedElement(<Project360Page />) },
      { path: 'documenten', element: protectedElement(<Project360Page />) },
      { path: 'ce-dossier', element: protectedElement(<CeDossierPage />) },
      { path: 'historie', element: protectedElement(<Project360Page />) },
    ],
  },

  { path: '*', element: <Navigate to="/dashboard" replace /> },
];

export const routes = routerConfig;

import { Building2, CalendarRange, CreditCard, FileBadge, FileCheck2, FolderKanban, LayoutDashboard, Settings, ShieldCheck } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { AppShell } from '@/app/layout/AppShell';
import { ProtectedRoute } from '@/app/router/ProtectedRoute';
import { RoleGuard } from '@/app/router/RoleGuard';
import { ProjectScopedRoute } from '@/app/router/ProjectScopedRoute';
import { AuthRedirectPage } from '@/features/auth/AuthRedirectPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { ProjectenPage } from '@/features/projecten/ProjectenPage';
import { LascontrolePage } from '@/features/lascontrole/LascontrolePage';
import { CeDossierPage } from '@/features/ce-dossier/CeDossierPage';
import { PlanningPage } from '@/features/planning/PlanningPage';
import { RapportagePage } from '@/features/rapportage/RapportagePage';
import { InstellingenPage } from '@/features/instellingen/InstellingenPage';
import { SuperadminPage } from '@/features/superadmin/SuperadminPage';
import { BillingPage } from '@/features/billing/BillingPage';

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
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Operationeel overzicht, KPI’s en recente activiteit',
    showInSidebar: true,
    keywords: ['kpi', 'overzicht', 'home'],
  },
  {
    path: '/projecten',
    label: 'Projecten',
    icon: FolderKanban,
    description: 'Zoek, filter en beheer projecten',
    showInSidebar: true,
    keywords: ['project', 'opdrachtgever', 'planning', 'assemblies'],
  },
  {
    path: '/lascontrole',
    label: 'Lascontrole',
    icon: ShieldCheck,
    description: 'Inspecties, afwijkingen en opvolging',
    showInSidebar: true,
    keywords: ['lassen', 'inspectie', 'ndt', 'defecten'],
  },
  {
    path: '/ce-dossier',
    label: 'CE Dossier',
    icon: FileBadge,
    description: 'Checklist, documentatie en export',
    showInSidebar: true,
    keywords: ['ce', 'documenten', 'export', 'compliance'],
  },
  {
    path: '/planning',
    label: 'Planning',
    icon: CalendarRange,
    description: 'Capaciteit, volgorde en voortgang',
    showInSidebar: true,
    keywords: ['planning', 'capaciteit', 'resources'],
  },
  {
    path: '/rapportage',
    label: 'Rapportage',
    icon: FileCheck2,
    description: 'Rapportages, exports en managementoverzicht',
    showInSidebar: true,
    keywords: ['rapporten', 'status', 'audit'],
  },
  {
    path: '/billing',
    label: 'Billing',
    icon: CreditCard,
    description: 'Abonnement, betalingen en planwissels',
    roles: ['SUPERADMIN', 'ADMIN', 'TenantAdmin'],
    showInSidebar: true,
    keywords: ['billing', 'mollie', 'betaling', 'subscription'],
  },

  {
    path: '/instellingen',
    label: 'Instellingen',
    icon: Settings,
    description: 'Tenant-, security- en integratie-instellingen',
    showInSidebar: true,
    keywords: ['tenant', 'security', 'integraties', 'wps', 'materials', 'welders'],
  },
  {
    path: '/superadmin',
    label: 'Superadmin',
    icon: Building2,
    description: 'Tenant-overzicht, health en impersonatie',
    roles: ['SUPERADMIN', 'ADMIN'],
    showInSidebar: true,
    keywords: ['tenants', 'beheer', 'health', 'billing'],
  },
];

export const routerConfig = [
  {
    path: '/login',
    element: <AuthRedirectPage target="login" title="Inloggen via centrale auth" description="De app gebruikt vanaf fase 1 de marketing/auth-shell als enige publieke login." includeNext={false} />,
  },
  {
    path: '/forgot-password',
    element: <AuthRedirectPage target="forgot-password" title="Wachtwoord reset aanvragen" description="Deze flow draait voortaan in de centrale marketing/auth-shell." includeNext={false} />,
  },
  {
    path: '/reset-password',
    element: <AuthRedirectPage target="reset-password" title="Nieuw wachtwoord instellen" description="Resetlinks landen voortaan in de centrale marketing/auth-shell." includeNext={false} />,
  },
  {
    path: '/logout',
    element: <AuthRedirectPage target="logout" title="Uitloggen via centrale auth" description="Uitloggen wordt centraal afgehandeld zodat app en marketing dezelfde sessielaag gebruiken." includeNext={false} />,
  },
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
      {
        path: 'projecten/:projectId',
        element: <ProjectScopedRoute />,
        children: [
          { index: true, element: <ProjectenPage /> },
          { path: 'welds', element: <LascontrolePage /> },
          { path: 'ce-dossier', element: <CeDossierPage /> },
        ],
      },
      { path: 'lascontrole', element: <LascontrolePage /> },
      { path: 'ce-dossier', element: <CeDossierPage /> },
      { path: 'planning', element: <PlanningPage /> },
      { path: 'rapportage', element: <RapportagePage /> },
      { path: 'instellingen', element: <InstellingenPage /> },
      {
        path: 'change-password',
        element: <AuthRedirectPage target="change-password" title="Wachtwoord wijzigen" description="Beveiligingsinstellingen verlopen in fase 1 via de centrale marketing/auth-shell." includeNext={false} />,
      },
      {
        path: 'billing',
        element: (
          <RoleGuard allow={['SUPERADMIN', 'ADMIN', 'TenantAdmin']}>
            <BillingPage />
          </RoleGuard>
        ),
      },
      {
        path: 'superadmin',
        element: (
          <RoleGuard allow={['SUPERADMIN', 'ADMIN']}>
            <SuperadminPage />
          </RoleGuard>
        ),
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
];

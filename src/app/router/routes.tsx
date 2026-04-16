import { Building2, CreditCard, FileCheck2, FolderKanban, LayoutDashboard, Settings } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { AppShell } from '@/app/layout/AppShell';
import { ProtectedRoute } from '@/app/router/ProtectedRoute';
import { RoleGuard } from '@/app/router/RoleGuard';
import { MobileDashboardPage } from '@/features/mobile/MobileDashboardPage';
import { MobileProjectsPage } from '@/features/mobile/MobileProjectsPage';
import { MobileProject360Page } from '@/features/mobile/MobileProject360Page';
import { MobileProjectCreatePage } from '@/features/mobile/MobileProjectCreatePage';
import { MobileWeldsPage } from '@/features/mobile/MobileWeldsPage';
import { MobileWeldCreatePage } from '@/features/mobile/MobileWeldCreatePage';
import { MobileWeldEditPage } from '@/features/mobile/MobileWeldEditPage';
import { MobileAssemblyCreatePage } from '@/features/mobile/MobileAssemblyCreatePage';
import { MobileInspectionPage } from '@/features/mobile/MobileInspectionPage';
import { MobileDocumentsPage } from '@/features/mobile/MobileDocumentsPage';
import { MobileCeDossierPage } from '@/features/mobile/MobileCeDossierPage';
import { MobilePdfViewerPage } from '@/features/mobile/MobilePdfViewerPage';
import { MobileRapportagePage } from '@/features/mobile/MobileRapportagePage';
import { InstellingenPage } from '@/features/instellingen/InstellingenPage';
import { InspectionTemplatesPage } from '@/features/instellingen/InspectionTemplatesPage';
import { SuperadminPage } from '@/features/superadmin/SuperadminPage';
import { BillingPage } from '@/features/billing/BillingPage';
import LoginPage from '@/features/auth/LoginPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { LogoutPage } from '@/features/auth/LogoutPage';
import { ChangePasswordPage } from '@/features/auth/ChangePasswordPage';

const Login = LoginPage;
const SUPERADMIN_ALLOWED_ROLES = ['SUPERADMIN', 'SUPER_ADMIN', 'ADMIN', 'PLATFORM_ADMIN', 'PLATFORMADMIN', 'platform_admin'];

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
  { path: '/billing', label: 'Billing', icon: CreditCard, description: 'Abonnement, betalingen en planwissels', roles: ['SUPERADMIN', 'SUPER_ADMIN', 'ADMIN', 'TenantAdmin', 'PLATFORM_ADMIN', 'platform_admin'], showInSidebar: true, keywords: ['billing', 'mollie', 'betaling', 'subscription'] },
  { path: '/instellingen', label: 'Instellingen', icon: Settings, description: 'Tenant-, security- en integratie-instellingen', showInSidebar: true, keywords: ['tenant', 'security', 'integraties', 'wps', 'materials', 'welders'] },
  { path: '/superadmin', label: 'Superadmin', icon: Building2, description: 'Tenant-overzicht en platformbeheer', roles: SUPERADMIN_ALLOWED_ROLES, showInSidebar: true, keywords: ['tenants', 'beheer', 'billing', 'platform', 'tenantbeheer'] },
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
      { path: 'dashboard', element: <MobileDashboardPage /> },
      { path: 'projecten', element: <MobileProjectsPage /> },
      { path: 'projecten/nieuw', element: <MobileProjectCreatePage /> },
      { path: 'projecten/:projectId/bewerken', element: <MobileProjectCreatePage /> },
      { path: 'projecten/:projectId', element: <Navigate to="overzicht" replace /> },
      { path: 'projecten/:projectId/overzicht', element: <MobileProject360Page /> },
      { path: 'projecten/:projectId/assemblies', element: <Navigate to="nieuw" replace /> },
      { path: 'projecten/:projectId/assemblies/nieuw', element: <MobileAssemblyCreatePage /> },
      { path: 'projecten/:projectId/assemblies/:assemblyId', element: <Navigate to="../../overzicht" replace /> },
      { path: 'projecten/:projectId/lassen', element: <MobileWeldsPage /> },
      { path: 'projecten/:projectId/lassen/nieuw', element: <MobileWeldCreatePage /> },
      { path: 'lassen/nieuw', element: <MobileWeldCreatePage /> },
      { path: 'projecten/:projectId/lassen/:weldId', element: <Navigate to="inspectie" replace /> },
      { path: 'projecten/:projectId/lassen/:weldId/bewerken', element: <MobileWeldEditPage /> },
      { path: 'projecten/:projectId/lassen/:weldId/inspectie', element: <MobileInspectionPage /> },
      { path: 'projecten/:projectId/documenten', element: <MobileDocumentsPage /> },
      { path: 'projecten/:projectId/documenten/:documentId/viewer', element: <MobilePdfViewerPage /> },
      { path: 'projecten/:projectId/historie', element: <Navigate to="../overzicht" replace /> },
      { path: 'projecten/:projectId/lascontrole', element: <Navigate to="../lassen" replace /> },
      { path: 'projecten/:projectId/ce-dossier', element: <MobileCeDossierPage /> },
      { path: 'projecten/:projectId/pdf-viewer', element: <MobilePdfViewerPage /> },
      { path: 'lascontrole', element: <Navigate to="/projecten" replace /> },
      { path: 'ce-dossier', element: <Navigate to="/projecten" replace /> },
      { path: 'planning', element: <Navigate to="/projecten" replace /> },
      { path: 'rapportage', element: <MobileRapportagePage /> },
      { path: 'billing', element: <BillingPage /> },
      { path: 'instellingen', element: <InstellingenPage /> },
      { path: 'instellingen/templates', element: <InspectionTemplatesPage /> },
      { path: 'superadmin', element: <RoleGuard allow={SUPERADMIN_ALLOWED_ROLES}><SuperadminPage /></RoleGuard> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
];

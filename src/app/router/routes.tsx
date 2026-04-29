import { Building2, CreditCard, FileCheck2, FolderKanban, LayoutDashboard, Settings } from 'lucide-react';
import type { ComponentType } from 'react';
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
import { MobileDocumentsPage } from '@/features/mobile/MobileDocumentsPage';
import { MobileCeDossierPage } from '@/features/mobile/MobileCeDossierPage';
import { MobilePdfViewerPage } from '@/features/mobile/MobilePdfViewerPage';
import { MobileRapportagePage } from '@/features/mobile/MobileRapportagePage';
import { InstellingenPage } from '@/features/instellingen/InstellingenPage';
import { InspectionTemplatesPage } from '@/features/instellingen/InspectionTemplatesPage';
import { NormsSettingsPage } from '@/features/instellingen/NormsSettingsPage';
import { WeldInspectionDetailPage } from '@/features/welds/WeldInspectionDetailPage';
import { SuperadminPage } from '@/features/superadmin/SuperadminPage';
import TenantProfilePage from '@/features/superadmin/TenantProfilePage';
import BillingPage from '@/features/billing/BillingPage';
import BillingSuccessPage from '@/features/billing/BillingSuccessPage';
import SuperadminBillingPage from '@/features/superadmin/SuperadminBillingPage';
import LoginPage from '@/features/auth/LoginPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { LogoutPage } from '@/features/auth/LogoutPage';
import { ChangePasswordPage } from '@/features/auth/ChangePasswordPage';
import { ActivateAccountPage } from '@/features/auth/ActivateAccountPage';

const SUPERADMIN_ALLOWED_ROLES = ['SUPERADMIN', 'SUPER_ADMIN', 'ADMIN', 'PLATFORM_ADMIN', 'PLATFORMADMIN', 'platform_admin', 'superadmin'];
type RouteIcon = ComponentType<{ size?: number | string; className?: string }>;

export type AppRouteMeta = {
  path: string;
  label: string;
  icon?: RouteIcon;
  description: string;
  roles?: string[];
  showInSidebar?: boolean;
  keywords?: string[];
};

export const appRouteMeta: AppRouteMeta[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Operationeel overzicht', showInSidebar: true, keywords: ['dashboard', 'home'] },
  { path: '/projecten', label: 'Projects', icon: FolderKanban, description: 'Projectlijst en Project 360', showInSidebar: true, keywords: ['projecten', 'projects'] },
  { path: '/rapportage', label: 'Reports', icon: FileCheck2, description: 'Rapportage en CE dossier', showInSidebar: true, keywords: ['rapportage', 'reports', 'ce'] },
  { path: '/instellingen', label: 'Settings', icon: Settings, description: 'Instellingen en masterdata', showInSidebar: true, keywords: ['instellingen', 'settings'] },
  { path: '/billing', label: 'Billing', icon: CreditCard, description: 'Billing en abonnement', roles: SUPERADMIN_ALLOWED_ROLES, showInSidebar: true, keywords: ['billing', 'mollie'] },
  { path: '/superadmin', label: 'Superadmin', icon: Building2, description: 'Platformbeheer', roles: SUPERADMIN_ALLOWED_ROLES, showInSidebar: true, keywords: ['superadmin', 'platform'] },
];

export const routerConfig = [
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/set-password', element: <Navigate to="/activate-account" replace /> },
  { path: '/activate-account', element: <ActivateAccountPage /> },
  { path: '/activate', element: <ActivateAccountPage /> },
  { path: '/logout', element: <LogoutPage /> },
  { path: '/change-password', element: <ChangePasswordPage /> },
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
      { path: 'projecten/nieuw', element: <MobileProjectCreatePage /> },
      { path: 'projecten/:projectId/bewerken', element: <MobileProjectCreatePage /> },
      { path: 'projecten/:projectId', element: <Navigate to="overzicht" replace /> },
      { path: 'projecten/:projectId/overzicht', element: <MobileProject360Page /> },
      { path: 'projecten/:projectId/assemblies', element: <Navigate to="nieuw" replace /> },
      { path: 'projecten/:projectId/assemblies/nieuw', element: <MobileAssemblyCreatePage /> },
      { path: 'projecten/:projectId/lassen', element: <MobileWeldsPage /> },
      { path: 'projecten/:projectId/lascontrole', element: <Navigate to="../lassen" replace /> },
      { path: 'projecten/:projectId/lassen/nieuw', element: <MobileWeldCreatePage /> },
      { path: 'lassen/nieuw', element: <MobileWeldCreatePage /> },
      { path: 'projecten/:projectId/lassen/:weldId', element: <Navigate to="inspectie" replace /> },
      { path: 'projecten/:projectId/lassen/:weldId/bewerken', element: <MobileWeldEditPage /> },
      { path: 'projecten/:projectId/lassen/:weldId/inspectie', element: <WeldInspectionDetailPage /> },
      { path: 'projecten/:projectId/documenten', element: <MobileDocumentsPage /> },
      { path: 'projecten/:projectId/documenten/:documentId/viewer', element: <MobilePdfViewerPage /> },
      { path: 'projecten/:projectId/ce-dossier', element: <MobileCeDossierPage /> },
      { path: 'projecten/:projectId/pdf-viewer', element: <MobilePdfViewerPage /> },
      { path: 'lascontrole', element: <Navigate to="/projecten" replace /> },
      { path: 'planning', element: <Navigate to="/projecten" replace /> },
      { path: 'ce-dossier', element: <Navigate to="/projecten" replace /> },
      { path: 'rapportage', element: <MobileRapportagePage /> },
      { path: 'reports', element: <Navigate to="/rapportage" replace /> },
      { path: 'instellingen', element: <InstellingenPage /> },
      { path: 'settings', element: <Navigate to="/instellingen" replace /> },
      { path: 'instellingen/templates', element: <InspectionTemplatesPage /> },
      { path: 'instellingen/normeringen', element: <NormsSettingsPage /> },
      { path: 'billing', element: <BillingPage /> },
      { path: 'superadmin', element: <RoleGuard allow={SUPERADMIN_ALLOWED_ROLES}><SuperadminPage /></RoleGuard> },
      { path: 'superadmin/billing', element: <RoleGuard allow={SUPERADMIN_ALLOWED_ROLES}><SuperadminBillingPage /></RoleGuard> },
      { path: 'superadmin/tenant/:tenantId/profile', element: <RoleGuard allow={SUPERADMIN_ALLOWED_ROLES}><TenantProfilePage /></RoleGuard> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
];

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
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Operationeel overzicht', showInSidebar: true },
  { path: '/projecten', label: 'Projects', icon: FolderKanban, description: 'Projectlijst en Project 360', showInSidebar: true },
  { path: '/rapportage', label: 'Reports', icon: FileCheck2, description: 'Rapportage en CE dossier', showInSidebar: true },
  { path: '/instellingen', label: 'Settings', icon: Settings, description: 'Instellingen en masterdata', showInSidebar: true },
  { path: '/billing', label: 'Billing', icon: CreditCard, description: 'Billing en abonnement', roles: SUPERADMIN_ALLOWED_ROLES, showInSidebar: true },
  { path: '/superadmin', label: 'Superadmin', icon: Building2, description: 'Platformbeheer', roles: SUPERADMIN_ALLOWED_ROLES, showInSidebar: true },
];

export const routerConfig = [
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/activate-account', element: <ActivateAccountPage /> },
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
      { path: 'projecten/:projectId/overzicht', element: <MobileProject360Page /> },
      { path: 'projecten/:projectId/lassen', element: <MobileWeldsPage /> },
      { path: 'projecten/:projectId/lassen/:weldId/inspectie', element: <WeldInspectionDetailPage /> },
      { path: 'rapportage', element: <MobileRapportagePage /> },
      { path: 'ce-dossier', element: <MobileCeDossierPage /> },
      { path: 'instellingen', element: <InstellingenPage /> },
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

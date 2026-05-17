import { lazy, type ComponentType } from 'react';

const named = <T extends Record<string, ComponentType<unknown>>>(loader: () => Promise<T>, exportName: keyof T) =>
  lazy(async () => {
    const m = await loader();
    const C = m[exportName] as ComponentType<unknown>;
    return { default: C };
  });

/** Auth & billing: default exports → simple lazy */
export const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage'));
export const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage'));
export const LogoutPage = lazy(() => import('@/features/auth/LogoutPage'));
export const ChangePasswordPage = lazy(() => import('@/features/auth/ChangePasswordPage'));
export const ActivateAccountPage = lazy(() => import('@/features/auth/ActivateAccountPage'));
export const BillingSuccessPage = lazy(() => import('@/features/billing/BillingSuccessPage'));
export const BillingPage = lazy(() => import('@/features/billing/BillingPage'));

/** Mobile & project flows */
export const MobileProjectCreatePage = named(() => import('@/features/mobile/MobileProjectCreatePage'), 'MobileProjectCreatePage');
export const MobileProject360Page = named(() => import('@/features/mobile/MobileProject360Page'), 'MobileProject360Page');
export const MobileAssemblyCreatePage = named(() => import('@/features/mobile/MobileAssemblyCreatePage'), 'MobileAssemblyCreatePage');
export const MobileWeldsPage = named(() => import('@/features/mobile/MobileWeldsPage'), 'MobileWeldsPage');
export const MobileWeldCreatePage = named(() => import('@/features/mobile/MobileWeldCreatePage'), 'MobileWeldCreatePage');
export const MobileWeldEditPage = named(() => import('@/features/mobile/MobileWeldEditPage'), 'MobileWeldEditPage');
export const MobileDocumentsPage = named(() => import('@/features/mobile/MobileDocumentsPage'), 'MobileDocumentsPage');
export const MobileCeDossierPage = named(() => import('@/features/mobile/MobileCeDossierPage'), 'MobileCeDossierPage');
export const MobilePdfViewerPage = named(() => import('@/features/mobile/MobilePdfViewerPage'), 'MobilePdfViewerPage');
export const CeReportPrintPage = named(() => import('@/features/ce-dossier/CeReportPrintPage'), 'CeReportPrintPage');
export const MobileRapportagePage = named(() => import('@/features/mobile/MobileRapportagePage'), 'MobileRapportagePage');

/** Settings */
export const InstellingenPage = named(() => import('@/features/instellingen/InstellingenPage'), 'InstellingenPage');
export const InspectionTemplatesPage = named(
  () => import('@/features/instellingen/InspectionTemplatesPage'),
  'InspectionTemplatesPage',
);
export const NormsSettingsPage = named(() => import('@/features/instellingen/NormsSettingsPage'), 'NormsSettingsPage');

/** Welds & admin */
export const WeldInspectionDetailPage = named(() => import('@/features/welds/WeldInspectionDetailPage'), 'WeldInspectionDetailPage');
export const SuperadminControlCenter = lazy(() => import('@/features/superadmin/SuperadminControlCenter'));
export const TenantProfilePage = lazy(() => import('@/features/superadmin/TenantProfilePage'));

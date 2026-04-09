import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Building2,
  ClipboardCheck,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  Lock,
  RotateCcw,
  Settings,
  Shield,
} from 'lucide-react';
import type { RouteObject } from 'react-router-dom';
import DashboardPage from '@/features/dashboard/DashboardPage';
import RapportagePage from '@/features/rapportage/RapportagePage';
import LoginPage from '@/features/auth/LoginPage';
import ForgotPasswordPage from '@/features/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/features/auth/ResetPasswordPage';
import ChangePasswordPage from '@/features/auth/ChangePasswordPage';
import LogoutPage from '@/features/auth/LogoutPage';

export type AppRouteMeta = {
  path: string;
  label: string;
  description?: string;
  keywords?: string[];
  showInSidebar?: boolean;
  roles?: string[];
  icon?: LucideIcon;
};

const Placeholder = ({ title }: { title: string }) => (
  <div style={{ padding: 24 }}>
    <h1>{title}</h1>
  </div>
);

export const appRouteMeta: AppRouteMeta[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    description: 'Hoofdoverzicht van het platform',
    keywords: ['dashboard', 'overzicht', 'home'],
    showInSidebar: true,
    icon: LayoutDashboard,
  },
  {
    path: '/projecten',
    label: 'Projecten',
    description: 'Projecten en projectdetail',
    keywords: ['projecten', 'project', 'project 360'],
    showInSidebar: true,
    icon: FolderKanban,
  },
  {
    path: '/lascontrole',
    label: 'Lascontrole',
    description: 'Inspecties, afwijkingen en lassen',
    keywords: ['lascontrole', 'lassen', 'inspecties'],
    showInSidebar: true,
    icon: ClipboardCheck,
  },
  {
    path: '/ce-dossier',
    label: 'CE dossier',
    description: 'CE documentatie en export',
    keywords: ['ce dossier', 'ce', 'export'],
    showInSidebar: true,
    icon: Shield,
  },
  {
    path: '/rapportage',
    label: 'Rapportage',
    description: 'Rapportages en overzichten',
    keywords: ['rapportage', 'reports'],
    showInSidebar: true,
    icon: BarChart3,
  },
  {
    path: '/instellingen',
    label: 'Instellingen',
    description: 'Masterdata en configuratie',
    keywords: ['instellingen', 'settings', 'masterdata'],
    showInSidebar: true,
    icon: Settings,
  },
  {
    path: '/billing',
    label: 'Billing',
    description: 'Abonnement en facturatie',
    keywords: ['billing', 'abonnement', 'facturen'],
    showInSidebar: true,
    icon: CreditCard,
  },
  {
    path: '/superadmin',
    label: 'Superadmin',
    description: 'Tenant- en platformbeheer',
    keywords: ['superadmin', 'tenant', 'beheer'],
    showInSidebar: true,
    icon: Building2,
  },
  {
    path: '/login',
    label: 'Login',
    description: 'Inloggen in het platform',
    keywords: ['login', 'aanmelden', 'inloggen'],
    showInSidebar: false,
    icon: Lock,
  },
  {
    path: '/forgot-password',
    label: 'Wachtwoord vergeten',
    description: 'Wachtwoord reset aanvragen',
    keywords: ['forgot password', 'wachtwoord vergeten'],
    showInSidebar: false,
    icon: RotateCcw,
  },
  {
    path: '/reset-password',
    label: 'Reset wachtwoord',
    description: 'Nieuw wachtwoord instellen',
    keywords: ['reset password', 'nieuw wachtwoord'],
    showInSidebar: false,
    icon: RotateCcw,
  },
  {
    path: '/change-password',
    label: 'Wijzig wachtwoord',
    description: 'Bestaand wachtwoord wijzigen',
    keywords: ['change password', 'wachtwoord wijzigen'],
    showInSidebar: false,
    icon: RotateCcw,
  },
  {
    path: '/logout',
    label: 'Uitloggen',
    description: 'Sessie beëindigen',
    keywords: ['logout', 'uitloggen'],
    showInSidebar: false,
    icon: Lock,
  },
];

export const routerConfig: RouteObject[] = [
  { path: '/', element: <DashboardPage /> },
  { path: '/dashboard', element: <DashboardPage /> },
  { path: '/projecten', element: <Placeholder title="Projecten" /> },
  { path: '/lascontrole', element: <Placeholder title="Lascontrole" /> },
  { path: '/ce-dossier', element: <Placeholder title="CE dossier" /> },
  { path: '/rapportage', element: <RapportagePage /> },
  { path: '/instellingen', element: <Placeholder title="Instellingen" /> },
  { path: '/billing', element: <Placeholder title="Billing" /> },
  { path: '/superadmin', element: <Placeholder title="Superadmin" /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/change-password', element: <ChangePasswordPage /> },
  { path: '/logout', element: <LogoutPage /> },
];

export const routes = routerConfig;

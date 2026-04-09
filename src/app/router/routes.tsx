import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { BarChart3, Building2, ClipboardCheck, CreditCard, FolderKanban, LayoutDashboard, Settings, Shield } from 'lucide-react';
import type { RouteObject } from 'react-router-dom';
import RapportagePage from '@/features/rapportage/RapportagePage';

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
    keywords: ['home', 'overview', 'dashboard'],
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
    keywords: ['ce', 'dossier', 'export'],
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
];

export const routerConfig: RouteObject[] = [
  { path: '/', element: <Placeholder title="Dashboard" /> },
  { path: '/dashboard', element: <Placeholder title="Dashboard" /> },
  { path: '/projecten', element: <Placeholder title="Projecten" /> },
  { path: '/lascontrole', element: <Placeholder title="Lascontrole" /> },
  { path: '/ce-dossier', element: <Placeholder title="CE dossier" /> },
  { path: '/rapportage', element: <RapportagePage /> },
  { path: '/instellingen', element: <Placeholder title="Instellingen" /> },
  { path: '/billing', element: <Placeholder title="Billing" /> },
  { path: '/superadmin', element: <Placeholder title="Superadmin" /> },
];

export const routes = routerConfig;

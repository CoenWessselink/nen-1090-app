import { lazy, type ElementType, type LazyExoticComponent, type ComponentType } from "react";

const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const ProjectsPage = lazy(() => import("@/pages/projects/ProjectsPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));

export type AppRouteMeta = {
  title: string;
  requiresAuth: boolean;
  label?: string;
  roles?: string[];
  icon?: ElementType;
  description?: string;
  keywords?: string[];
  showInSidebar?: boolean;
};

export type AppRoute = {
  path: string;
  element: JSX.Element;
  meta: AppRouteMeta;
};

export type AppRouteMetaEntry = AppRouteMeta & {
  path: string;
};

const NoopIcon: ElementType = () => null;

export const routes: AppRoute[] = [
  {
    path: "/",
    element: <DashboardPage />,
    meta: {
      title: "Dashboard",
      requiresAuth: true,
      label: "Dashboard",
      icon: NoopIcon,
      description: "Dashboard overzicht",
      keywords: ["dashboard", "overzicht"],
      showInSidebar: true,
    },
  },
  {
    path: "/projects",
    element: <ProjectsPage />,
    meta: {
      title: "Projecten",
      requiresAuth: true,
      label: "Projecten",
      icon: NoopIcon,
      description: "Projectbeheer",
      keywords: ["projecten", "projectbeheer"],
      showInSidebar: true,
    },
  },
  {
    path: "/login",
    element: <LoginPage />,
    meta: {
      title: "Login",
      requiresAuth: false,
      label: "Login",
      icon: NoopIcon,
      description: "Inloggen",
      keywords: ["login", "auth"],
      showInSidebar: false,
    },
  },
];

export const routerConfig: AppRoute[] = routes;

export const appRouteMeta: AppRouteMetaEntry[] = routes.map((route) => ({
  path: route.path,
  ...route.meta,
}));

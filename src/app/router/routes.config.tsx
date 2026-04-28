import { lazy } from "react";

const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const ProjectsPage = lazy(() => import("@/pages/projects/ProjectsPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));

export type AppRoute = {
  path: string;
  element: any;
  meta: {
    title: string;
    requiresAuth: boolean;
    label?: string;
    roles?: string[];
    icon?: string;
    description?: string;
    keywords?: string[];
    showInSidebar?: boolean;
  };
};

export const routes: AppRoute[] = [
  {
    path: "/",
    element: <DashboardPage />,
    meta: {
      title: "Dashboard",
      requiresAuth: true,
      label: "Dashboard",
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
      showInSidebar: true,
    },
  },
  {
    path: "/login",
    element: <LoginPage />,
    meta: {
      title: "Login",
      requiresAuth: false,
    },
  },
];

export const routerConfig = routes;

export const appRouteMeta = routes.map((r) => r.meta);

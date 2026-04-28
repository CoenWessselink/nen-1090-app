import { lazy } from "react";

const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const ProjectsPage = lazy(() => import("@/pages/projects/ProjectsPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));

export const routes = [
  {
    path: "/",
    element: <DashboardPage />,
    meta: { title: "Dashboard", requiresAuth: true },
  },
  {
    path: "/projects",
    element: <ProjectsPage />,
    meta: { title: "Projecten", requiresAuth: true },
  },
  {
    path: "/login",
    element: <LoginPage />,
    meta: { title: "Login", requiresAuth: false },
  },
];

// BACKWARD COMPAT
export const routerConfig = routes;

export const appRouteMeta = routes.map((route: any) => ({
  path: route.path,
  title: route.meta?.title || "",
  requiresAuth: route.meta?.requiresAuth ?? false,
}));

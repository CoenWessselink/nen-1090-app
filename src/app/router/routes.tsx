import React, { Suspense } from "react";
import { Navigate, RouteObject } from "react-router-dom";
import SuperadminPage from "@/features/superadmin/SuperadminPage";

const Loading = () => <div className="page-stack">Loading...</div>;

const lazyPage = (factory: () => Promise<{ default: React.ComponentType }>) => {
  const Component = React.lazy(factory);
  return (
    <Suspense fallback={<Loading />}>
      <Component />
    </Suspense>
  );
};

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: "/superadmin",
    element: <SuperadminPage />,
  },
  {
    path: "*",
    element: lazyPage(() => import("@/app/router/AppRoutes")),
  },
];

export default routes;

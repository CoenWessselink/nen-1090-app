import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/app/store/auth-store";

export function ProtectedRoute() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  // HARD SECURITY BLOCK
  if (!token || !user || token === "__cookie_session__") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

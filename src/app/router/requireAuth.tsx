import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "@/app/session/SessionContext";

export default function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useSession();
  const location = useLocation();

  if (loading) {
    return <div data-testid="auth-loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/app/store/auth-store";

export function requireAuth(element: JSX.Element) {
  const state = useAuthStore.getState();
  const token = state?.token;
  const user = state?.user;

  if (!token || !user || token === "__cookie_session__") {
    return <Navigate to="/login" replace />;
  }

  return element;
}

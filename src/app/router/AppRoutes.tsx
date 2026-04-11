import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import Dashboard from "@/features/dashboard/Dashboard";
import Login from "@/features/auth/Login";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        {/* voeg hier ALLE protected routes toe */}
      </Route>
    </Routes>
  );
}

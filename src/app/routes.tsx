import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { SuperadminPage } from '@/features/superadmin/SuperadminPage';
import TenantProfilePage from '@/features/superadmin/TenantProfilePage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/superadmin" element={<SuperadminPage />} />
      <Route path="/superadmin/tenant/:tenantId/profile" element={<TenantProfilePage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

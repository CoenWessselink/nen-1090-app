import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { SuperadminPage } from '@/features/superadmin/SuperadminPage';
import TenantProfilePage from '@/features/superadmin/TenantProfilePage';

class EnterpriseErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Runtime boundary captured error', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'var(--enterprise-bg)',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              background: '#fff',
              borderRadius: '20px',
              padding: '24px',
              border: '1px solid var(--enterprise-border)',
              boxShadow: 'var(--enterprise-shadow)',
              textAlign: 'center',
            }}
          >
            <h2 style={{ marginTop: 0 }}>WeldInspect Pro</h2>
            <p style={{ color: 'var(--enterprise-muted)' }}>
              Er is een tijdelijke fout opgetreden. Vernieuw de pagina of probeer het opnieuw.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function AppRoutes() {
  return (
    <EnterpriseErrorBoundary>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/superadmin" element={<SuperadminPage />} />
        <Route path="/superadmin/tenant/:tenantId/profile" element={<TenantProfilePage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </EnterpriseErrorBoundary>
  );
}

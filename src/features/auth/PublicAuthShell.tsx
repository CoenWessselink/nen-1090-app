import type { ReactNode } from 'react';
import { SiteNavbar } from '@/components/layout/SiteNavbar';
import './login-premium.css';

export function PublicAuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-layout auth-layout-premium">
      <SiteNavbar variant="public" />
      <main className="auth-premium-main">
        {children}
        <div className="auth-security-note">◇ Secure access <span>·</span> Enterprise grade</div>
      </main>
    </div>
  );
}

export default PublicAuthShell;

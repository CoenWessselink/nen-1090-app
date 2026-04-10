import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '@/api/auth';
import { useAuthStore } from '@/app/store/auth-store';
import { useApiStatusStore } from '@/app/store/api-status-store';
import { Card } from '@/components/ui/Card';
import { InlineMessage } from '@/components/feedback/InlineMessage';

export function LogoutPage() {
  const navigate = useNavigate();
  const clearSession = useAuthStore((state) => state.clearSession);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const clearSessionExpired = useApiStatusStore((state) => state.clearSessionExpired);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        await logout(refreshToken ? { refresh_token: refreshToken } : undefined);
      } catch {
        // backend kan logout weigeren; lokale sessie moet alsnog stoppen
      } finally {
        clearSession();
        clearSessionExpired();
        if (!cancelled) {
          window.setTimeout(() => navigate('/login', { replace: true, state: { reason: 'logged-out' } }), 250);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [clearSession, clearSessionExpired, navigate, refreshToken]);

  return (
    <div className="auth-layout">
      <Card className="auth-card">
        <div>
          <div className="eyebrow">Sessie beëindigen</div>
          <h1>Je wordt uitgelogd</h1>
          <p>De app meldt de sessie af via het bestaande logout-endpoint en wist daarna de lokale sessiegegevens.</p>
        </div>
        <InlineMessage tone="success">Je sessie wordt afgesloten.</InlineMessage>
        <Link to="/login">Terug naar inloggen</Link>
      </Card>
    </div>
  );
}

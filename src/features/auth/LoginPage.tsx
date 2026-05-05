import { useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { login } from '@/api/auth';
import { useAuthStore } from '@/app/store/auth-store';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { getFriendlyAuthErrorMessage, normalizeAuthRedirectTarget } from '@/features/auth/auth-utils';
import './login-premium.css';

export default function LoginPage() {
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);

  const from = (location.state as { from?: string } | null)?.from;
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const [tenant, setTenant] = useState(() => query.get('tenant') || '');
  const [email, setEmail] = useState(() => query.get('email') || '');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await login({ email: email.trim(), password, tenant: tenant.trim() || undefined });

      if (!response.access_token || !response.user?.email) {
        throw new Error('Invalid API login response.');
      }

      setSession(
        response.access_token,
        {
          email: response.user.email,
          tenant: response.user.tenant,
          tenantId: response.user.tenant_id,
          role: response.user.role,
          name: response.user.name,
        },
        response.refresh_token || null,
      );

      window.location.replace(normalizeAuthRedirectTarget(from));
    } catch (requestError) {
      setError(getFriendlyAuthErrorMessage(requestError, 'Login failed.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout auth-layout-premium">
      <header className="auth-brand-header">
        <a className="auth-brand-lockup" href="/">
          <span className="auth-brand-mark">W</span>
          <span className="auth-brand-copy">
            <strong>WeldInspect <b>Pro</b></strong>
            <small>Lasinspectie software</small>
          </span>
        </a>
        <a className="auth-back-link" href="https://weldinspectpro.com/nl/">← Terug naar website</a>
      </header>

      <main className="auth-premium-main">
        <Card className="auth-card auth-card-premium">
          <div>
            <div className="eyebrow auth-norm-pill">Nederland · EN 1090 · ISO 3834 · CE dossier</div>
            <h1>Login</h1>
            <p>Sign in with your email address. Your tenant is selected automatically.</p>
          </div>

          {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}

          <form className="form-grid auth-form-premium" onSubmit={handleSubmit}>
            <label className="auth-field auth-field-email">
              <span>Email</span>
              <Input name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
            </label>

            <label className="auth-field auth-field-password">
              <span>Password</span>
              <Input name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
            </label>

            <label className="auth-field auth-field-tenant">
              <span>Tenant (optional)</span>
              <Input name="tenant" value={tenant} onChange={(event) => setTenant(event.target.value)} autoComplete="organization" placeholder="Leave empty for automatic selection" />
            </label>

            <div className="auth-forgot-row">
              <Link to="/forgot-password">Forgot password?</Link>
            </div>

            <Button className="auth-login-button" type="submit" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Login'} <span aria-hidden="true">→</span>
            </Button>
          </form>

          <div className="auth-divider"><span>or</span></div>
          <a className="auth-pricing-link" href="https://weldinspectpro.com/nl/prijzen.html">
            <span aria-hidden="true">↗</span>
            <span><strong>Bekijk prijzen</strong><small>Ontdek plannen en mogelijkheden</small></span>
          </a>
        </Card>

        <div className="auth-security-note">◇ Secure access <span>·</span> Enterprise grade</div>
      </main>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { login } from '@/api/auth';
import { useAuthStore } from '@/app/store/auth-store';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { getFriendlyAuthErrorMessage, normalizeAuthRedirectTarget } from '@/features/auth/auth-utils';

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
    <div className="auth-layout">
      <Card className="auth-card">
        <div>
          <div className="eyebrow">WeldInspect · NEN 1090</div>
          <h1>Login</h1>
          <p>Sign in with your email address. Your tenant is selected automatically.</p>
        </div>

        {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <Input name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </label>

          <label>
            <span>Password</span>
            <Input name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
          </label>

          <label>
            <span>Tenant (optional)</span>
            <Input name="tenant" value={tenant} onChange={(event) => setTenant(event.target.value)} autoComplete="organization" placeholder="Leave empty for automatic selection" />
          </label>

          <div style={{ textAlign: 'right', marginTop: '-8px' }}>
            <Link to="/forgot-password" style={{ fontSize: '13px', color: '#0f62fe', fontWeight: 600 }}>
              Forgot password?
            </Link>
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Login'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

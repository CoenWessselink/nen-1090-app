import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { login } from '@/api/auth';
import { useAuthStore } from '@/app/store/auth-store';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { getFriendlyAuthErrorMessage, normalizeAuthRedirectTarget } from '@/features/auth/auth-utils';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [tenant, setTenant] = useState('demo');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from;
  const redirectTarget = normalizeAuthRedirectTarget(from);

  useEffect(() => {
    if (token && user?.email) {
      navigate(redirectTarget, { replace: true });
    }
  }, [navigate, redirectTarget, token, user?.email]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await login({ email, password, tenant });

      if (!response.access_token || !response.user?.email) {
        throw new Error('Ongeldige loginresponse van de API.');
      }

      setSession(
        response.access_token,
        {
          email: response.user.email,
          tenant: response.user.tenant || tenant,
          tenantId: response.user.tenant_id || '',
          role: response.user.role || '',
          name: response.user.name || '',
        },
        response.refresh_token || null,
      );

      navigate(redirectTarget, { replace: true });
    } catch (requestError) {
      setError(getFriendlyAuthErrorMessage(requestError, 'Inloggen mislukt.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <Card className="auth-card">
        <div>
          <div className="eyebrow">CWS NEN-1090</div>
          <h1>Inloggen</h1>
          <p>Log in op het platform. Alleen de app verwerkt authenticatie; marketing doet dit niet.</p>
        </div>

        {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Tenant</span>
            <Input value={tenant} onChange={(event) => setTenant(event.target.value)} autoComplete="organization" required />
          </label>

          <label>
            <span>E-mail</span>
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </label>

          <label>
            <span>Wachtwoord</span>
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
          </label>

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Bezig...' : 'Inloggen'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

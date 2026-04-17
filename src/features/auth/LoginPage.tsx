import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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

  const [tenant, setTenant] = useState(() => query.get('tenant') || 'demo');
  const [email, setEmail] = useState(() => query.get('email') || '');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onboardingMessage = query.get('message') || '';

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
          tenant: response.user.tenant,
          tenantId: response.user.tenant_id,
          role: response.user.role,
          name: response.user.name,
        },
        response.refresh_token || null,
      );

      window.location.replace(normalizeAuthRedirectTarget(from));
    } catch (requestError) {
      setError(getFriendlyAuthErrorMessage(requestError, 'Inloggen mislukt.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <Card className="auth-card">
        <div className="auth-hero-copy">
          <div className="eyebrow">WeldInspect · app login</div>
          <h1>Inloggen</h1>
          <p>Log in met tenant, e-mail en wachtwoord. Superadmin gebruikt tenant <strong>platform</strong>; tenantgebruikers loggen in op hun eigen tenant.</p>
        </div>

        {onboardingMessage ? <InlineMessage tone="success">{onboardingMessage}</InlineMessage> : null}
        {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}

        <form className="form-grid auth-form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Tenant</span>
            <Input name="tenant" value={tenant} onChange={(event) => setTenant(event.target.value)} autoComplete="organization" required />
          </label>

          <label>
            <span>E-mail</span>
            <Input name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </label>

          <label>
            <span>Wachtwoord</span>
            <Input name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
          </label>

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Bezig...' : 'Inloggen'}
          </Button>
        </form>

        <div className="auth-link-row">
          <Link to={`/forgot-password?tenant=${encodeURIComponent(tenant)}&email=${encodeURIComponent(email)}`}>Wachtwoord vergeten</Link>
          <Link to="/change-password">Wachtwoord wijzigen</Link>
        </div>

        <div className="auth-hints-grid">
          <div className="auth-hint-card">
            <strong>Nieuwe tenant</strong>
            <span>Gebruik de activatielink uit onboarding om eerst je wachtwoord in te stellen.</span>
          </div>
          <div className="auth-hint-card">
            <strong>Geen mail ontvangen?</strong>
            <span>Superadmin kan de uitnodiging opnieuw versturen of een resetlink genereren.</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

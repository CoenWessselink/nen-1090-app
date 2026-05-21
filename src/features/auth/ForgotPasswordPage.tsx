import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '@/api/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { SiteNavbar } from '@/components/layout/SiteNavbar';
import { getFriendlyAuthErrorMessage } from '@/features/auth/auth-utils';
import './login-premium.css';

export function ForgotPasswordPage() {
  const [tenant, setTenant] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const response = await requestPasswordReset({ email, tenant: tenant || undefined });
      setResult((response as Record<string, unknown>) || { message: 'Als dit account bestaat, is een resetlink verstuurd.' });
    } catch (requestError) {
      setError(getFriendlyAuthErrorMessage(requestError, 'Reset aanvragen mislukt.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout auth-layout-premium">
      <SiteNavbar variant="public" />
      <main className="auth-premium-main">
        <Card className="auth-card auth-card-premium">
          <div>
            <div className="eyebrow auth-norm-pill">Nederland · EN 1090 · ISO 3834 · CE dossier</div>
            <h1>Wachtwoord vergeten</h1>
            <p>Vraag hier een resetlink aan. Tenant is optioneel en alleen nodig als je omgeving daarom vraagt.</p>
          </div>

          {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}
          {result ? <InlineMessage tone="success"><strong>{String(result.message || 'Als dit account bestaat, is een resetlink verwerkt.')}</strong></InlineMessage> : null}

          <form className="form-grid auth-form-premium" onSubmit={handleSubmit}>
            <label className="auth-field"><span>Tenant</span><Input value={tenant} onChange={(event) => setTenant(event.target.value)} placeholder="Optioneel" /></label>
            <label className="auth-field"><span>E-mail</span><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
            <Button className="auth-login-button" type="submit" disabled={submitting}>{submitting ? 'Bezig...' : 'Resetlink versturen'} <span aria-hidden="true">→</span></Button>
          </form>

          <div className="stack-actions auth-stack-actions-premium"><Link to="/login">Terug naar login</Link></div>
        </Card>
        <div className="auth-security-note">◇ Secure access <span>·</span> Enterprise grade</div>
      </main>
    </div>
  );
}

export default ForgotPasswordPage;

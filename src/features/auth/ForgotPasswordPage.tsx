import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '@/api/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { getFriendlyAuthErrorMessage } from '@/features/auth/auth-utils';

export function ForgotPasswordPage() {
  const [tenant, setTenant] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ message?: string; reset_url?: string } | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const response = await requestPasswordReset({ email, tenant: tenant || undefined });
      setResult(response || { message: 'Als dit account bestaat, is een resetlink verstuurd.' });
    } catch (requestError) {
      setError(getFriendlyAuthErrorMessage(requestError, 'Reset aanvragen mislukt.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <Card className="auth-card">
        <div>
          <div className="eyebrow">CWS NEN-1090</div>
          <h1>Wachtwoord vergeten</h1>
          <p>Vraag hier een resetlink aan. Tenant is optioneel en alleen nodig als je omgeving daarom vraagt.</p>
        </div>

        {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}
        {result?.message ? <InlineMessage tone="success">{`${result.message}${result.reset_url ? ` Testlink: ${result.reset_url}` : ''}`}</InlineMessage> : null}

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Tenant</span>
            <Input value={tenant} onChange={(event) => setTenant(event.target.value)} placeholder="Optioneel" />
          </label>
          <label>
            <span>E-mail</span>
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </label>
          <Button type="submit" disabled={submitting}>{submitting ? 'Bezig...' : 'Resetlink versturen'}</Button>
        </form>

        <div className="stack-actions">
          <Link to="/login">Terug naar login</Link>
        </div>
      </Card>
    </div>
  );
}

export default ForgotPasswordPage;

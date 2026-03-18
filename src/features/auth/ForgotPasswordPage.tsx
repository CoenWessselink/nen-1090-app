import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '@/api/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { getFriendlyAuthErrorMessage } from '@/features/auth/auth-utils';

export function ForgotPasswordPage() {
  const [tenant, setTenant] = useState('demo');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const response = await requestPasswordReset(email, tenant || undefined);
      setMessage(response.message || 'Als dit account bestaat, is een resetlink verstuurd.');
    } catch (requestError) {
      setError(getFriendlyAuthErrorMessage(requestError, 'Resetlink aanvragen mislukt.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <Card className="auth-card">
        <div>
          <div className="eyebrow">Wachtwoord vergeten</div>
          <h1>Vraag een resetlink aan</h1>
          <p>Deze flow gebruikt het bestaande request-endpoint en toont alleen details als de API die expliciet teruggeeft.</p>
        </div>
        {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}
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
          <Button type="submit" disabled={submitting}>{submitting ? 'Bezig...' : 'Resetlink aanvragen'}</Button>
        </form>
        <Link to="/login">Terug naar inloggen</Link>
      </Card>
    </div>
  );
}

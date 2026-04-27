import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { confirmPasswordReset } from '@/api/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { getFriendlyAuthErrorMessage } from '@/features/auth/auth-utils';

export function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = useMemo(() => new URLSearchParams(location.search).get('token') || '', [location.search]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);
    if (!token) {
      setError('Geen token gevonden in de resetlink.');
      return;
    }
    if (password.length < 8) {
      setError('Wachtwoord moet minimaal 8 tekens bevatten.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await confirmPasswordReset({ token, password });
      setResult((response as Record<string, unknown>) || { message: 'Je wachtwoord is ingesteld.' });
      window.setTimeout(() => navigate('/login'), 1400);
    } catch (requestError) {
      setError(getFriendlyAuthErrorMessage(requestError, 'Resetten mislukt.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <Card className="auth-card">
        <div>
          <div className="eyebrow">CWS NEN-1090</div>
          <h1>Nieuw wachtwoord instellen</h1>
          <p>Gebruik deze pagina voor activatie, uitnodiging en reguliere password resets.</p>
        </div>

        {!token ? <InlineMessage tone="danger">De resetlink bevat geen geldig token.</InlineMessage> : null}
        {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}
        {result ? (
          <InlineMessage tone="success">
            <div>
              <strong>{String(result.message || 'Je wachtwoord is ingesteld.')}</strong>
              {result.delivery_mode ? <div>Delivery mode: {String(result.delivery_mode)}</div> : null}
              {result.activation_url ? <div>Activatielink: {String(result.activation_url)}</div> : null}
              {result.outbox_path ? <div>Preview mail: {String(result.outbox_path)}</div> : null}
              {result.delivery_error ? <div>Mailmelding: {String(result.delivery_error)}</div> : null}
            </div>
          </InlineMessage>
        ) : null}

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Nieuw wachtwoord</span>
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
          </label>
          <label>
            <span>Herhaal wachtwoord</span>
            <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required />
          </label>
          <Button type="submit" disabled={submitting || !token}>{submitting ? 'Bezig...' : 'Wachtwoord opslaan'}</Button>
        </form>

        <div className="stack-actions">
          <Link to="/login">Terug naar login</Link>
        </div>
      </Card>
    </div>
  );
}

export default ResetPasswordPage;

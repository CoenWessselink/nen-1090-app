import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { activateAccount } from '@/api/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { getFriendlyAuthErrorMessage, getPasswordStrength } from '@/features/auth/auth-utils';

export function ActivateAccountPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const token = query.get('token') || '';
  const tenant = query.get('tenant') || '';
  const email = query.get('email') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const passwordStrength = getPasswordStrength(password);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) return setError('Geen activatietoken gevonden.');
    if (password.length < 8) return setError('Wachtwoord moet minimaal 8 tekens bevatten.');
    if (password !== confirmPassword) return setError('Wachtwoorden komen niet overeen.');

    setSubmitting(true);
    try {
      const response = await activateAccount({ token, password });
      const successMessage = response?.message || 'Je account is geactiveerd.';
      setSuccess(successMessage);

      window.setTimeout(() => {
        navigate(
          `/login?tenant=${encodeURIComponent(tenant)}&email=${encodeURIComponent(email)}&message=${encodeURIComponent(
            'Account geactiveerd. Log nu in met je nieuwe wachtwoord.',
          )}`,
        );
      }, 1400);
    } catch (requestError) {
      setError(getFriendlyAuthErrorMessage(requestError, 'Activatie mislukt.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <Card className="auth-card">
        <div className="auth-hero-copy">
          <div className="eyebrow">WeldInspect · account activeren</div>
          <h1>Activeer je account</h1>
          <p>Stel hieronder direct je wachtwoord in. Daarna ga je automatisch terug naar het login-scherm.</p>
        </div>

        {!token ? <InlineMessage tone="danger">De activatielink bevat geen geldig token.</InlineMessage> : null}
        {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}
        {success ? <InlineMessage tone="success">{success}</InlineMessage> : null}

        <form className="form-grid auth-form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Nieuw wachtwoord</span>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          <div className="auth-hint-card" style={{ marginTop: -4 }}>
            <strong>Wachtwoordsterkte</strong>
            <span>{passwordStrength}</span>
          </div>

          <label>
            <span>Herhaal wachtwoord</span>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          <Button type="submit" disabled={submitting || !token}>
            {submitting ? 'Account activeren…' : 'Account activeren'}
          </Button>
        </form>

        <div className="auth-link-row">
          <Link to={`/login?tenant=${encodeURIComponent(tenant)}&email=${encodeURIComponent(email)}`}>Terug naar login</Link>
        </div>
      </Card>
    </div>
  );
}

export default ActivateAccountPage;

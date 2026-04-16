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
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
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
      setSuccess(response?.message || 'Je wachtwoord is ingesteld.');
      window.setTimeout(() => navigate('/login'), 1200);
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
        {success ? <InlineMessage tone="success">{success}</InlineMessage> : null}

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

import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { confirmPasswordReset } from '@/api/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { getFriendlyAuthErrorMessage, getPasswordStrength } from '@/features/auth/auth-utils';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordsMatch = password.length > 0 && password === repeatPassword;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!passwordsMatch) {
      setError('De wachtwoorden komen niet overeen.');
      return;
    }
    setSubmitting(true);
    try {
      await confirmPasswordReset({ token, password });
      setSuccessMessage('Je wachtwoord is opgeslagen. Je wordt doorgestuurd naar inloggen.');
      window.setTimeout(() => navigate('/login', { replace: true, state: { reason: 'password-changed' } }), 250);
    } catch (submissionError) {
      setError(getFriendlyAuthErrorMessage(submissionError, 'Reset mislukt.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <Card className="auth-card">
        <div>
          <div className="eyebrow">Nieuw wachtwoord</div>
          <h1>Stel een nieuw wachtwoord in</h1>
          <p>Gebruik de token uit de resetlink om een nieuw wachtwoord op te slaan.</p>
        </div>
        {successMessage ? <InlineMessage tone="success">{successMessage}</InlineMessage> : null}
        {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}
        {!token ? <InlineMessage tone="neutral">Open deze pagina via een geldige resetlink met token.</InlineMessage> : null}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Token</span>
            <Input value={token} disabled />
          </label>
          <label>
            <span>Nieuw wachtwoord</span>
            <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
            <small className="list-subtle">Sterkte: {strength}</small>
          </label>
          <label>
            <span>Herhaal nieuw wachtwoord</span>
            <Input type={showPassword ? 'text' : 'password'} value={repeatPassword} onChange={(event) => setRepeatPassword(event.target.value)} autoComplete="new-password" required />
            {repeatPassword && !passwordsMatch ? <small className="field-error">De wachtwoorden komen niet overeen.</small> : null}
          </label>
          <div className="toolbar-cluster" style={{ justifyContent: 'space-between' }}>
            <button className="btn btn-ghost" type="button" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? 'Verberg wachtwoord' : 'Toon wachtwoord'}
            </button>
            <span className="list-subtle">Token uit resetlink geladen</span>
          </div>
          <Button type="submit" disabled={submitting || !token}>{submitting ? 'Bezig...' : 'Wachtwoord opslaan'}</Button>
        </form>
        <Link to="/login">Terug naar inloggen</Link>
      </Card>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword, logout } from '@/api/auth';
import { useAuthStore } from '@/app/store/auth-store';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { getFriendlyAuthErrorMessage, getPasswordStrength } from '@/features/auth/auth-utils';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const clearSession = useAuthStore((state) => state.clearSession);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
  const passwordsMatch = newPassword.length > 0 && newPassword === repeatPassword;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (!passwordsMatch) {
      setMessage('De nieuwe wachtwoorden komen niet overeen.');
      return;
    }
    setSubmitting(true);
    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword });
      try {
        await logout(refreshToken ? { refresh_token: refreshToken } : undefined);
      } catch {
        // bestaande sessie lokaal beëindigen als logout-endpoint afwijkt
      }
      clearSession();
      navigate('/login', { replace: true, state: { reason: 'password-changed' } });
    } catch (submissionError) {
      setMessage(getFriendlyAuthErrorMessage(submissionError, 'Wachtwoord wijzigen mislukt.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <Card className="auth-card">
        <div>
          <div className="eyebrow">Beveiliging</div>
          <h1>Wachtwoord wijzigen</h1>
          <p>Deze pagina gebruikt het bestaande <code>/auth/change-password</code>-contract en sluit daarna de sessie netjes af.</p>
        </div>
        {message ? <InlineMessage tone="danger">{message}</InlineMessage> : null}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Huidig wachtwoord</span>
            <Input type={showPassword ? 'text' : 'password'} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required />
          </label>
          <label>
            <span>Nieuw wachtwoord</span>
            <Input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" required />
            <small className="list-subtle">Sterkte: {strength}</small>
          </label>
          <label>
            <span>Herhaal nieuw wachtwoord</span>
            <Input type={showPassword ? 'text' : 'password'} value={repeatPassword} onChange={(event) => setRepeatPassword(event.target.value)} autoComplete="new-password" required />
            {repeatPassword && !passwordsMatch ? <small className="field-error">De wachtwoorden komen niet overeen.</small> : null}
          </label>
          <div className="toolbar-cluster" style={{ justifyContent: 'space-between' }}>
            <button className="btn btn-ghost" type="button" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? 'Verberg wachtwoorden' : 'Toon wachtwoorden'}
            </button>
            <span className="list-subtle">Na opslaan wordt de sessie opnieuw gestart via inloggen.</span>
          </div>
          <div className="form-actions">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Annuleren</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Bezig...' : 'Wachtwoord wijzigen'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

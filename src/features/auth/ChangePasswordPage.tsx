import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { changePassword } from '@/api/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { getFriendlyAuthErrorMessage } from '@/features/auth/auth-utils';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (newPassword.length < 8) return setError('Nieuw wachtwoord moet minimaal 8 tekens bevatten.');
    if (newPassword !== confirmPassword) return setError('Nieuwe wachtwoorden komen niet overeen.');

    setSubmitting(true);
    try {
      const response = await changePassword({ current_password: currentPassword, new_password: newPassword });
      setSuccess(response?.message || 'Wachtwoord bijgewerkt.');
      window.setTimeout(() => navigate('/dashboard'), 1200);
    } catch (requestError) {
      setError(getFriendlyAuthErrorMessage(requestError, 'Wachtwoord wijzigen mislukt.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <Card className="auth-card">
        <div className="auth-hero-copy">
          <div className="eyebrow">WeldInspect · security</div>
          <h1>Wachtwoord wijzigen</h1>
          <p>Wijzig je wachtwoord zonder de bestaande loginflow te doorbreken.</p>
        </div>

        {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}
        {success ? <InlineMessage tone="success">{success}</InlineMessage> : null}

        <form className="form-grid auth-form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Huidig wachtwoord</span>
            <Input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required />
          </label>
          <label>
            <span>Nieuw wachtwoord</span>
            <Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" required />
          </label>
          <label>
            <span>Herhaal nieuw wachtwoord</span>
            <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required />
          </label>
          <Button type="submit" disabled={submitting}>{submitting ? 'Bezig...' : 'Wachtwoord wijzigen'}</Button>
        </form>

        <div className="auth-link-row">
          <Link to="/login">Terug naar login</Link>
        </div>
      </Card>
    </div>
  );
}

export default ChangePasswordPage;

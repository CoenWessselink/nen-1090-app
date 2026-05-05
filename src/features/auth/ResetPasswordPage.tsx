import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { confirmPasswordReset } from '@/api/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { getFriendlyAuthErrorMessage } from '@/features/auth/auth-utils';

const PASSWORD_RULES = [
  { label: 'At least 10 characters', test: (value: string) => value.length >= 10 },
  { label: 'At least one uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'At least one lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'At least one number', test: (value: string) => /\d/.test(value) },
  { label: 'At least one special character', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

function passwordError(password: string, confirmPassword: string) {
  const missing = PASSWORD_RULES.filter((rule) => !rule.test(password)).map((rule) => rule.label);
  if (missing.length) return `Password does not meet all requirements: ${missing.join(', ')}.`;
  if (password !== confirmPassword) return 'Passwords do not match.';
  return null;
}

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
    if (!token) return setError('No token found in the reset link.');
    const validationError = passwordError(password, confirmPassword);
    if (validationError) return setError(validationError);

    setSubmitting(true);
    try {
      const response = await confirmPasswordReset({ token, password, confirm_password: confirmPassword } as any);
      setResult((response as Record<string, unknown>) || { message: 'Your password has been set.' });
      window.setTimeout(() => navigate('/login'), 1400);
    } catch (requestError) {
      setError(getFriendlyAuthErrorMessage(requestError, 'Password reset failed.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <Card className="auth-card">
        <div>
          <div className="eyebrow">WeldInspectPro</div>
          <h1>Set a new password</h1>
          <p>Use this page for account activation, invitations and password resets.</p>
        </div>

        {!token ? <InlineMessage tone="danger">The reset link does not contain a valid token.</InlineMessage> : null}
        {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}
        {result ? (
          <InlineMessage tone="success">
            <div>
              <strong>{String(result.message || 'Your password has been set.')}</strong>
              {result.delivery_mode ? <div>Delivery mode: {String(result.delivery_mode)}</div> : null}
              {result.activation_url ? <div>Activation link: {String(result.activation_url)}</div> : null}
              {result.outbox_path ? <div>Email preview: {String(result.outbox_path)}</div> : null}
              {result.delivery_error ? <div>Email notice: {String(result.delivery_error)}</div> : null}
            </div>
          </InlineMessage>
        ) : null}

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>New password</span>
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
          </label>
          <label>
            <span>Confirm password</span>
            <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required />
          </label>
          <div className="auth-password-requirements" style={{ fontSize: 13, lineHeight: 1.7, color: '#94a3b8' }}>
            <strong style={{ color: '#e2e8f0' }}>Password requirements</strong>
            {PASSWORD_RULES.map((rule) => <div key={rule.label}>{rule.test(password) ? '✓' : '○'} {rule.label}</div>)}
            <div>{password && confirmPassword && password === confirmPassword ? '✓' : '○'} Passwords match</div>
          </div>
          <Button type="submit" disabled={submitting || !token}>{submitting ? 'Working...' : 'Save password'}</Button>
        </form>

        <div className="stack-actions">
          <Link to="/login">Back to login</Link>
        </div>
      </Card>
    </div>
  );
}

export default ResetPasswordPage;

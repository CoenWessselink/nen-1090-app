import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { login } from '@/api/auth';
import { useAuthStore } from '@/app/store/auth-store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/feedback/ErrorState';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { useUiStore } from '@/app/store/ui-store';
import { useApiStatusStore } from '@/app/store/api-status-store';
import { getFriendlyAuthErrorMessage, normalizeAuthRedirectTarget } from '@/features/auth/auth-utils';

const schema = z.object({
  tenant: z.string().min(1, 'Tenant is verplicht'),
  email: z.string().email('Vul een geldig e-mailadres in'),
  password: z.string().min(1, 'Wachtwoord is verplicht'),
});

type LoginFormValues = z.infer<typeof schema>;

type LoginNavigationState = {
  reason?: string;
  from?: string;
} | null;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);
  const activeToken = useAuthStore((state) => state.token);
  const pushNotification = useUiStore((state) => state.pushNotification);
  const clearSessionExpired = useApiStatusStore((state) => state.clearSessionExpired);
  const sessionExpired = useApiStatusStore((state) => state.sessionExpired);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigationState = (location.state as LoginNavigationState) || null;
  const target = normalizeAuthRedirectTarget(navigationState?.from);
  const successMessage = useMemo(() => {
    if (!navigationState?.reason) return null;
    switch (navigationState.reason) {
      case 'logged-out':
        return 'Je bent uitgelogd. Log opnieuw in om verder te werken.';
      case 'password-changed':
        return 'Je wachtwoord is gewijzigd. Log opnieuw in met je nieuwe wachtwoord.';
      default:
        return null;
    }
  }, [navigationState]);

  useEffect(() => {
    if (activeToken) {
      navigate(target, { replace: true });
    }
  }, [activeToken, navigate, target]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tenant: 'demo',
      email: '',
      password: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const response = await login(values);
      const token = response.access_token || response.token;
      if (!token) throw new Error('Geen access token ontvangen van backend.');
      setSession(token, {
        email: response.user?.email || values.email,
        tenant: response.user?.tenant || values.tenant,
        tenantId: response.user?.tenant_id,
        role: response.user?.role,
        name: response.user?.name,
      }, response.refresh_token || null);
      clearSessionExpired();
      pushNotification({ title: 'Ingelogd', description: 'Sessie is actief op basis van de bestaande backend-authflow.', tone: 'success' });
      navigate(target, { replace: true });
    } catch (submissionError) {
      setError(getFriendlyAuthErrorMessage(submissionError, 'Inloggen mislukt.'));
    }
  });

  return (
    <div className="auth-layout">
      <Card className="auth-card">
        <div>
          <div className="eyebrow">CWS NEN-1090</div>
          <h1>Inloggen in het platform</h1>
          <p>Gebruik tenant, e-mail en wachtwoord van de bestaande backend-authflow.</p>
        </div>
        {successMessage ? <InlineMessage tone="success">{successMessage}</InlineMessage> : null}
        {sessionExpired && !successMessage ? <InlineMessage tone="danger">Je sessie is verlopen. Log opnieuw in om verder te werken.</InlineMessage> : null}
        {target !== '/dashboard' ? <InlineMessage tone="neutral">{`Na inloggen ga je terug naar ${target}.`}</InlineMessage> : null}
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            <span>Tenant</span>
            <Input {...register('tenant')} autoComplete="organization" />
            {errors.tenant ? <small className="field-error">{errors.tenant.message}</small> : null}
          </label>
          <label>
            <span>E-mail</span>
            <Input {...register('email')} type="email" autoComplete="username" />
            {errors.email ? <small className="field-error">{errors.email.message}</small> : null}
          </label>
          <label>
            <span>Wachtwoord</span>
            <Input {...register('password')} type={showPassword ? 'text' : 'password'} autoComplete="current-password" />
            {errors.password ? <small className="field-error">{errors.password.message}</small> : null}
          </label>
          <div className="toolbar-cluster" style={{ justifyContent: 'space-between' }}>
            <button className="btn btn-ghost" type="button" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? 'Verberg wachtwoord' : 'Toon wachtwoord'}
            </button>
            <Link to="/forgot-password">Wachtwoord vergeten?</Link>
          </div>
          {error ? <ErrorState title="Inloggen mislukt" description={error} /> : null}
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Bezig...' : 'Inloggen'}</Button>
        </form>
      </Card>
    </div>
  );
}

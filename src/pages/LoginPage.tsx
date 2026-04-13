import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import apiClient from '@/services/apiClient';
import { useAuthStore } from '@/app/store/auth-store';

type LoginResponse = {
  access_token?: string;
  refresh_token?: string | null;
  user?: {
    email?: string;
    tenant?: string;
    tenant_id?: string | number;
    role?: string;
    name?: string;
  };
};

export default function LoginPage() {
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);

  const [tenant, setTenant] = useState('demo');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname?: string } | string } | null)?.from;
  const redirectTo =
    typeof from === 'string'
      ? from
      : typeof from?.pathname === 'string' && from.pathname.length > 0
        ? from.pathname
        : '/dashboard';

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', {
        email,
        password,
        tenant,
      });

      const accessToken = response?.access_token;
      const user = response?.user;

      if (!accessToken || !user?.email) {
        throw new Error('Ongeldige loginresponse van de API.');
      }

      setSession(
        accessToken,
        {
          email: user.email,
          tenant: user.tenant || tenant,
          tenantId: user.tenant_id || '',
          role: user.role || '',
          name: user.name || '',
        },
        response?.refresh_token || null,
      );

      window.location.replace(redirectTo);
    } catch (requestError) {
      const message =
        requestError instanceof Error && requestError.message
          ? requestError.message
          : 'Inloggen mislukt.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <h1>Inloggen</h1>
        {error ? <div role="alert">{error}</div> : null}
        <form className="form-grid" onSubmit={handleLogin}>
          <label>
            <span>Tenant</span>
            <input
              name="tenant"
              value={tenant}
              onChange={(event) => setTenant(event.target.value)}
              autoComplete="organization"
              required
            />
          </label>

          <label>
            <span>E-mail</span>
            <input
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label>
            <span>Wachtwoord</span>
            <input
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <button type="submit" disabled={submitting}>
            {submitting ? 'Bezig...' : 'Inloggen'}
          </button>
        </form>
      </div>
    </div>
  );
}

import React, { FormEvent, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getMe, login } from '@/api/auth';
import { useAuthStore } from '@/app/store/auth-store';
import type { SessionUser } from '@/types/domain';

function readErrorMessage(error: unknown): string {
  if (!error) return 'Inloggen is mislukt.';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message || 'Inloggen is mislukt.';
  if (typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const details = record.details;
    if (typeof record.message === 'string' && record.message) return record.message;
    if (details && typeof details === 'object') {
      const detailsRecord = details as Record<string, unknown>;
      if (typeof detailsRecord.message === 'string' && detailsRecord.message) return detailsRecord.message;
      if (typeof detailsRecord.detail === 'string' && detailsRecord.detail) return detailsRecord.detail;
    }
  }
  return 'API request failed';
}

function normalizeUser(payload: unknown, tenantFallback: string, emailFallback: string): SessionUser {
  const raw = (payload || {}) as Record<string, unknown>;
  return {
    email: String(raw.email || emailFallback),
    tenant: String(raw.tenant || tenantFallback),
    tenantId: raw.tenant_id as string | number | undefined,
    role: String(raw.role || ''),
    name: String(raw.name || ''),
  };
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useAuthStore((state) => state.setSession);

  const [tenant, setTenant] = useState('demo');
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('Admin123!');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const redirectTarget = useMemo(() => searchParams.get('redirect') || '/dashboard', [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await login({
        tenant: tenant.trim(),
        email: email.trim(),
        password,
      });

      const accessToken =
        typeof response.access_token === 'string' && response.access_token
          ? response.access_token
          : typeof response.token === 'string' && response.token
            ? response.token
            : '__cookie_session__';

      const refreshToken =
        typeof response.refresh_token === 'string' && response.refresh_token
          ? response.refresh_token
          : null;

      const responseUser = normalizeUser(response.user, tenant.trim(), email.trim());

      setSession(accessToken, responseUser, refreshToken);

      try {
        const me = await getMe();
        setSession(
          accessToken,
          {
            email: me.email,
            tenant: me.tenant,
            tenantId: me.tenantId,
            role: me.role,
            name: me.name,
          },
          refreshToken,
        );
      } catch {
        // fallback: keep user from login response
      }

      navigate(redirectTarget, { replace: true });
    } catch (err) {
      setError(readErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f8fafc', padding: 24 }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 440,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 20,
          padding: 24,
          boxShadow: '0 8px 30px rgba(15,23,42,0.08)',
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>Inloggen</h1>
          <p style={{ margin: '8px 0 0', color: '#64748b' }}>Meld je aan om verder te gaan naar het platform.</p>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Tenant</span>
            <input value={tenant} onChange={(event) => setTenant(event.target.value)} placeholder="demo" autoComplete="organization" style={{ padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }} />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>E-mailadres</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@demo.com" autoComplete="username" style={{ padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }} />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Wachtwoord</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" autoComplete="current-password" style={{ padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }} />
          </label>

          {error ? (
            <div style={{ borderRadius: 12, border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', padding: 12 }}>
              {error}
            </div>
          ) : null}

          <button type="submit" disabled={submitting} style={{ marginTop: 8, padding: 12, borderRadius: 12, border: 'none', background: '#0f172a', color: '#ffffff', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
            {submitting ? 'Bezig met inloggen…' : 'Inloggen'}
          </button>

          <a href="/forgot-password" style={{ color: '#2563eb', textDecoration: 'none' }}>
            Wachtwoord vergeten
          </a>
        </div>
      </form>
    </div>
  );
}

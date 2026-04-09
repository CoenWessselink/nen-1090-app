import React from 'react';

export default function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f8fafc', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 24, boxShadow: '0 8px 30px rgba(15,23,42,0.08)' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>Inloggen</h1>
          <p style={{ margin: '8px 0 0', color: '#64748b' }}>Loginroute is hersteld. Gebruik je bestaande sessie- of authflow vanaf hier.</p>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Tenant</span>
            <input placeholder="demo" style={{ padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }} />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>E-mailadres</span>
            <input placeholder="admin@demo.com" style={{ padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }} />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Wachtwoord</span>
            <input type="password" placeholder="••••••••" style={{ padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }} />
          </label>

          <button type="button" style={{ marginTop: 8, padding: 12, borderRadius: 12, border: 'none', background: '#0f172a', color: '#ffffff', fontWeight: 700 }}>
            Inloggen
          </button>

          <a href="/forgot-password" style={{ color: '#2563eb', textDecoration: 'none' }}>
            Wachtwoord vergeten
          </a>
        </div>
      </div>
    </div>
  );
}

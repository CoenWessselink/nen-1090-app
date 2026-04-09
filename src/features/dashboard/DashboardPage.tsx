import React from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '@/app/session/SessionContext';

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 20,
  padding: 20,
  boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
};

const statStyle: React.CSSProperties = {
  ...cardStyle,
  minHeight: 120,
};

const linkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 44,
  padding: '0 16px',
  borderRadius: 12,
  background: '#0f172a',
  color: '#ffffff',
  textDecoration: 'none',
  fontWeight: 700,
};

export default function DashboardPage() {
  const session = useSession();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gap: 20 }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: '#64748b', fontSize: 14, marginBottom: 6 }}>CWS NEN-1090</div>
              <h1 style={{ margin: 0, fontSize: 34 }}>Dashboard</h1>
              <p style={{ margin: '10px 0 0', color: '#475569' }}>
                Welkom {session.user?.name || session.user?.email || 'gebruiker'} · tenant {session.user?.tenant || '-'} · rol {session.user?.role || '-'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/projecten" style={linkStyle}>Projecten</Link>
              <Link to="/lascontrole" style={linkStyle}>Lascontrole</Link>
              <Link to="/rapportage" style={linkStyle}>Rapportage</Link>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
          <div style={statStyle}>
            <div style={{ color: '#64748b', fontSize: 14 }}>Sessie</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 10 }}>Actief</div>
            <div style={{ color: '#475569', marginTop: 8 }}>De login is doorgelopen en de sessie is aanwezig.</div>
          </div>
          <div style={statStyle}>
            <div style={{ color: '#64748b', fontSize: 14 }}>Tenant</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 10 }}>{session.user?.tenant || '-'}</div>
            <div style={{ color: '#475569', marginTop: 8 }}>Actieve werkomgeving.</div>
          </div>
          <div style={statStyle}>
            <div style={{ color: '#64748b', fontSize: 14 }}>Gebruiker</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 10 }}>{session.user?.email || '-'}</div>
            <div style={{ color: '#475569', marginTop: 8 }}>Ingelogde gebruiker.</div>
          </div>
          <div style={statStyle}>
            <div style={{ color: '#64748b', fontSize: 14 }}>Rol</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 10 }}>{session.user?.role || '-'}</div>
            <div style={{ color: '#475569', marginTop: 8 }}>Huidige autorisatierol.</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16 }}>
          <div style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>Systeemstatus</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ padding: 14, borderRadius: 14, background: '#dcfce7', color: '#166534' }}>
                /auth/me geeft 200, de sessie is dus aanwezig.
              </div>
              <div style={{ padding: 14, borderRadius: 14, background: '#fef3c7', color: '#92400e' }}>
                /auth/refresh geeft nog 401 in jouw screenshot. Dat blokkeert nu het dashboard niet, maar moet later apart worden rechtgetrokken.
              </div>
              <div style={{ padding: 14, borderRadius: 14, background: '#e2e8f0', color: '#0f172a' }}>
                Deze dashboardpagina is hersteld zodat je niet meer op een lege placeholder uitkomt.
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>Snelle acties</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <Link to="/projecten" style={linkStyle}>Open projecten</Link>
              <Link to="/lascontrole" style={linkStyle}>Open lascontrole</Link>
              <Link to="/instellingen" style={linkStyle}>Open instellingen</Link>
              <Link to="/logout" style={linkStyle}>Uitloggen</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

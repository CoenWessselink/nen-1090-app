import { useState } from 'react';

export default function LoginPage() {
  const [tenant, setTenant] = useState('demo');
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('Admin123!');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant,
          email,
          password,
        }),
      });

      const data = await res.json();

      console.log('LOGIN RESPONSE:', data);

      // HARD NORMALIZATION
      const token =
        data.access_token ||
        data.token ||
        data.jwt ||
        null;

      const user = data.user || data;

      if (!token || !user) {
        alert('Login response ongeldig');
        setLoading(false);
        return;
      }

      const session = {
        token,
        user,
      };

      // HARD SAVE
      localStorage.setItem('nen1090.session', JSON.stringify(session));
      localStorage.setItem('nen1090.auth', JSON.stringify(session));

      console.log('SESSION SET:', session);

      // HARD REDIRECT
      window.location.href = '/dashboard';

    } catch (err) {
      console.error(err);
      alert('Login fout');
    }

    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 400, padding: 32, borderRadius: 12, background: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginBottom: 20 }}>Inloggen</h2>

        <label>Tenant</label>
        <input value={tenant} onChange={(e) => setTenant(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />

        <label>E-mail</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />

        <label>Wachtwoord</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', marginBottom: 20 }} />

        <button onClick={handleLogin} disabled={loading} style={{ width: '100%', padding: 12 }}>
          {loading ? 'Bezig...' : 'Inloggen'}
        </button>
      </div>
    </div>
  );
}

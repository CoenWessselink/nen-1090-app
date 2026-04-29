import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTenantBillingStatus } from '@/api/billing';

export default function BillingSuccessPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Betaling wordt verwerkt...');

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const check = async () => {
      attempts += 1;
      try {
        const status = (await getTenantBillingStatus()) as { subscription?: { status?: string }; tenant_status?: string };
        const subStatus = String(status?.subscription?.status || status?.tenant_status || '').toLowerCase();
        if (subStatus === 'active') {
          navigate('/dashboard', { replace: true });
          return;
        }
        setMessage('Betaling ontvangen. We wachten nog op de Mollie webhook...');
      } catch {
        setMessage('Betaling ontvangen. Status wordt opnieuw gecontroleerd...');
      }
      if (!cancelled && attempts < 20) window.setTimeout(check, 2500);
      if (!cancelled && attempts >= 20) setMessage('Betaling wordt nog verwerkt. Je kunt deze pagina later verversen.');
    };

    check();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <section style={{ width: 'min(560px, 100%)', border: '1px solid #e5e7eb', borderRadius: 20, padding: 28, background: '#fff' }}>
        <h1 style={{ marginTop: 0 }}>Betaling verwerken</h1>
        <p>{message}</p>
        <button onClick={() => navigate('/billing')} style={{ padding: '10px 14px', borderRadius: 12 }}>Terug naar billing</button>
      </section>
    </main>
  );
}

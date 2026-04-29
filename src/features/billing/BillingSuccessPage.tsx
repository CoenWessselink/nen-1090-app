import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getTenantBillingStatus, getBillingPaymentStatus } from '@/api/billing';

export default function BillingSuccessPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const paymentId = params.get('payment_id');
  const [message, setMessage] = useState('Betaling wordt verwerkt...');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let count = 0;

    const check = async () => {
      count++;
      setAttempts(count);
      try {
        if (paymentId) {
          const payment = await getBillingPaymentStatus(paymentId);
          if (String((payment as any)?.status || '').toLowerCase() === 'paid') {
            setMessage('Betaling bevestigd. Je wordt doorgestuurd naar het dashboard.');
            setTimeout(() => navigate('/dashboard', { replace: true }), 900);
            return;
          }
        }
        const billing = await getTenantBillingStatus();
        const status = String((billing as any)?.subscription?.status || (billing as any)?.tenant_status || '').toLowerCase();
        if (status === 'active') {
          setMessage('Abonnement actief. Je wordt doorgestuurd naar het dashboard.');
          setTimeout(() => navigate('/dashboard', { replace: true }), 900);
          return;
        }
        setMessage('Wachten op Mollie bevestiging...');
      } catch {
        setMessage('Status wordt opnieuw gecontroleerd...');
      }
      if (!cancelled && count < 20) setTimeout(check, 2000);
      if (!cancelled && count >= 20) setMessage('Betaling wordt nog verwerkt. Controleer later je billingstatus.');
    };

    check();
    return () => { cancelled = true; };
  }, [navigate, paymentId]);

  return (
    <main className="billing-success-page">
      <section className="billing-success-card">
        <span className="billing-eyebrow">Mollie checkout</span>
        <h1>Betaling verwerken</h1>
        <p>{message}</p>
        <div className="billing-success-progress"><span style={{ width: `${Math.min((attempts / 20) * 100, 100)}%` }} /></div>
        <div className="billing-action-row">
          <button onClick={() => navigate('/dashboard')}>Naar dashboard</button>
          <button className="billing-secondary-button" onClick={() => navigate('/billing')}>Terug naar billing</button>
        </div>
      </section>
    </main>
  );
}

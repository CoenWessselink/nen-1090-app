import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getTenantBillingStatus, getBillingPaymentStatus } from '@/api/billing';

export default function BillingSuccessPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const paymentId = params.get('payment_id');

  const [message, setMessage] = useState('Betaling wordt verwerkt...');

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const check = async () => {
      attempts++;

      try {
        if (paymentId) {
          const payment = await getBillingPaymentStatus(paymentId);
          if (String((payment as any)?.status).toLowerCase() === 'paid') {
            navigate('/dashboard', { replace: true });
            return;
          }
        }

        const billing = await getTenantBillingStatus();
        const status = String((billing as any)?.subscription?.status || '').toLowerCase();

        if (status === 'active') {
          navigate('/dashboard', { replace: true });
          return;
        }

        setMessage('Wachten op bevestiging...');
      } catch {
        setMessage('Opnieuw proberen...');
      }

      if (!cancelled && attempts < 20) setTimeout(check, 2000);
    };

    check();
    return () => { cancelled = true; };
  }, [navigate, paymentId]);

  return (
    <main>
      <h1>Betaling verwerken</h1>
      <p>{message}</p>
    </main>
  );
}

import { useMemo, useState } from 'react';
import { AlertTriangle, CreditCard, FileText, RefreshCcw, ShieldCheck, Users } from 'lucide-react';
import { useBillingStatus, useBillingPreview, useChangePlan, useCancelSubscription } from '@/hooks/useBilling';
import { createTenantBillingCheckout } from '@/api/billing';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';

function text(value: unknown, fallback = '—') {
  return value === undefined || value === null || value === '' ? fallback : String(value);
}

function moneyFromCents(value: unknown) {
  const cents = Number(value || 0);
  if (!Number.isFinite(cents)) return '—';
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export default function BillingPage() {
  const [seats, setSeats] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  const statusQuery = useBillingStatus();
  const previewQuery = useBillingPreview({ target_seats: seats }, true);

  const status = (statusQuery.data || {}) as Record<string, unknown>;
  const preview = (previewQuery.data || {}) as Record<string, unknown>;

  const previewTotal = preview.total_cents || preview.amount_cents;

  async function handleCheckout() {
    try {
      setLoadingCheckout(true);
      const res = await createTenantBillingCheckout({ seats });
      window.location.href = res.checkout_url;
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Checkout fout');
    } finally {
      setLoadingCheckout(false);
    }
  }

  if (statusQuery.isLoading) return <LoadingState label="Billing laden..." />;
  if (statusQuery.isError) return <ErrorState title="Billing fout" description="Kon billing status niet laden." />;

  return (
    <div className="page-stack">
      <h1>Upgrade abonnement</h1>

      {errorMessage && <InlineMessage tone="danger">{errorMessage}</InlineMessage>}

      <Card>
        <label>
          Seats:
          <input type="number" min={1} value={seats} onChange={(e) => setSeats(Number(e.target.value))} />
        </label>

        <p>Prijs: {moneyFromCents(previewTotal)}</p>

        <Button onClick={handleCheckout} disabled={loadingCheckout}>
          {loadingCheckout ? 'Bezig...' : 'Ga naar betaling'}
        </Button>
      </Card>
    </div>
  );
}

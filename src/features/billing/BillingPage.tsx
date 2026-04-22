import { CreditCard, Download, ExternalLink, FileText, RefreshCcw, ShieldCheck, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import ModuleHero from '@/components/layout/ModuleHero';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { useBillingInvoices, useBillingPlans, useBillingPreview, useBillingStatus, useBillingStatusPlus, useCancelSubscription, useChangePlan, useCreatePaymentLink, useInvoicePdfActions } from '@/hooks/useBilling';
import { useAccess } from '@/hooks/useAccess';
import { buildAppReturnTo, buildMarketingUrl } from '@/features/auth/marketing-auth';
import { formatDatetime, toneFromStatus } from '@/utils/format';

function cents(value: unknown): string {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount / 100);
}

export function BillingPage() {
  const canManageBilling = useAccess('billing.manage');
  const billingStatus = useBillingStatus();
  const [seatTarget, setSeatTarget] = useState<number>(1);
  const [planTarget, setPlanTarget] = useState<string>('professional');
  const billingStatusPlus = useBillingStatusPlus();
  const invoices = useBillingInvoices();
  const plans = useBillingPlans();
  const changePlan = useChangePlan();
  const pdfActions = useInvoicePdfActions();
  const paymentLink = useCreatePaymentLink();
  const cancelSubscription = useCancelSubscription();
  const status = billingStatus.data || {};
  const statusPlus = billingStatusPlus.data || {};
  const invoiceRows = Array.isArray(invoices.data?.items) ? invoices.data?.items : [];
  const planRows = Array.isArray(plans.data?.items) ? plans.data.items : [];
  const subscription = (statusPlus as any)?.subscription || {};
  const accessSnapshot = (statusPlus as any)?.access_snapshot || {};
  const marketingSubscriptionUrl = buildMarketingUrl('subscription', {
    next: buildAppReturnTo('/billing'),
    query: {
      source: 'nen1090-app',
      returnTo: buildAppReturnTo('/billing'),
    },
  });

  const currentSeats = Number(status.seats_purchased || subscription.seats || 1);
  const currentPlan = String((status as any)?.plan || (subscription as any)?.plan?.code || 'professional');
  const billingPreview = useBillingPreview(seatTarget, planTarget, true);

  useEffect(() => {
    setSeatTarget((current) => (current === 1 ? currentSeats : current));
    setPlanTarget((current) => (current === 'professional' ? currentPlan : current));
  }, [currentSeats, currentPlan]);

  const effectivePlanRows = planRows.length ? planRows : [{ code: currentPlan, name: currentPlan, price_cents: Number(status.price_per_seat_year_cents || 0) }];

  const savePlanChange = async () => {
    await changePlan.mutateAsync({ target_seats: seatTarget, seats: seatTarget, plan_code: planTarget, plan: planTarget });
    await Promise.all([billingStatus.refetch(), billingStatusPlus.refetch(), invoices.refetch()]);
  };

  const openCheckout = async () => {
    const payload = await paymentLink.mutateAsync({
      plan: planTarget || currentPlan,
      seats: seatTarget || currentSeats,
    });
    const checkoutUrl = String((payload as any)?.checkout_url || marketingSubscriptionUrl || '');
    if (checkoutUrl) window.location.href = checkoutUrl;
  };

  const handleCancel = async () => {
    await cancelSubscription.mutateAsync();
    billingStatus.refetch();
    billingStatusPlus.refetch();
  };

  if (seatTarget !== currentSeats && seatTarget === 1 && currentSeats > 1) {
    // initialize only once based on current subscription
  }

  const summaryRows = [
    { label: 'Status', value: String(status.status || subscription.status || 'Onbekend') },
    { label: 'Access mode', value: String(subscription.access_mode || accessSnapshot.access_mode || '—') },
    { label: 'Seats', value: String(status.seats_purchased || subscription.seats || '—') },
    { label: 'Gebruikers actief', value: String(status.users_count || '—') },
    { label: 'Volgende factuurdatum', value: formatDatetime(String(status.mollie_next_payment_date || status.valid_until || subscription.current_period_end || '')) || 'Niet beschikbaar' },
    { label: 'Prijs / jaar', value: cents(status.price_per_seat_year_cents) },
  ];

  return (
    <div className="page-stack">
      <ModuleHero
        title="Billing"
        description="Facturatie, tenantstatus en factuurdocumenten zijn nu ook in de app zichtbaar, terwijl checkout en plan-self-service centraal blijven lopen."
        kicker="Facturatiebasis fase 3"
        actions={
          <>
            <Button onClick={openCheckout} disabled={paymentLink.isPending}><Wallet size={16} /> Betaling / checkout</Button>
            <a href={marketingSubscriptionUrl} target="_self" rel="noreferrer"><Button variant="secondary">Open centraal abonnement</Button></a>
            <Button variant="secondary" onClick={() => { billingStatus.refetch(); billingStatusPlus.refetch(); invoices.refetch(); }}><RefreshCcw size={16} /> Verversen</Button>
          </>
        }
        tiles={[
          { label: 'Status', value: String(status.status || subscription.status || 'Onbekend'), meta: 'Huidige tenantstatus', icon: CreditCard, tone: 'primary' },
          { label: 'Access', value: String(subscription.access_mode || accessSnapshot.access_mode || '—'), meta: 'Doorwerking vanuit billing/access rules', icon: ShieldCheck, tone: 'success' },
          { label: 'Open facturen', value: String(invoiceRows.filter((row: any) => Number(row.balance_due_cents || 0) > 0).length), meta: 'Direct zichtbaar in tenantomgeving', icon: FileText, tone: 'warning' },
          { label: 'Self-service', value: canManageBilling ? 'Beheer actief' : 'Alleen lezen', meta: 'Planwijziging en checkout blijven centraal', icon: ExternalLink, onClick: () => { window.location.href = marketingSubscriptionUrl; }, tone: 'neutral' },
        ]}
      />

      {!canManageBilling ? <InlineMessage tone="neutral">Je kunt hier billingstatus en facturen bekijken. Checkout, betaalprovider en planwissels lopen via de centrale abonnementsshell.</InlineMessage> : null}

      <div className="kpi-strip">
        {summaryRows.map((row) => (
          <div key={row.label} className="kpi-card">
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>

      <div className="content-grid-2">
        <Card>
          <div className="section-title-row">
            <h3><CreditCard size={18} /> Abonnement en toegang</h3>
            <Badge tone={toneFromStatus(String(status.status || subscription.status || 'neutral'))}>{String(status.status || subscription.status || 'Onbekend')}</Badge>
          </div>
          <div className="detail-grid" style={{ marginTop: 12 }}>
            {summaryRows.map((row) => (
              <div key={row.label}><span>{row.label}</span><strong>{row.value}</strong></div>
            ))}
          </div>
          <div className="stack-actions" style={{ marginTop: 16, gap: 8, display: 'flex', flexWrap: 'wrap' }}>
            <Button onClick={openCheckout} disabled={paymentLink.isPending}><Wallet size={16} /> Start betaling</Button>
            <Button variant="secondary" onClick={handleCancel} disabled={cancelSubscription.isPending}><ExternalLink size={16} /> Abonnement annuleren</Button>
            <a href={marketingSubscriptionUrl} target="_self" rel="noreferrer"><Button variant="secondary"><ExternalLink size={16} /> Open centraal abonnement</Button></a>
          </div>
        </Card>


        <Card>
          <div className="section-title-row">
            <h3><Wallet size={18} /> Self-service planwijziging</h3>
            <Badge tone="neutral">Preview</Badge>
          </div>
          <div className="content-grid-2" style={{ marginTop: 12 }}>
            <label>
              <span>Plan</span>
              <Select value={planTarget} onChange={(event) => setPlanTarget(event.target.value)}>
                {effectivePlanRows.map((plan: any) => <option key={String(plan.code)} value={String(plan.code)}>{String(plan.name || plan.code)} · {cents(plan.price_cents || plan.price_per_seat_cents)}</option>)}
              </Select>
            </label>
            <label>
              <span>Seats</span>
              <Input type="number" min={1} value={seatTarget} onChange={(event) => setSeatTarget(Math.max(Number(event.target.value || 1), 1))} />
            </label>
          </div>
          <div className="detail-grid" style={{ marginTop: 12 }}>
            <div><span>Huidig</span><strong>{currentPlan} · {currentSeats} seats</strong></div>
            <div><span>Actie</span><strong>{String((billingPreview.data as any)?.action || 'preview')}</strong></div>
            <div><span>Nieuw totaal</span><strong>{cents((billingPreview.data as any)?.new_total_cents || (billingPreview.data as any)?.amount_cents_year)}</strong></div>
            <div><span>Ingang</span><strong>{formatDatetime(String((billingPreview.data as any)?.effective_at || '')) || 'Direct of einde periode'}</strong></div>
          </div>
          <div className="stack-actions" style={{ marginTop: 16, gap: 8, display: 'flex', flexWrap: 'wrap' }}>
            <Button onClick={savePlanChange} disabled={changePlan.isPending}>Wijzig plan</Button>
            <Button variant="secondary" onClick={openCheckout} disabled={paymentLink.isPending}>Naar checkout</Button>
          </div>
        </Card>

        <Card>
          <div className="section-title-row">
            <h3><FileText size={18} /> Facturen</h3>
            <Badge tone="neutral">{String(invoiceRows.length)} documenten</Badge>
          </div>
          {invoices.isLoading ? <LoadingState label="Facturen laden..." /> : null}
          {invoices.isError ? <ErrorState title="Facturen niet geladen" description="Controleer of /tenant/billing/invoices bereikbaar is." /> : null}
          {!invoices.isLoading && !invoiceRows.length ? <InlineMessage tone="neutral">Er zijn nog geen facturen beschikbaar voor deze tenant.</InlineMessage> : null}
          <div className="list-stack compact-list">
            {invoiceRows.map((row: any) => (
              <div key={String(row.id)} className="list-row">
                <div>
                  <strong>{String(row.number || row.id || 'Factuur')}</strong>
                  <div className="list-subtle">{cents(row.total_cents || row.balance_due_cents)} · vervalt {formatDatetime(String(row.due_date || row.created_at || '')) || 'onbekend'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Badge tone={toneFromStatus(String(row.status || 'neutral'))}>{String(row.status || 'Onbekend')}</Badge>
                  <Button variant="secondary" onClick={() => pdfActions.openInvoicePdf.mutate(String(row.id))}><Download size={16} /> Open</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {paymentLink.isSuccess ? <InlineMessage tone="neutral">Checkoutlink aangemaakt en doorgestuurd.</InlineMessage> : null}
      {changePlan.isSuccess ? <InlineMessage tone="neutral">Planwijziging opgeslagen en billingstatus ververst.</InlineMessage> : null}
      {cancelSubscription.isSuccess ? <InlineMessage tone="neutral">Abonnement is opgezegd. Toegang blijft actief tot einde periode.</InlineMessage> : null}
      {billingStatus.isLoading || billingStatusPlus.isLoading ? <LoadingState label="Billingstatus laden..." /> : null}
      {billingStatus.isError ? <ErrorState title="Billingstatus niet geladen" description="Controleer of /tenant/billing/status bereikbaar is." /> : null}
    </div>
  );
}

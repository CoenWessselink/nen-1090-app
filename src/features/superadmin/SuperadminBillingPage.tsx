import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Building2, AlertTriangle, TrendingUp } from 'lucide-react';
import { getPlatformBillingOverview } from '@/api/platformBilling';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import type { PlatformBillingOverview } from '@/api/enterpriseTypes';

function euro(cents: unknown) {
  const amount = Number(cents || 0);
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount / 100);
}

export default function SuperadminBillingPage() {
  const [data, setData] = useState<PlatformBillingOverview>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlatformBillingOverview()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Billing overview niet beschikbaar'));
  }, []);

  const kpis = data.kpis || {};
  const tenants = Array.isArray(data.tenants) ? data.tenants : [];
  const payments = useMemo(() => (Array.isArray(data.payments) ? data.payments : []), [data.payments]);
  const invoices = Array.isArray(data.invoices) ? data.invoices : [];

  const failedPayments = useMemo(() => payments.filter((p) => String(p.status || '').toLowerCase().includes('fail')), [payments]);

  return (
    <MobilePageScaffold title="Superadmin billing" subtitle="MRR, ARR, omzet en mislukte betalingen">
      <div className="superadmin-page">
        {error ? (
          <Card>
            <strong>Billing dashboard niet geladen</strong>
            <p>{error}</p>
          </Card>
        ) : null}

        <div className="mobile-kpi-grid">
          <div className="mobile-kpi-card mobile-kpi-card-primary">
            <div className="mobile-kpi-top" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} aria-hidden />
              <span>MRR</span>
            </div>
            <strong>{euro(kpis.mrr_cents)}</strong>
            <small style={{ color: 'rgba(255,255,255,0.82)' }}>Monthly recurring revenue</small>
          </div>
          <div className="mobile-kpi-card mobile-kpi-card-success">
            <div className="mobile-kpi-top" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} aria-hidden />
              <span>ARR</span>
            </div>
            <strong>{euro(kpis.arr_cents)}</strong>
            <small style={{ color: 'rgba(255,255,255,0.82)' }}>Annual recurring revenue</small>
          </div>
          <div className="mobile-kpi-card mobile-kpi-card-warning">
            <div className="mobile-kpi-top" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CreditCard size={16} aria-hidden />
              <span>30 dagen</span>
            </div>
            <strong>{euro(kpis.revenue_30d_cents)}</strong>
            <small style={{ color: 'rgba(255,255,255,0.82)' }}>Omzet laatste 30 dagen</small>
          </div>
          <div className="mobile-kpi-card mobile-kpi-card-secondary">
            <div className="mobile-kpi-top" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} aria-hidden />
              <span>Failed</span>
            </div>
            <strong>{String(kpis.failed_payments ?? failedPayments.length)}</strong>
            <small style={{ color: 'rgba(255,255,255,0.82)' }}>Mislukte betalingen</small>
          </div>
        </div>

        <div className="content-grid-2">
          <Card>
            <div className="section-title-row">
              <h3>
                <Building2 size={18} /> Tenant billing status
              </h3>
            </div>
            <div className="list-stack">
              {tenants.slice(0, 20).map((tenant) => (
                <div className="list-row" key={String(tenant.tenant_id)}>
                  <strong>{String(tenant.tenant_name || tenant.tenant_id)}</strong>
                  <span>
                    {String(tenant.status || '-')} · {String(tenant.subscription_status || 'geen subscription')}
                  </span>
                  <Badge tone={String(tenant.access_mode || '').includes('full') ? 'success' : 'warning'}>{String(tenant.access_mode || 'unknown')}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="section-title-row">
              <h3>
                <CreditCard size={18} /> Laatste betalingen
              </h3>
            </div>
            <div className="list-stack">
              {payments.slice(0, 20).map((payment) => (
                <div className="list-row" key={String(payment.id)}>
                  <strong>{euro(payment.amount_cents)}</strong>
                  <span>
                    {String(payment.status || '-')} · {String(payment.provider || '-')}
                  </span>
                  <small>{String(payment.created_at || '')}</small>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card>
          <div className="section-title-row">
            <h3>Facturen</h3>
          </div>
          <div className="responsive-table-wrap">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Nummer</th>
                  <th>Status</th>
                  <th>Bedrag</th>
                  <th>BTW</th>
                  <th>Tenant</th>
                </tr>
              </thead>
              <tbody>
                {invoices.slice(0, 30).map((invoice) => (
                  <tr key={String(invoice.id)}>
                    <td>{String(invoice.invoice_number || invoice.id)}</td>
                    <td>{String(invoice.status || '-')}</td>
                    <td>{euro(invoice.total_cents)}</td>
                    <td>{euro(invoice.vat_cents)}</td>
                    <td>{String(invoice.tenant_id || '-')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </MobilePageScaffold>
  );
}

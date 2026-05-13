import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Building2, AlertTriangle, TrendingUp } from 'lucide-react';
import { apiRequest } from '@/api/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

function euro(cents: unknown) {
  const amount = Number(cents || 0);
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount / 100);
}

type Overview = {
  kpis?: Record<string, number>;
  tenants?: Array<Record<string, unknown>>;
  payments?: Array<Record<string, unknown>>;
  invoices?: Array<Record<string, unknown>>;
};

export default function SuperadminBillingPage() {
  const [data, setData] = useState<Overview>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<Overview>('/platform/billing/overview')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Billing overview niet beschikbaar'));
  }, []);

  const kpis = data.kpis || {};
  const tenants = Array.isArray(data.tenants) ? data.tenants : [];
  const payments = Array.isArray(data.payments) ? data.payments : [];
  const invoices = Array.isArray(data.invoices) ? data.invoices : [];

  const failedPayments = useMemo(() => payments.filter((p) => String(p.status || '').toLowerCase().includes('fail')), [payments]);

  return (
    <div className="page-stack superadmin-page">
      <PageHeader
        title="Superadmin billing"
        description="MRR, ARR, omzet laatste 30 dagen, mislukte betalingen en tenant-facturatie — zelfde KPI-tegels als het dashboard."
      />

      {error ? (
        <Card>
          <strong>Billing dashboard niet geladen</strong>
          <p>{error}</p>
        </Card>
      ) : null}

      <div className="dashboard-kpi-grid">
        <div className="card stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={16} aria-hidden />
            MRR
          </div>
          <div className="stat-value">{euro(kpis.mrr_cents)}</div>
          <div className="stat-meta">Monthly recurring revenue</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={16} aria-hidden />
            ARR
          </div>
          <div className="stat-value">{euro(kpis.arr_cents)}</div>
          <div className="stat-meta">Annual recurring revenue</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={16} aria-hidden />
            30 dagen
          </div>
          <div className="stat-value">{euro(kpis.revenue_30d_cents)}</div>
          <div className="stat-meta">Omzet laatste 30 dagen</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} aria-hidden />
            Failed
          </div>
          <div className="stat-value">{String(kpis.failed_payments ?? failedPayments.length)}</div>
          <div className="stat-meta">Mislukte betalingen</div>
        </div>
      </div>

      <div className="content-grid-2">
        <Card>
          <div className="section-title-row"><h3><Building2 size={18} /> Tenant billing status</h3></div>
          <div className="list-stack">
            {tenants.slice(0, 20).map((tenant) => (
              <div className="list-row" key={String(tenant.tenant_id)}>
                <strong>{String(tenant.tenant_name || tenant.tenant_id)}</strong>
                <span>{String(tenant.status || '-')} · {String(tenant.subscription_status || 'geen subscription')}</span>
                <Badge tone={String(tenant.access_mode || '').includes('full') ? 'success' : 'warning'}>{String(tenant.access_mode || 'unknown')}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="section-title-row"><h3><CreditCard size={18} /> Laatste betalingen</h3></div>
          <div className="list-stack">
            {payments.slice(0, 20).map((payment) => (
              <div className="list-row" key={String(payment.id)}>
                <strong>{euro(payment.amount_cents)}</strong>
                <span>{String(payment.status || '-')} · {String(payment.provider || '-')}</span>
                <small>{String(payment.created_at || '')}</small>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="section-title-row"><h3>Facturen</h3></div>
        <div className="responsive-table-wrap">
          <table className="enterprise-table">
            <thead><tr><th>Nummer</th><th>Status</th><th>Bedrag</th><th>BTW</th><th>Tenant</th></tr></thead>
            <tbody>{invoices.slice(0, 30).map((invoice) => <tr key={String(invoice.id)}><td>{String(invoice.invoice_number || invoice.id)}</td><td>{String(invoice.status || '-')}</td><td>{euro(invoice.total_cents)}</td><td>{euro(invoice.vat_cents)}</td><td>{String(invoice.tenant_id || '-')}</td></tr>)}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

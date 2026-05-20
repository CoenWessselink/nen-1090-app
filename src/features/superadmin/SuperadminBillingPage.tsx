import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Building2, AlertTriangle, TrendingUp, Download } from 'lucide-react';
import { getPlatformBillingOverview } from '@/api/platformBilling';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import type { BillingInvoice, PlatformBillingOverview } from '@/api/enterpriseTypes';

function euro(cents: unknown) {
  const amount = Number(cents || 0);
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount / 100);
}

function dateStamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDate(value: unknown) {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('nl-NL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function escapeExcelHtml(value: unknown) {
  return String(value ?? '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function centsToDecimal(cents: unknown) {
  const amount = Number(cents || 0);
  return Number.isFinite(amount) ? amount / 100 : 0;
}

function resolveInvoiceTotal(invoice: BillingInvoice) {
  return invoice.total_cents ?? invoice.totaal_cents ?? 0;
}

function resolveInvoiceVat(invoice: BillingInvoice) {
  return invoice.vat_cents ?? invoice.btw_cents ?? 0;
}

function buildInvoiceExcelHtml(invoices: BillingInvoice[], tenantNameById: Map<string, string>) {
  const generatedAt = new Intl.DateTimeFormat('nl-NL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  const rows = invoices
    .map((invoice) => {
      const tenantId = String(invoice.tenant_id || '-');
      const tenantName = tenantNameById.get(tenantId) || tenantId;
      const total = centsToDecimal(resolveInvoiceTotal(invoice));
      const vat = centsToDecimal(resolveInvoiceVat(invoice));
      const subtotal = centsToDecimal(invoice.subtotal_cents ?? Math.max(resolveInvoiceTotal(invoice) - resolveInvoiceVat(invoice), 0));
      const balanceDue = centsToDecimal(invoice.balance_due_cents ?? 0);
      const lineCount = Array.isArray(invoice.lines) ? invoice.lines.length : 0;

      return `
        <tr>
          <td>${escapeExcelHtml(invoice.invoice_number || invoice.number || invoice.id)}</td>
          <td>${escapeExcelHtml(invoice.status || '-')}</td>
          <td>${escapeExcelHtml(tenantName)}</td>
          <td>${escapeExcelHtml(tenantId)}</td>
          <td class="currency">${subtotal.toFixed(2)}</td>
          <td class="currency">${vat.toFixed(2)}</td>
          <td class="currency total-cell">${total.toFixed(2)}</td>
          <td class="currency">${balanceDue.toFixed(2)}</td>
          <td>${escapeExcelHtml(formatDate(invoice.due_date))}</td>
          <td>${escapeExcelHtml(formatDate(invoice.sent_at))}</td>
          <td>${escapeExcelHtml(formatDate(invoice.paid_at))}</td>
          <td>${lineCount}</td>
        </tr>`;
    })
    .join('');

  const grandTotal = invoices.reduce((sum, invoice) => sum + centsToDecimal(resolveInvoiceTotal(invoice)), 0);
  const grandVat = invoices.reduce((sum, invoice) => sum + centsToDecimal(resolveInvoiceVat(invoice)), 0);
  const grandSubtotal = invoices.reduce(
    (sum, invoice) => sum + centsToDecimal(invoice.subtotal_cents ?? Math.max(resolveInvoiceTotal(invoice) - resolveInvoiceVat(invoice), 0)),
    0,
  );
  const grandBalanceDue = invoices.reduce((sum, invoice) => sum + centsToDecimal(invoice.balance_due_cents ?? 0), 0);

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Facturen</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
  <style>
    body { font-family: Aptos, Calibri, Arial, sans-serif; color: #0f172a; }
    .title { font-size: 22px; font-weight: 800; color: #0f172a; }
    .subtitle { color: #475569; font-size: 12px; }
    .meta { background: #eef6f7; color: #0f172a; font-weight: 700; }
    table { border-collapse: collapse; width: 100%; }
    th { background: #0f766e; color: #ffffff; font-weight: 800; border: 1px solid #0f766e; padding: 10px; text-align: left; }
    td { border: 1px solid #d7e3e5; padding: 8px; vertical-align: middle; }
    tr:nth-child(even) td { background: #f8fbfc; }
    .currency { mso-number-format:'€ #,##0.00'; text-align: right; }
    .total-cell { font-weight: 700; color: #0f766e; }
    .summary-label { background: #e2eef0; font-weight: 800; }
    .summary-value { background: #e2eef0; font-weight: 800; color: #0f766e; mso-number-format:'€ #,##0.00'; text-align: right; }
  </style>
</head>
<body>
  <table>
    <tr><td colspan="12" class="title">WeldInspect Pro — Facturenoverzicht</td></tr>
    <tr><td colspan="12" class="subtitle">Geëxporteerd op ${escapeExcelHtml(generatedAt)} · ${invoices.length} facturen</td></tr>
    <tr><td colspan="12"></td></tr>
    <tr>
      <td class="meta">Aantal facturen</td><td>${invoices.length}</td>
      <td class="meta">Totaal excl. BTW</td><td class="summary-value">${grandSubtotal.toFixed(2)}</td>
      <td class="meta">BTW</td><td class="summary-value">${grandVat.toFixed(2)}</td>
      <td class="meta">Totaal incl. BTW</td><td class="summary-value">${grandTotal.toFixed(2)}</td>
      <td class="meta">Openstaand</td><td class="summary-value">${grandBalanceDue.toFixed(2)}</td>
      <td colspan="2"></td>
    </tr>
    <tr><td colspan="12"></td></tr>
    <tr>
      <th>Factuurnummer</th>
      <th>Status</th>
      <th>Tenant</th>
      <th>Tenant ID</th>
      <th>Excl. BTW</th>
      <th>BTW</th>
      <th>Incl. BTW</th>
      <th>Openstaand</th>
      <th>Vervaldatum</th>
      <th>Verzonden</th>
      <th>Betaald</th>
      <th>Regels</th>
    </tr>
    ${rows || '<tr><td colspan="12">Geen facturen beschikbaar.</td></tr>'}
  </table>
</body>
</html>`;
}

function downloadInvoiceExcel(invoices: BillingInvoice[], tenantNameById: Map<string, string>) {
  const html = buildInvoiceExcelHtml(invoices, tenantNameById);
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `WeldInspect-Pro-Facturen-${dateStamp()}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
  const invoices = useMemo(() => (Array.isArray(data.invoices) ? data.invoices : []), [data.invoices]);
  const tenantNameById = useMemo(() => {
    const map = new Map<string, string>();
    tenants.forEach((tenant) => {
      const id = String(tenant.tenant_id || '');
      const name = String(tenant.tenant_name || tenant.tenant_id || '');
      if (id && name) map.set(id, name);
    });
    return map;
  }, [tenants]);

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
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => downloadInvoiceExcel(invoices, tenantNameById)}
              disabled={!invoices.length}
              title={invoices.length ? 'Exporteer facturenoverzicht naar Excel' : 'Geen facturen beschikbaar om te exporteren'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Download size={16} aria-hidden />
              Export Excel
            </button>
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
                    <td>{euro(resolveInvoiceTotal(invoice))}</td>
                    <td>{euro(resolveInvoiceVat(invoice))}</td>
                    <td>{String(invoice.tenant_id || '-')}</td>
                  </tr>
                ))}
                {!invoices.length ? (
                  <tr>
                    <td colSpan={5}>Geen facturen beschikbaar.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </MobilePageScaffold>
  );
}

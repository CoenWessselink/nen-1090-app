import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiRequest } from '@/api/client';
import { recalcInvoice, type Invoice } from './invoiceStore';
import './invoice-pdf.css';

function eur(cents: number) { return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format((Number(cents) || 0) / 100); }
function fmtDate(v: string) { if (!v) return '—'; const d = new Date(v); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('nl-NL'); }

function statusLabel(s: string) {
  if (s === 'paid') return 'BETAALD';
  if (s === 'sent') return 'VERZONDEN';
  if (s === 'overdue') return 'VERLOPEN';
  if (s === 'cancelled') return 'GEANNULEERD';
  return 'CONCEPT';
}

function normalizeInvoice(payload: Partial<Invoice>): Invoice {
  return recalcInvoice({
    id: String(payload.id || ''),
    number: String(payload.number || ''),
    tenant_id: String(payload.tenant_id || ''),
    tenant_name: String(payload.tenant_name || payload.company_name || ''),
    company_name: String(payload.company_name || payload.tenant_name || ''),
    address: String(payload.address || ''),
    postcode: String(payload.postcode || ''),
    city: String(payload.city || ''),
    country: String(payload.country || 'Nederland'),
    vat_number: String(payload.vat_number || ''),
    kvk: String(payload.kvk || ''),
    email: String(payload.email || ''),
    status: (payload.status || 'draft') as Invoice['status'],
    currency: String(payload.currency || 'EUR'),
    subtotal_cents: Number(payload.subtotal_cents || 0),
    vat_percent: Number(payload.vat_percent ?? 21),
    vat_cents: Number(payload.vat_cents || 0),
    total_cents: Number(payload.total_cents || 0),
    lines: Array.isArray(payload.lines) ? payload.lines : [],
    issue_date: String(payload.issue_date || new Date().toISOString().slice(0, 10)),
    due_date: String(payload.due_date || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)),
    paid_at: payload.paid_at || null,
    notes: String(payload.notes || ''),
    created_at: String(payload.created_at || new Date().toISOString()),
    created_by: String(payload.created_by || ''),
  });
}

export function InvoicePdfPage() {
  const { invoiceId = '' } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    apiRequest<Invoice>(`/superadmin/invoices/${invoiceId}`)
      .then((data) => { if (active) setInvoice(normalizeInvoice(data)); })
      .catch((err) => { if (active) { setInvoice(null); setError(err instanceof Error ? err.message : 'Factuur laden mislukt.'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [invoiceId]);

  if (loading) return <div className="inv-pdf-wrap"><div className="inv-pdf-page"><p>Factuur laden…</p></div></div>;
  if (!invoice) return <div className="inv-pdf-wrap"><div className="inv-pdf-page"><p>{error || 'Factuur niet gevonden.'}</p></div></div>;

  return (
    <div className="inv-pdf-wrap">
      <button type="button" className="inv-print-btn" onClick={() => window.print()}>⎙ Afdrukken / PDF opslaan</button>
      <div className="inv-pdf-page">
        <div className="inv-header">
          <div className="inv-brand">
            <div className="inv-logo">W</div>
            <div><strong>WeldInspect Pro</strong><small>Enterprise Weld Compliance Platform</small></div>
          </div>
          <div className="inv-doc-title">
            <h1>Factuur</h1>
            <span className={`inv-status inv-status-${invoice.status}`}>{statusLabel(invoice.status)}</span>
          </div>
        </div>

        <div className="inv-meta-grid">
          <div><h3>Factuurnummer</h3><strong>{invoice.number}</strong></div>
          <div><h3>Factuurdatum</h3><strong>{fmtDate(invoice.issue_date)}</strong></div>
          <div><h3>Vervaldatum</h3><strong>{fmtDate(invoice.due_date)}</strong></div>
          <div><h3>Status</h3><strong>{statusLabel(invoice.status)}</strong></div>
        </div>

        <div className="inv-addresses">
          <div>
            <h3>Van</h3>
            <strong>CWS Projectmanagement & Engineering</strong>
            <p>Veldovenweg<br />7621GR Borne<br />Nederland</p>
            <p>KvK: 90570685<br />BTW: NL865882739B01</p>
          </div>
          <div>
            <h3>Aan</h3>
            <strong>{invoice.company_name || invoice.tenant_name}</strong>
            {invoice.address && <p>{invoice.address}<br />{invoice.postcode} {invoice.city}<br />{invoice.country}</p>}
            {invoice.vat_number && <p>BTW: {invoice.vat_number}</p>}
            {invoice.kvk && <p>KvK: {invoice.kvk}</p>}
            {invoice.email && <p>{invoice.email}</p>}
          </div>
        </div>

        <table className="inv-table">
          <thead><tr><th>Omschrijving</th><th>Aantal</th><th>Prijs</th><th>Totaal</th></tr></thead>
          <tbody>
            {invoice.lines.map((line, i) => (
              <tr key={i}><td>{line.description}</td><td>{line.quantity}</td><td>{eur(line.unit_price_cents)}</td><td>{eur(line.total_cents)}</td></tr>
            ))}
          </tbody>
        </table>

        <div className="inv-totals">
          <div><span>Subtotaal</span><strong>{eur(invoice.subtotal_cents)}</strong></div>
          <div><span>BTW ({invoice.vat_percent}%)</span><strong>{eur(invoice.vat_cents)}</strong></div>
          <div className="inv-total-row"><span>Totaal</span><strong>{eur(invoice.total_cents)}</strong></div>
        </div>

        {invoice.notes && <div className="inv-notes"><h3>Opmerkingen</h3><p>{invoice.notes}</p></div>}

        <div className="inv-footer">
          <p>WeldInspect Pro · CWS Projectmanagement & Engineering · Veldovenweg · 7621GR Borne · Nederland</p>
          <p>KvK 90570685 · BTW NL865882739B01 · IBAN NL00RABO0000000000</p>
        </div>
      </div>
    </div>
  );
}

export default InvoicePdfPage;

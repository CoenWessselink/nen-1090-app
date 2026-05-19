import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getInvoice, type Invoice } from './invoiceStore';
import './invoice-pdf.css';

function eur(cents: number) { return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100); }
function fmtDate(v: string) { if (!v) return '—'; const d = new Date(v); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('nl-NL'); }

function statusLabel(s: string) {
  if (s === 'paid') return 'BETAALD';
  if (s === 'sent') return 'VERZONDEN';
  if (s === 'overdue') return 'VERLOPEN';
  if (s === 'cancelled') return 'GEANNULEERD';
  return 'CONCEPT';
}

export function InvoicePdfPage() {
  const { invoiceId = '' } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  useEffect(() => { setInvoice(getInvoice(invoiceId)); }, [invoiceId]);

  if (!invoice) return <div className="inv-pdf-wrap"><div className="inv-pdf-page"><p>Factuur niet gevonden.</p></div></div>;

  return (
    <div className="inv-pdf-wrap">
      <button type="button" className="inv-print-btn" onClick={() => window.print()}>⎙ Afdrukken / PDF opslaan</button>
      <div className="inv-pdf-page">
        {/* Header */}
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

        {/* Meta */}
        <div className="inv-meta-grid">
          <div>
            <h3>Factuurnummer</h3>
            <strong>{invoice.number}</strong>
          </div>
          <div>
            <h3>Factuurdatum</h3>
            <strong>{fmtDate(invoice.issue_date)}</strong>
          </div>
          <div>
            <h3>Vervaldatum</h3>
            <strong>{fmtDate(invoice.due_date)}</strong>
          </div>
          <div>
            <h3>Status</h3>
            <strong>{statusLabel(invoice.status)}</strong>
          </div>
        </div>

        {/* Addresses */}
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

        {/* Line items */}
        <table className="inv-table">
          <thead>
            <tr><th>Omschrijving</th><th>Aantal</th><th>Prijs</th><th>Totaal</th></tr>
          </thead>
          <tbody>
            {invoice.lines.map((line, i) => (
              <tr key={i}><td>{line.description}</td><td>{line.quantity}</td><td>{eur(line.unit_price_cents)}</td><td>{eur(line.total_cents)}</td></tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="inv-totals">
          <div><span>Subtotaal</span><strong>{eur(invoice.subtotal_cents)}</strong></div>
          <div><span>BTW ({invoice.vat_percent}%)</span><strong>{eur(invoice.vat_cents)}</strong></div>
          <div className="inv-total-row"><span>Totaal</span><strong>{eur(invoice.total_cents)}</strong></div>
        </div>

        {/* Notes */}
        {invoice.notes && <div className="inv-notes"><h3>Opmerkingen</h3><p>{invoice.notes}</p></div>}

        {/* Footer */}
        <div className="inv-footer">
          <p>WeldInspect Pro · CWS Projectmanagement & Engineering · Veldovenweg · 7621GR Borne · Nederland</p>
          <p>KvK 90570685 · BTW NL865882739B01 · IBAN NL00RABO0000000000</p>
        </div>
      </div>
    </div>
  );
}

export default InvoicePdfPage;

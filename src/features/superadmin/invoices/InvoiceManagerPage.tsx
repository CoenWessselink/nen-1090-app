import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Gauge, ListChecks, Plus, Printer, RefreshCcw, Search, Shield, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '@/api/client';
import { useSession } from '@/app/session/SessionContext';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog';
import { createBlankInvoice, recalcInvoice, type Invoice, type InvoiceLineItem } from './invoiceStore';
import '../commercial-governance/commercial-governance.css';

function eur(cents: number) { return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format((Number(cents) || 0) / 100); }
function fmtDate(v: string) { if (!v) return '—'; const d = new Date(v); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('nl-NL'); }
function statusTone(s: string) { if (s === 'paid') return 'success'; if (s === 'overdue') return 'danger'; if (s === 'sent') return 'info'; return 'neutral'; }
function statusLabel(s: string) { if (s === 'paid') return 'Betaald'; if (s === 'sent') return 'Verzonden'; if (s === 'overdue') return 'Verlopen'; if (s === 'cancelled') return 'Geannuleerd'; return 'Concept'; }

type TenantOption = { id: string; name: string; display_name: string };
type BillingMode = 'create' | 'overview';
type InvoiceListResponse = { items?: Invoice[]; total?: number } | Invoice[];

function normalizeInvoice(payload: Partial<Invoice>): Invoice {
  return recalcInvoice({
    id: String(payload.id || `draft-${Date.now()}`),
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

async function fetchInvoices(search?: string): Promise<Invoice[]> {
  const qs = new URLSearchParams();
  qs.set('limit', '500');
  if (search?.trim()) qs.set('search', search.trim());
  const response = await apiRequest<InvoiceListResponse>(`/superadmin/invoices?${qs.toString()}`);
  const rows = Array.isArray(response) ? response : response.items || [];
  return rows.map((row) => normalizeInvoice(row));
}

function invoicePayload(invoice: Invoice, persisted: boolean) {
  const updated = recalcInvoice(invoice);
  return {
    ...updated,
    number: persisted ? updated.number : undefined,
    lines: updated.lines.map((line) => ({
      description: line.description,
      quantity: Number(line.quantity || 0),
      unit_price_cents: Number(line.unit_price_cents || 0),
      total_cents: Number(line.total_cents || 0),
    })),
  };
}

export function InvoiceManagerPage() {
  const navigate = useNavigate();
  const session = useSession();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [mode, setMode] = useState<BillingMode>('overview');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setInvoices(await fetchInvoices(search));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Facturen laden mislukt.');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { void reload(); }, [reload]);

  useEffect(() => {
    apiRequest<{ tenants?: TenantOption[] }>('/superadmin/tenants?limit=250')
      .then((d) => setTenants(d.tenants || []))
      .catch(() => setTenants([]));
  }, []);

  const filtered = useMemo(() => invoices, [invoices]);

  function newDraftForTenant(tenantId?: string) {
    const first = tenantId ? tenants.find((x) => x.id === tenantId) : tenants[0];
    const inv = createBlankInvoice(first?.id || '', first?.display_name || first?.name || 'Klant', session.user?.email || 'superadmin');
    setEditing(recalcInvoice({ ...inv, id: `draft-${Date.now()}`, number: '' }));
    setMode('create');
  }

  async function handleSave() {
    if (!editing) return;
    if (!editing.tenant_id) {
      setError('Selecteer eerst een tenant voor deze factuur.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const persisted = invoices.some((invoice) => invoice.id === editing.id);
      const saved = persisted
        ? await apiRequest<Invoice>(`/superadmin/invoices/${editing.id}`, { method: 'PATCH', body: JSON.stringify(invoicePayload(editing, true)) })
        : await apiRequest<Invoice>('/superadmin/invoices', { method: 'POST', body: JSON.stringify(invoicePayload(editing, false)) });
      setEditing(normalizeInvoice(saved));
      setMode('overview');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Factuur opslaan mislukt.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    setError(null);
    try {
      await apiRequest(`/superadmin/invoices/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      if (editing?.id === deleteTarget.id) setEditing(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Factuur verwijderen mislukt.');
    } finally {
      setSaving(false);
    }
  }

  function patchLine(idx: number, patch: Partial<InvoiceLineItem>) {
    if (!editing) return;
    const lines = editing.lines.map((l, i) => i === idx ? { ...l, ...patch, total_cents: (patch.quantity ?? l.quantity) * (patch.unit_price_cents ?? l.unit_price_cents) } : l);
    setEditing(recalcInvoice({ ...editing, lines }));
  }

  function addLine() {
    if (!editing) return;
    setEditing(recalcInvoice({ ...editing, lines: [...editing.lines, { description: '', quantity: 1, unit_price_cents: 0, total_cents: 0 }] }));
  }

  function removeLine(idx: number) {
    if (!editing) return;
    setEditing(recalcInvoice({ ...editing, lines: editing.lines.filter((_, i) => i !== idx) }));
  }

  return (
    <MobilePageScaffold title="Billing" subtitle="Invoices aanmaken, bekijken en downloaden als PDF" rightSlot={<button type="button" className="mobile-icon-button" onClick={() => void reload()} disabled={loading}><RefreshCcw size={18} /></button>}>
      <div className="cg-page">
        <div className="cg-superadmin-nav" aria-label="Superadmin modules">
          <a className="mobile-secondary-button" href="/superadmin"><Gauge size={16} /> Control Center</a>
          <a className="mobile-secondary-button" href="/superadmin/commercial-governance"><Shield size={16} /> Commercial & Governance</a>
          <a className="mobile-primary-button" href="/superadmin/invoices"><FileText size={16} /> Billing</a>
        </div>

        {error ? <div className="cg-alert cg-alert-danger">{error}</div> : null}

        <div className="billing-mode-grid">
          <button type="button" className={`billing-mode-tile${mode === 'create' ? ' is-active' : ''}`} onClick={() => { setMode('create'); if (!editing) newDraftForTenant(); }}>
            <span><Plus size={18} /> Factuur maken</span>
            <strong>Nieuw</strong>
            <small>Maak of bewerk een factuur voor een tenant.</small>
          </button>
          <button type="button" className={`billing-mode-tile${mode === 'overview' ? ' is-active' : ''}`} onClick={() => { setMode('overview'); setEditing(null); }}>
            <span><ListChecks size={18} /> Factuur overzicht</span>
            <strong>{invoices.length}</strong>
            <small>Centraal overzicht uit de backend database.</small>
          </button>
        </div>

        {mode === 'create' ? (
          <div className="cg-section">
            <h3><Plus size={18} /> Factuur maken</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="mobile-primary-button" onClick={() => newDraftForTenant()}><Plus size={16} /> Nieuwe factuur</button>
              {tenants.length > 0 && (
                <select style={{ padding: '8px 12px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 13, minHeight: 44 }} onChange={(e) => { if (e.target.value) newDraftForTenant(e.target.value); e.target.value = ''; }}>
                  <option value="">Factuur voor tenant…</option>
                  {tenants.map((t) => <option key={t.id} value={t.id}>{t.display_name || t.name}</option>)}
                </select>
              )}
            </div>
          </div>
        ) : null}

        {mode === 'overview' ? (
          <div className="cg-section">
            <h3><ListChecks size={18} /> Factuur overzicht</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff' }}>
              <Search size={14} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Zoek factuur…" style={{ border: 'none', outline: 'none', flex: 1, fontSize: 14, background: 'transparent' }} />
            </div>

            {loading && <div style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>Facturen laden…</div>}
            {!loading && filtered.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>Nog geen facturen. Klik "Factuur maken" om er een aan te maken.</div>}
            {filtered.map((inv) => (
              <div key={inv.id} className="mobile-list-card" style={{ cursor: 'pointer' }} onClick={() => { setEditing(inv); setMode('create'); }}>
                <div className="mobile-list-card-head">
                  <strong>{inv.number || 'Conceptfactuur'}</strong>
                  <span className={`mobile-pill mobile-pill-${statusTone(inv.status)}`}>{statusLabel(inv.status)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b' }}>
                  <span>{inv.tenant_name || inv.company_name}</span>
                  <strong style={{ color: '#0f172a' }}>{eur(inv.total_cents)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8' }}>
                  <span>Datum: {fmtDate(inv.issue_date)} · Verval: {fmtDate(inv.due_date)}</span>
                </div>
                <div className="mobile-inline-actions" style={{ marginTop: 8 }}>
                  <button type="button" className="mobile-secondary-button" onClick={(e) => { e.stopPropagation(); navigate(`/superadmin/invoices/${inv.id}/pdf`); }}><Printer size={14} /> PDF</button>
                  <button type="button" className="mobile-icon-ghost-button" style={{ color: '#dc2626' }} onClick={(e) => { e.stopPropagation(); setDeleteTarget(inv); }}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {editing && mode === 'create' && (
          <div className="mobile-form-card" style={{ border: '2px solid #2563eb', borderRadius: 16 }}>
            <h3 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={18} /> Factuur {editing.number || 'nieuw'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              <label className="mobile-form-field"><span>Tenant</span><select value={editing.tenant_id} onChange={(e) => { const t = tenants.find((x) => x.id === e.target.value); setEditing({ ...editing, tenant_id: e.target.value, tenant_name: t?.display_name || t?.name || editing.tenant_name, company_name: t?.display_name || t?.name || editing.company_name }); }}><option value="">Selecteer</option>{tenants.map((t) => <option key={t.id} value={t.id}>{t.display_name || t.name}</option>)}</select></label>
              <label className="mobile-form-field"><span>Bedrijfsnaam</span><input value={editing.company_name} onChange={(e) => setEditing({ ...editing, company_name: e.target.value })} /></label>
              <label className="mobile-form-field"><span>Adres</span><input value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></label>
              <label className="mobile-form-field"><span>Postcode</span><input value={editing.postcode} onChange={(e) => setEditing({ ...editing, postcode: e.target.value })} /></label>
              <label className="mobile-form-field"><span>Stad</span><input value={editing.city} onChange={(e) => setEditing({ ...editing, city: e.target.value })} /></label>
              <label className="mobile-form-field"><span>E-mail</span><input value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></label>
              <label className="mobile-form-field"><span>KvK</span><input value={editing.kvk} onChange={(e) => setEditing({ ...editing, kvk: e.target.value })} /></label>
              <label className="mobile-form-field"><span>BTW nummer</span><input value={editing.vat_number} onChange={(e) => setEditing({ ...editing, vat_number: e.target.value })} /></label>
              <label className="mobile-form-field"><span>Factuurdatum</span><input type="date" value={editing.issue_date} onChange={(e) => setEditing({ ...editing, issue_date: e.target.value })} /></label>
              <label className="mobile-form-field"><span>Vervaldatum</span><input type="date" value={editing.due_date} onChange={(e) => setEditing({ ...editing, due_date: e.target.value })} /></label>
              <label className="mobile-form-field"><span>BTW %</span><input type="number" value={editing.vat_percent} onChange={(e) => setEditing(recalcInvoice({ ...editing, vat_percent: Number(e.target.value) || 0 }))} /></label>
              <label className="mobile-form-field"><span>Status</span><select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as Invoice['status'] })}><option value="draft">Concept</option><option value="sent">Verzonden</option><option value="paid">Betaald</option><option value="overdue">Verlopen</option><option value="cancelled">Geannuleerd</option></select></label>
            </div>

            <h4 style={{ margin: '16px 0 8px' }}>Regels</h4>
            {editing.lines.map((line, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 90px auto', gap: 8, alignItems: 'end', marginBottom: 6 }}>
                <label className="mobile-form-field"><span>Omschrijving</span><input value={line.description} onChange={(e) => patchLine(i, { description: e.target.value })} /></label>
                <label className="mobile-form-field"><span>Aantal</span><input type="number" min={1} value={line.quantity} onChange={(e) => patchLine(i, { quantity: Number(e.target.value) || 1 })} /></label>
                <label className="mobile-form-field"><span>Prijs (cent)</span><input type="number" min={0} value={line.unit_price_cents} onChange={(e) => patchLine(i, { unit_price_cents: Number(e.target.value) || 0 })} /></label>
                <button type="button" className="mobile-icon-ghost-button" style={{ color: '#dc2626', marginBottom: 4 }} onClick={() => removeLine(i)}><Trash2 size={14} /></button>
              </div>
            ))}
            <button type="button" className="mobile-secondary-button" onClick={addLine}><Plus size={14} /> Regel toevoegen</button>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, margin: '16px 0', fontSize: 14 }}>
              <div>Subtotaal: <strong>{eur(editing.subtotal_cents)}</strong></div>
              <div>BTW ({editing.vat_percent}%): <strong>{eur(editing.vat_cents)}</strong></div>
              <div style={{ borderTop: '2px solid #0f172a', paddingTop: 6, fontSize: 16, fontWeight: 800 }}>Totaal: {eur(editing.total_cents)}</div>
            </div>

            <label className="mobile-form-field"><span>Opmerkingen</span><textarea rows={3} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></label>

            <div className="mobile-inline-actions" style={{ marginTop: 12 }}>
              <button type="button" className="mobile-primary-button" onClick={() => void handleSave()} disabled={saving}>{saving ? 'Opslaan…' : 'Opslaan'}</button>
              {invoices.some((invoice) => invoice.id === editing.id) ? <button type="button" className="mobile-secondary-button" onClick={() => navigate(`/superadmin/invoices/${editing.id}/pdf`)}><Printer size={14} /> PDF bekijken</button> : null}
              <button type="button" className="mobile-secondary-button" onClick={() => { setEditing(null); setMode('overview'); }}>Sluiten</button>
            </div>
          </div>
        )}

        <ConfirmDialog open={Boolean(deleteTarget)} title="Factuur verwijderen" description={`Weet je zeker dat je factuur ${deleteTarget?.number || ''} wilt verwijderen?`} confirmLabel="Verwijderen" danger onConfirm={() => void handleDelete()} onClose={() => setDeleteTarget(null)} />
      </div>
    </MobilePageScaffold>
  );
}

export default InvoiceManagerPage;
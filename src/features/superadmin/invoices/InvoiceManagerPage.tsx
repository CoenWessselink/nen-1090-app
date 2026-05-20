import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Gauge, ListChecks, Plus, Printer, RefreshCcw, Search, Shield, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '@/api/client';
import { useSession } from '@/app/session/SessionContext';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog';
import { createBlankInvoice, deleteInvoice, getInvoices, recalcInvoice, saveInvoice, type Invoice, type InvoiceLineItem } from './invoiceStore';
import '../commercial-governance/commercial-governance.css';

function eur(cents: number) { return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100); }
function fmtDate(v: string) { if (!v) return '—'; return new Date(v).toLocaleDateString('nl-NL'); }
function statusTone(s: string) { if (s === 'paid') return 'success'; if (s === 'overdue') return 'danger'; if (s === 'sent') return 'info'; return 'neutral'; }
function statusLabel(s: string) { if (s === 'paid') return 'Betaald'; if (s === 'sent') return 'Verzonden'; if (s === 'overdue') return 'Verlopen'; if (s === 'cancelled') return 'Geannuleerd'; return 'Concept'; }

type TenantOption = { id: string; name: string; display_name: string };
type BillingMode = 'create' | 'overview';

export function InvoiceManagerPage() {
  const navigate = useNavigate();
  const session = useSession();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [mode, setMode] = useState<BillingMode>('overview');

  const reload = useCallback(() => setInvoices(getInvoices()), []);
  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    apiRequest<{ tenants?: TenantOption[] }>('/superadmin/tenants?limit=250').then((d) => setTenants(d.tenants || [])).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((i) => !q || `${i.number} ${i.tenant_name} ${i.company_name} ${i.status}`.toLowerCase().includes(q));
  }, [invoices, search]);

  function handleCreate() {
    const first = tenants[0];
    const inv = createBlankInvoice(first?.id || '', first?.display_name || first?.name || 'Klant', session.user?.email || 'superadmin');
    saveInvoice(recalcInvoice(inv));
    setEditing(recalcInvoice(inv));
    setMode('create');
    reload();
  }

  function handleCreateForTenant(tenantId: string) {
    const t = tenants.find((x) => x.id === tenantId);
    const inv = createBlankInvoice(tenantId, t?.display_name || t?.name || 'Klant', session.user?.email || 'superadmin');
    saveInvoice(recalcInvoice(inv));
    setEditing(recalcInvoice(inv));
    setMode('create');
    reload();
  }

  function handleSave() {
    if (!editing) return;
    const updated = recalcInvoice(editing);
    saveInvoice(updated);
    setEditing(null);
    setMode('overview');
    reload();
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteInvoice(deleteTarget.id);
    setDeleteTarget(null);
    if (editing?.id === deleteTarget.id) setEditing(null);
    reload();
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
    <MobilePageScaffold title="Billing" subtitle="Invoices aanmaken, bekijken en downloaden als PDF" rightSlot={<button type="button" className="mobile-icon-button" onClick={reload}><RefreshCcw size={18} /></button>}>
      <div className="cg-page">
        <div className="cg-superadmin-nav" aria-label="Superadmin modules">
          <a className="mobile-secondary-button" href="/superadmin"><Gauge size={16} /> Control Center</a>
          <a className="mobile-secondary-button" href="/superadmin/commercial-governance"><Shield size={16} /> Commercial & Governance</a>
          <a className="mobile-primary-button" href="/superadmin/invoices"><FileText size={16} /> Billing</a>
        </div>

        <div className="billing-mode-grid">
          <button type="button" className={`billing-mode-tile${mode === 'create' ? ' is-active' : ''}`} onClick={() => { setMode('create'); if (!editing) handleCreate(); }}>
            <span><Plus size={18} /> Factuur maken</span>
            <strong>Nieuw</strong>
            <small>Maak of bewerk een factuur voor een tenant.</small>
          </button>
          <button type="button" className={`billing-mode-tile${mode === 'overview' ? ' is-active' : ''}`} onClick={() => { setMode('overview'); setEditing(null); }}>
            <span><ListChecks size={18} /> Factuur overzicht</span>
            <strong>{invoices.length}</strong>
            <small>Bekijk alle gemaakte facturen en open PDF exports.</small>
          </button>
        </div>

        {mode === 'create' ? (
          <div className="cg-section">
            <h3><Plus size={18} /> Factuur maken</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="mobile-primary-button" onClick={handleCreate}><Plus size={16} /> Nieuwe factuur</button>
              {tenants.length > 1 && (
                <select style={{ padding: '8px 12px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 13, minHeight: 44 }} onChange={(e) => { if (e.target.value) handleCreateForTenant(e.target.value); e.target.value = ''; }}>
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

            {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>Nog geen facturen. Klik "Factuur maken" om er een aan te maken.</div>}
            {filtered.map((inv) => (
              <div key={inv.id} className="mobile-list-card" style={{ cursor: 'pointer' }} onClick={() => { setEditing(inv); setMode('create'); }}>
                <div className="mobile-list-card-head">
                  <strong>{inv.number}</strong>
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
            <h3 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={18} /> Factuur {editing.number}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              <label className="mobile-form-field"><span>Tenant</span><select value={editing.tenant_id} onChange={(e) => { const t = tenants.find((x) => x.id === e.target.value); setEditing({ ...editing, tenant_id: e.target.value, tenant_name: t?.display_name || t?.name || editing.tenant_name }); }}><option value="">Selecteer</option>{tenants.map((t) => <option key={t.id} value={t.id}>{t.display_name || t.name}</option>)}</select></label>
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
              <button type="button" className="mobile-primary-button" onClick={handleSave}>Opslaan</button>
              <button type="button" className="mobile-secondary-button" onClick={() => navigate(`/superadmin/invoices/${editing.id}/pdf`)}><Printer size={14} /> PDF bekijken</button>
              <button type="button" className="mobile-secondary-button" onClick={() => { setEditing(null); setMode('overview'); }}>Sluiten</button>
            </div>
          </div>
        )}

        <ConfirmDialog open={Boolean(deleteTarget)} title="Factuur verwijderen" description={`Weet je zeker dat je factuur ${deleteTarget?.number || ''} wilt verwijderen?`} confirmLabel="Verwijderen" danger onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
      </div>
    </MobilePageScaffold>
  );
}

export default InvoiceManagerPage;
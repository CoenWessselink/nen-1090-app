import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, Building2, CheckCircle2, CreditCard, Download, FileText, RefreshCcw, Search, ShieldCheck, Trash2, Users } from 'lucide-react';
import { useAuthStore } from '@/app/store/auth-store';

type Tenant = { id: string; name?: string; display_name?: string; status?: string; access_mode?: string; is_active?: boolean; plan?: string; seats?: number; billing_email?: string; metrics?: { users_count?: number } };
type Revenue = { paid_total?: number; invoice_total_cents?: number; active_tenants?: number; suspended_tenants?: number; estimated_mrr?: number; estimated_arr?: number };
type AuditRow = { id: string; action: string; created_at?: string; ip?: string };
type InvoiceRow = { id: string; tenant_id?: string; tenant_name?: string; tenant_display_name?: string; number?: string; status?: string; currency?: string; total_cents?: number; vat_cents?: number; due_date?: string; paid_at?: string; created_at?: string; pdf_url?: string };
type UserRow = { id: string; email?: string; name?: string; role?: string; is_active?: boolean; created_at?: string; joined_at?: string };
type ActivityData = { last_login?: string | null; last_project?: string | null; last_audit?: { action?: string; created_at?: string } | null; project_count?: number; weld_count?: number; inspection_count?: number; document_count?: number };
type TenantProfile = { tenant_id?: string; company_name?: string; trade_name?: string; address_line_1?: string; address_line_2?: string; postal_code?: string; postcode?: string; city?: string; country?: string; phone?: string; company_email?: string; website?: string; chamber_of_commerce?: string; vat_number?: string; iban?: string; bic?: string; contact_person?: string; billing_email?: string; administration_email?: string; g_account?: string; payroll_tax_number?: string; sbi_code?: string; cao_sector?: string; insurance_details?: string; certification_details?: string; wka_status?: string; wka_notes?: string };
type RequestOptions = RequestInit & { retries?: number; timeoutMs?: number };
type TabKey = 'overview' | 'bedrijfsgegevens' | 'facturen' | 'alle_facturen' | 'gebruikers' | 'activiteit' | 'audit';

const DEFAULT_TIMEOUT_MS = 18_000;
const currency = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' });
const money = (value: number | undefined, cents = false) => currency.format(Number(value || 0) / (cents ? 100 : 1));
const tenantLabel = (tenant?: Tenant | null) => tenant?.display_name || tenant?.name || tenant?.id || 'Klantomgeving';
const invoiceTenantLabel = (invoice: InvoiceRow) => invoice.tenant_display_name || invoice.tenant_name || invoice.tenant_id || 'Klantomgeving';
const dateText = (value?: string | null) => { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('nl-NL'); };
const statusTone = (status?: string) => { const s = String(status || '').toLowerCase(); if (s.includes('active') || s.includes('paid') || s.includes('betaald')) return 'ok'; if (s.includes('delete') || s.includes('blocked') || s.includes('suspend') || s.includes('past_due') || s.includes('failed') || s.includes('mislukt')) return 'danger'; if (s.includes('pending') || s.includes('trial') || s.includes('open')) return 'warn'; return 'neutral'; };
const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
const emptyProfile = (tenant?: Tenant | null): TenantProfile => ({ company_name: tenantLabel(tenant), country: 'Nederland', billing_email: tenant?.billing_email || '', wka_status: 'onbekend' });

async function apiRequest<T>(path: string, token: string | null, init: RequestOptions = {}): Promise<T> {
  if (!token) throw new Error('Geen actieve sessie. Log opnieuw in.');
  const retries = init.retries ?? 1;
  const timeoutMs = init.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`/api/v1${path}`, { ...init, signal: controller.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
      if (!response.ok) {
        let message = `${response.status} ${response.statusText}`;
        try { const body = await response.json(); message = typeof body?.detail === 'string' ? body.detail : body?.detail?.message || body?.message || message; } catch { /* keep message */ }
        throw new Error(message);
      }
      return response.json() as Promise<T>;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Aanvraag mislukt.');
      if (attempt < retries) await sleep(600 * (attempt + 1));
    } finally { window.clearTimeout(timeout); }
  }
  throw lastError || new Error('Aanvraag mislukt.');
}

async function downloadBlob(path: string, token: string | null, fallbackName: string): Promise<void> {
  if (!token) throw new Error('Geen actieve sessie. Log opnieuw in.');
  const response = await fetch(`/api/v1${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Download mislukt: ${response.status}`);
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const filename = match?.[1] || fallbackName;
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.URL.revokeObjectURL(url);
}

export function SuperadminControlCenter() {
  const token = useAuthStore((state) => state.token);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [allInvoices, setAllInvoices] = useState<InvoiceRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [profile, setProfile] = useState<TenantProfile>(emptyProfile());
  const [profileDraft, setProfileDraft] = useState<TenantProfile>(emptyProfile());
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [invoiceStatus, setInvoiceStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState({ plan: 'professional', seats: 1, price_per_seat_month_cents: 5900, price_per_seat_year_cents: 49000 });

  const filteredTenants = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tenants.filter((tenant) => {
      const haystack = `${tenant.name || ''} ${tenant.display_name || ''} ${tenant.billing_email || ''} ${tenant.status || ''}`.toLowerCase();
      return (needle ? haystack.includes(needle) : true) && (status === 'all' ? true : String(tenant.status || '').toLowerCase() === status);
    });
  }, [query, status, tenants]);
  const filteredInvoices = useMemo(() => invoices.filter((invoice) => invoiceStatus === 'all' ? true : String(invoice.status || '').toLowerCase() === invoiceStatus), [invoiceStatus, invoices]);
  const filteredAllInvoices = useMemo(() => allInvoices.filter((invoice) => invoiceStatus === 'all' ? true : String(invoice.status || '').toLowerCase() === invoiceStatus), [invoiceStatus, allInvoices]);

  const loadAllInvoices = useCallback(async () => {
    const data = await apiRequest<{ ok: boolean; items: InvoiceRow[] }>('/superadmin/invoices?limit=500', token, { retries: 1 }).catch(() => ({ ok: true, items: [] }));
    setAllInvoices(data.items || []);
  }, [token]);

  const loadTenant = useCallback(async (tenantId: string) => {
    setDetailLoading(true); setError(null);
    try {
      const [tenantData, auditData, invoiceData, userData, activityData, profileData] = await Promise.all([
        apiRequest<{ ok: boolean; tenant: Tenant }>(`/superadmin/tenants/${tenantId}`, token, { retries: 1 }),
        apiRequest<{ ok: boolean; audit: AuditRow[] }>(`/superadmin/tenants/${tenantId}/audit?limit=80`, token, { retries: 1 }),
        apiRequest<{ ok: boolean; items: InvoiceRow[] }>(`/superadmin/tenants/${tenantId}/invoices`, token, { retries: 1 }).catch(() => ({ ok: true, items: [] })),
        apiRequest<{ ok: boolean; items: UserRow[] }>(`/superadmin/tenants/${tenantId}/users`, token, { retries: 1 }).catch(() => ({ ok: true, items: [] })),
        apiRequest<{ ok: boolean; activity: ActivityData }>(`/superadmin/tenants/${tenantId}/activity`, token, { retries: 1 }).catch(() => ({ ok: true, activity: {} })),
        apiRequest<{ ok: boolean; profile: TenantProfile }>(`/superadmin/tenants/${tenantId}/profile`, token, { retries: 1 }).catch(() => ({ ok: true, profile: emptyProfile() })),
      ]);
      setSelectedTenant(tenantData.tenant); setAudit(auditData.audit || []); setInvoices(invoiceData.items || []); setUsers(userData.items || []); setActivity(activityData.activity || {});
      const nextProfile = { ...emptyProfile(tenantData.tenant), ...(profileData.profile || {}) };
      setProfile(nextProfile); setProfileDraft(nextProfile);
      setPlanForm({ plan: tenantData.tenant.plan || 'professional', seats: Math.max(1, Number(tenantData.tenant.seats || 1)), price_per_seat_month_cents: 5900, price_per_seat_year_cents: 49000 });
    } catch (err) { setError(err instanceof Error ? err.message : 'Klantdetails konden niet worden geladen.'); }
    finally { setDetailLoading(false); }
  }, [token]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [tenantData, revenueData] = await Promise.all([
        apiRequest<{ ok: boolean; tenants: Tenant[] }>('/superadmin/tenants?limit=250', token, { retries: 2 }),
        apiRequest<{ ok: boolean; revenue: Revenue }>('/superadmin/analytics/revenue', token, { retries: 2 }),
      ]);
      const nextTenants = tenantData.tenants || [];
      setTenants(nextTenants); setRevenue(revenueData.revenue || {}); setLastUpdated(new Date().toLocaleTimeString('nl-NL'));
      setSelectedTenantId((current) => (current && nextTenants.some((tenant) => tenant.id === current) ? current : nextTenants[0]?.id || null));
      if (nextTenants.length === 0) { setSelectedTenant(null); setAudit([]); setInvoices([]); setUsers([]); setActivity(null); setProfile(emptyProfile()); setProfileDraft(emptyProfile()); }
      void loadAllInvoices();
    } catch (err) { setError(err instanceof Error ? err.message : 'Superadmin data kon niet worden geladen.'); }
    finally { setLoading(false); }
  }, [loadAllInvoices, token]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (selectedTenantId) void loadTenant(selectedTenantId); }, [loadTenant, selectedTenantId]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.getElementById('superadmin-search')?.focus(); } };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, []);

  const runTenantAction = async (tenantId: string, action: 'activate' | 'suspend') => {
    const reason = window.prompt(action === 'suspend' ? `Reden voor blokkeren van ${tenantLabel(selectedTenant)}:` : `Reden voor activeren van ${tenantLabel(selectedTenant)}:`, action === 'suspend' ? 'Handmatige blokkade vanuit platformbeheer' : 'Handmatige activatie vanuit platformbeheer');
    if (!reason) return;
    setSaving(true); setNotice(null); setError(null);
    try { const response = await apiRequest<{ ok: boolean; tenant: Tenant }>(`/superadmin/tenants/${tenantId}/${action}`, token, { method: 'POST', body: JSON.stringify({ reason }) }); setSelectedTenant(response.tenant); setNotice(action === 'activate' ? 'Klantomgeving geactiveerd.' : 'Klantomgeving geblokkeerd.'); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Actie mislukt.'); }
    finally { setSaving(false); }
  };

  const deleteTenant = async () => {
    if (!selectedTenant?.id) return;
    const confirmed = window.confirm(`Weet je zeker dat je ${tenantLabel(selectedTenant)} wilt verwijderen?\n\nDit blokkeert de klantomgeving via soft-delete en wordt vastgelegd in audit.`);
    if (!confirmed) return;
    setSaving(true); setNotice(null); setError(null);
    try { await apiRequest<{ ok: boolean }>(`/superadmin/tenants/${selectedTenant.id}`, token, { method: 'DELETE' }); setNotice('Klantomgeving verwijderd / geblokkeerd.'); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Verwijderen mislukt.'); }
    finally { setSaving(false); }
  };

  const changePlan = async () => {
    if (!selectedTenant?.id) return;
    const reason = window.prompt(`Reden voor planwijziging bij ${tenantLabel(selectedTenant)}:`, 'Handmatige planwijziging vanuit platformbeheer');
    if (!reason) return;
    setSaving(true); setNotice(null); setError(null);
    try { const response = await apiRequest<{ ok: boolean; tenant: Tenant }>(`/superadmin/tenants/${selectedTenant.id}/change-plan`, token, { method: 'POST', body: JSON.stringify({ ...planForm, reason }) }); setSelectedTenant(response.tenant); setNotice('Planwijziging opgeslagen.'); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Planwijziging mislukt.'); }
    finally { setSaving(false); }
  };

  const saveProfile = async () => {
    if (!selectedTenant?.id) return;
    setSaving(true); setNotice(null); setError(null);
    try {
      const response = await apiRequest<{ ok: boolean; profile: TenantProfile }>(`/superadmin/tenants/${selectedTenant.id}/profile`, token, { method: 'PATCH', body: JSON.stringify(profileDraft) });
      const nextProfile = response.profile || profileDraft;
      setProfile(nextProfile); setProfileDraft(nextProfile); setNotice('Bedrijfsgegevens opgeslagen.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Bedrijfsgegevens opslaan mislukt.'); }
    finally { setSaving(false); }
  };

  const downloadInvoice = async (invoice: InvoiceRow) => {
    setNotice(null); setError(null);
    try {
      const path = invoice.pdf_url?.replace('/api/v1', '') || `/superadmin/invoices/${invoice.id}/pdf`;
      await downloadBlob(path, token, `Factuur-WeldInspectPro-${invoice.number || invoice.id}.pdf`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Factuur downloaden mislukt.'); }
  };

  const profileField = (key: keyof TenantProfile, label: string, placeholder = '') => <label>{label}<input value={String(profileDraft[key] || '')} placeholder={placeholder} onChange={(event)=>setProfileDraft((current)=>({...current,[key]:event.target.value}))}/></label>;

  return (
    <div className="superadmin-v2-page">
      <style>{`.superadmin-v2-page{display:flex;flex-direction:column;gap:20px;color:#172033}.sa-hero{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;padding:22px;border:1px solid #e4eaf3;background:linear-gradient(135deg,#f8fbff,#eef5ff);border-radius:22px;box-shadow:0 12px 36px rgba(25,42,70,.06)}.sa-hero h1{margin:4px 0;font-size:clamp(28px,4vw,44px);line-height:1}.sa-hero p{margin:0;color:#66728a}.sa-kicker{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:#2563eb}.sa-actions,.sa-tabs{display:flex;gap:10px;flex-wrap:wrap}.sa-button{border:0;border-radius:12px;padding:10px 14px;font-weight:800;cursor:pointer;background:#172033;color:#fff;display:inline-flex;align-items:center;gap:8px}.sa-button.secondary{background:#fff;color:#172033;border:1px solid #dbe4f0}.sa-button.danger{background:#b42318}.sa-button:disabled{opacity:.55;cursor:not-allowed}.sa-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.sa-card{background:#fff;border:1px solid #e5ecf5;border-radius:18px;padding:16px;box-shadow:0 8px 26px rgba(20,35,60,.05)}.sa-card h3{margin:0 0 12px;display:flex;align-items:center;gap:8px}.sa-kpi span,.sa-field span{font-size:13px;color:#66728a}.sa-kpi strong{display:block;margin-top:8px;font-size:28px}.sa-grid{display:grid;grid-template-columns:minmax(320px,420px) 1fr;gap:16px}.sa-toolbar{display:flex;gap:10px;margin-bottom:12px}.sa-search{display:flex;align-items:center;gap:8px;border:1px solid #dbe4f0;border-radius:12px;padding:0 10px;flex:1;background:#fff}.sa-input,.sa-select{border:0;outline:0;background:transparent;padding:10px 4px;width:100%;font:inherit}.sa-select{border:1px solid #dbe4f0;border-radius:12px;background:#fff;padding:10px}.sa-list{display:flex;flex-direction:column;gap:8px;max-height:760px;overflow:auto}.sa-row{border:1px solid #e5ecf5;border-radius:14px;background:#fff;padding:12px;text-align:left;cursor:pointer}.sa-row:hover{border-color:#9db7ff}.sa-row.is-active{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.12)}.sa-row-top,.sa-table-row{display:flex;justify-content:space-between;gap:10px}.sa-row strong{display:block}.sa-row small{color:#66728a}.sa-pill{border-radius:999px;padding:4px 9px;font-size:12px;font-weight:800;background:#eef2f7;color:#45546d}.sa-pill.ok{background:#eaf8f0;color:#126b39}.sa-pill.warn{background:#fff7e6;color:#925300}.sa-pill.danger{background:#ffecec;color:#a51d16}.sa-detail{position:sticky;top:16px}.sa-detail-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.sa-field{background:#f8fafc;border:1px solid #e5ecf5;border-radius:14px;padding:12px}.sa-field strong{display:block;margin-top:4px}.sa-form{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;align-items:end}.sa-profile-form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.sa-form label,.sa-profile-form label{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:800;color:#66728a}.sa-form input,.sa-profile-form input,.sa-profile-form textarea{border:1px solid #dbe4f0;border-radius:12px;padding:10px;font:inherit}.sa-profile-form textarea{min-height:82px;resize:vertical}.sa-tabs button{border:1px solid #dbe4f0;background:#fff;border-radius:999px;padding:9px 13px;font-weight:800;cursor:pointer}.sa-tabs button.active{background:#172033;color:#fff;border-color:#172033}.sa-table{display:flex;flex-direction:column;gap:8px}.sa-table-row{align-items:center;border:1px solid #e5ecf5;border-radius:14px;padding:12px}.sa-table-row small{color:#66728a}.sa-audit{display:flex;flex-direction:column;gap:8px;max-height:340px;overflow:auto}.sa-alert{border-radius:14px;padding:12px 14px;font-weight:700;display:flex;gap:8px;align-items:center}.sa-alert.error{background:#fff1f0;color:#a51d16}.sa-alert.ok{background:#edfdf4;color:#126b39}.sa-empty{padding:22px;color:#66728a;text-align:center}@media(max-width:900px){.sa-hero{flex-direction:column}.sa-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.sa-grid{grid-template-columns:1fr}.sa-detail{position:static}.sa-detail-grid,.sa-form,.sa-profile-form{grid-template-columns:1fr}.sa-card{padding:14px}.sa-table-row{flex-direction:column;align-items:flex-start}}`}</style>

      <section className="sa-hero"><div><div className="sa-kicker">WeldInspectPro Platformbeheer</div><h1>Superadmin Control Center</h1><p>Tenant 360, WKA/bedrijfsgegevens, facturen, gebruikers, activiteit en audit vanuit één scherm.</p>{lastUpdated ? <p>Laatst bijgewerkt: {lastUpdated}</p> : null}</div><div className="sa-actions"><button className="sa-button" onClick={load} disabled={loading || saving}><RefreshCcw size={16} /> {loading ? 'Vernieuwen…' : 'Vernieuwen'}</button></div></section>
      {error ? <div className="sa-alert error"><AlertTriangle size={16} /> {error}</div> : null}{notice ? <div className="sa-alert ok"><CheckCircle2 size={16} /> {notice}</div> : null}
      <section className="sa-kpis"><div className="sa-card sa-kpi"><span>Geschatte MRR</span><strong>{money(revenue?.estimated_mrr)}</strong></div><div className="sa-card sa-kpi"><span>Geschatte ARR</span><strong>{money(revenue?.estimated_arr)}</strong></div><div className="sa-card sa-kpi"><span>Actieve tenants</span><strong>{revenue?.active_tenants ?? '—'}</strong></div><div className="sa-card sa-kpi"><span>Geblokkeerd</span><strong>{revenue?.suspended_tenants ?? '—'}</strong></div></section>

      <section className="sa-grid"><div className="sa-card"><h3><Building2 size={18} /> Klantomgevingen</h3><div className="sa-toolbar"><div className="sa-search"><Search size={16} /><input id="superadmin-search" className="sa-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Zoek tenant, e-mail, status" /></div><select className="sa-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Alle</option><option value="active">Actief</option><option value="suspended">Geblokkeerd</option><option value="deleted">Verwijderd</option><option value="past_due">Past due</option><option value="pending_payment">Pending</option></select></div><div className="sa-list">{loading ? <div className="sa-empty">Tenants laden…</div> : null}{!loading && filteredTenants.length === 0 ? <div className="sa-empty">Geen tenants gevonden.</div> : null}{filteredTenants.map((tenant) => <button key={tenant.id} className={`sa-row ${selectedTenantId === tenant.id ? 'is-active' : ''}`} onClick={() => setSelectedTenantId(tenant.id)} onDoubleClick={() => setActiveTab('bedrijfsgegevens')}><div className="sa-row-top"><div><strong>{tenantLabel(tenant)}</strong><small>{tenant.billing_email || tenant.id}</small></div><span className={`sa-pill ${statusTone(tenant.status)}`}>{tenant.status || 'onbekend'}</span></div><small>{tenant.plan || 'geen plan'} · {tenant.seats || 1} seats · {tenant.access_mode || 'default'}</small></button>)}</div></div>

      <div className="sa-detail"><div className="sa-card"><h3><ShieldCheck size={18} /> Tenant 360</h3>{!selectedTenant && !detailLoading ? <div className="sa-empty">Selecteer een tenant.</div> : null}{detailLoading ? <div className="sa-empty">Tenantdetails laden…</div> : null}{selectedTenant ? <div style={{display:'flex',flexDirection:'column',gap:16}}><div className="sa-detail-grid"><div className="sa-field"><span>Naam</span><strong>{tenantLabel(selectedTenant)}</strong></div><div className="sa-field"><span>Status</span><strong>{selectedTenant.status || 'onbekend'}</strong></div><div className="sa-field"><span>WKA status</span><strong>{profile.wka_status || 'onbekend'}</strong></div><div className="sa-field"><span>KvK</span><strong>{profile.chamber_of_commerce || '—'}</strong></div><div className="sa-field"><span>BTW</span><strong>{profile.vat_number || '—'}</strong></div><div className="sa-field"><span>IBAN</span><strong>{profile.iban || '—'}</strong></div><div className="sa-field"><span>Projecten</span><strong>{activity?.project_count ?? 0}</strong></div><div className="sa-field"><span>Gebruikers</span><strong>{users.length || selectedTenant.metrics?.users_count || 0}</strong></div><div className="sa-field"><span>Laatste login</span><strong>{dateText(activity?.last_login)}</strong></div></div><div className="sa-actions"><button className="sa-button" disabled={saving} onClick={() => runTenantAction(selectedTenant.id, 'activate')}><CheckCircle2 size={16} /> Activeren</button><button className="sa-button danger" disabled={saving} onClick={() => runTenantAction(selectedTenant.id, 'suspend')}><AlertTriangle size={16} /> Blokkeren</button><button className="sa-button danger" disabled={saving} onClick={deleteTenant}><Trash2 size={16} /> Verwijderen</button></div><div className="sa-tabs">{(['overview','bedrijfsgegevens','facturen','alle_facturen','gebruikers','activiteit','audit'] as TabKey[]).map((tab) => <button key={tab} className={activeTab===tab?'active':''} onClick={() => setActiveTab(tab)}>{tab === 'overview' ? 'Overzicht' : tab === 'bedrijfsgegevens' ? 'Bedrijfsgegevens' : tab === 'alle_facturen' ? 'Alle facturen' : tab[0].toUpperCase()+tab.slice(1)}</button>)}</div>

      {activeTab === 'overview' ? <div className="sa-card" style={{boxShadow:'none'}}><h3><CreditCard size={18}/> Planbeheer</h3><div className="sa-form"><label>Plan<input value={planForm.plan} onChange={(event)=>setPlanForm((c)=>({...c,plan:event.target.value}))}/></label><label>Seats<input type="number" min={1} value={planForm.seats} onChange={(event)=>setPlanForm((c)=>({...c,seats:Math.max(1,Number(event.target.value||1))}))}/></label><label>Maandprijs cent<input type="number" min={0} value={planForm.price_per_seat_month_cents} onChange={(event)=>setPlanForm((c)=>({...c,price_per_seat_month_cents:Math.max(0,Number(event.target.value||0))}))}/></label><label>Jaarprijs cent<input type="number" min={0} value={planForm.price_per_seat_year_cents} onChange={(event)=>setPlanForm((c)=>({...c,price_per_seat_year_cents:Math.max(0,Number(event.target.value||0))}))}/></label></div><div className="sa-actions" style={{marginTop:12}}><button className="sa-button secondary" disabled={saving} onClick={changePlan}><CreditCard size={16}/> Plan opslaan</button></div></div> : null}
      {activeTab === 'bedrijfsgegevens' ? <div className="sa-card" style={{boxShadow:'none'}}><h3><Building2 size={18}/> Bedrijfsgegevens / WKA</h3><div className="sa-profile-form">{profileField('company_name','Bedrijfsnaam')}{profileField('trade_name','Handelsnaam')}{profileField('contact_person','Contactpersoon')}{profileField('address_line_1','Adres')}{profileField('address_line_2','Adresregel 2')}{profileField('postal_code','Postcode')}{profileField('city','Plaats')}{profileField('country','Land')}{profileField('phone','Telefoon')}{profileField('company_email','E-mail bedrijf')}{profileField('billing_email','Facturatie e-mail')}{profileField('administration_email','Administratie e-mail')}{profileField('website','Website')}{profileField('chamber_of_commerce','KvK')}{profileField('vat_number','BTW nummer')}{profileField('iban','IBAN')}{profileField('bic','BIC')}{profileField('g_account','G-rekening')}{profileField('payroll_tax_number','Loonheffingennummer')}{profileField('sbi_code','SBI code')}{profileField('cao_sector','CAO / sector')}{profileField('insurance_details','Verzekering / certificering')}{profileField('wka_status','WKA status')}<label style={{gridColumn:'1 / -1'}}>WKA notities<textarea value={profileDraft.wka_notes || ''} onChange={(event)=>setProfileDraft((current)=>({...current,wka_notes:event.target.value}))}/></label></div><div className="sa-actions" style={{marginTop:12}}><button className="sa-button" disabled={saving} onClick={saveProfile}><CheckCircle2 size={16}/> Bedrijfsgegevens opslaan</button></div></div> : null}
      {activeTab === 'facturen' ? <InvoiceTable title="Facturen" invoices={filteredInvoices} status={invoiceStatus} setStatus={setInvoiceStatus} onDownload={downloadInvoice} /> : null}
      {activeTab === 'alle_facturen' ? <InvoiceTable title="Alle facturen" invoices={filteredAllInvoices} status={invoiceStatus} setStatus={setInvoiceStatus} onDownload={downloadInvoice} showTenant /> : null}
      {activeTab === 'gebruikers' ? <div className="sa-card" style={{boxShadow:'none'}}><h3><Users size={18}/> Gebruikers & seats</h3><div className="sa-table">{users.length===0?<div className="sa-empty">Geen gebruikers gevonden.</div>:null}{users.map((user)=><div className="sa-table-row" key={user.id}><div><strong>{user.name || user.email || user.id}</strong><small>{user.email || 'geen e-mail'} · toegevoegd {dateText(user.joined_at || user.created_at)}</small></div><span className="sa-pill neutral">{user.role || 'user'}</span><span className={`sa-pill ${user.is_active === false ? 'danger' : 'ok'}`}>{user.is_active === false ? 'inactief' : 'actief'}</span></div>)}</div></div> : null}
      {activeTab === 'activiteit' ? <div className="sa-card" style={{boxShadow:'none'}}><h3><Activity size={18}/> Activiteit</h3><div className="sa-detail-grid"><div className="sa-field"><span>Laatste login</span><strong>{dateText(activity?.last_login)}</strong></div><div className="sa-field"><span>Laatste project</span><strong>{dateText(activity?.last_project)}</strong></div><div className="sa-field"><span>Laatste audit</span><strong>{activity?.last_audit?.action || '—'}</strong></div></div></div> : null}
      {activeTab === 'audit' ? <div className="sa-card" style={{boxShadow:'none'}}><h3><Activity size={18}/> Audit timeline</h3><div className="sa-audit">{audit.length===0?<div className="sa-empty">Geen auditregels.</div>:null}{audit.map((row)=><div className="sa-table-row" key={row.id}><div><strong>{row.action}</strong><small>{dateText(row.created_at)} · {row.ip || 'geen ip'}</small></div><span className={`sa-pill ${statusTone(row.action)}`}>audit</span></div>)}</div></div> : null}</div> : null}</div></div></section>
      <section className="sa-card"><h3><BarChart3 size={18}/> Platform baseline</h3><div className="sa-detail-grid"><div className="sa-field"><span>Totaal betaald</span><strong>{money(revenue?.paid_total)}</strong></div><div className="sa-field"><span>Factuurwaarde</span><strong>{money(revenue?.invoice_total_cents, true)}</strong></div><div className="sa-field"><span>Aantal tenants</span><strong>{tenants.length}</strong></div></div></section>
    </div>
  );
}

function InvoiceTable({ title, invoices, status, setStatus, onDownload, showTenant = false }: { title: string; invoices: InvoiceRow[]; status: string; setStatus: (value: string) => void; onDownload: (invoice: InvoiceRow) => void; showTenant?: boolean }) {
  return <div className="sa-card" style={{boxShadow:'none'}}><h3><FileText size={18}/> {title}</h3><select className="sa-select" value={status} onChange={(e)=>setStatus(e.target.value)} style={{maxWidth:220,marginBottom:12}}><option value="all">Alle statussen</option><option value="betaald">Betaald</option><option value="open">Open</option><option value="mislukt">Mislukt</option><option value="paid">Paid</option></select><div className="sa-table">{invoices.length===0?<div className="sa-empty">Geen facturen gevonden.</div>:null}{invoices.map((invoice)=><div className="sa-table-row" key={invoice.id}><div><strong>{invoice.number || invoice.id}</strong><small>{showTenant ? `${invoiceTenantLabel(invoice)} · ` : ''}{dateText(invoice.created_at)} · verval {dateText(invoice.due_date)}</small></div><span className={`sa-pill ${statusTone(invoice.status)}`}>{invoice.status || 'onbekend'}</span><strong>{money(invoice.total_cents, true)}</strong><button className="sa-button secondary" onClick={()=>onDownload(invoice)}><Download size={15}/> PDF</button></div>)}</div></div>;
}

export default SuperadminControlCenter;

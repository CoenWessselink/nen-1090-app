import { ChevronRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { SuperadminTenantSummary } from '@/api/superadminControlCenter';

function statusTone(status: string) {
  const s = status.toLowerCase();
  if (s === 'active') return 'success';
  if (s === 'suspended' || s === 'blocked' || s === 'deleted') return 'danger';
  if (s === 'trial' || s === 'pending') return 'warning';
  return 'neutral';
}

function dateLabel(v: string | null) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('nl-NL');
}

export function SuperadminTenantTable({ tenants, onOpen360 }: { tenants: SuperadminTenantSummary[]; onOpen360: (tenantId: string) => void }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tenants.filter((t) => {
      const haystack = `${t.tenant_name} ${t.tenant_id} ${t.status} ${t.plan}`.toLowerCase();
      return (q ? haystack.includes(q) : true) && (statusFilter === 'all' || t.status.toLowerCase() === statusFilter);
    });
  }, [tenants, search, statusFilter]);

  const statuses = useMemo(() => [...new Set(tenants.map((t) => t.status.toLowerCase()))], [tenants]);

  return (
    <div className="sacc-section">
      <div className="sacc-section-header">
        <h3>Tenants ({tenants.length})</h3>
        <div className="sacc-filters">
          <label className="sacc-search"><Search size={14} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Zoek tenant…" /></label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Alle statussen</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="sacc-table-wrap">
        <table className="sacc-table">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Status</th>
              <th>Plan</th>
              <th>Users</th>
              <th>Projects</th>
              <th>Welds</th>
              <th>Inspections</th>
              <th>Last login</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.tenant_id} onClick={() => onOpen360(t.tenant_id)} className="sacc-clickable">
                <td><strong>{t.tenant_name || t.tenant_id}</strong><small>{t.tenant_id.slice(0, 8)}…</small></td>
                <td><span className={`sacc-badge sacc-badge-${statusTone(t.status)}`}>{t.status}</span></td>
                <td>{t.plan}</td>
                <td>{t.users_count}</td>
                <td>{t.projects_count}</td>
                <td>{t.welds_count}</td>
                <td>{t.inspections_count}</td>
                <td>{dateLabel(t.last_login_at)}</td>
                <td><ChevronRight size={14} /></td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={9} className="sacc-empty">Geen tenants gevonden.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

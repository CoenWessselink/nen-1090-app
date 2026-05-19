import { useMemo, useState } from 'react';
import { AlertTriangle, Search } from 'lucide-react';
import type { SuperadminErrorRow } from '@/api/superadminControlCenter';

function dateLabel(v: string) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('nl-NL');
}

function statusTone(code: number) {
  if (code >= 500) return 'danger';
  if (code >= 400) return 'warning';
  return 'neutral';
}

export function SuperadminErrorCenter({ errors }: { errors: SuperadminErrorRow[] }) {
  const [search, setSearch] = useState('');
  const [unresolvedOnly, setUnresolvedOnly] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return errors.filter((e) => {
      if (unresolvedOnly && e.resolved) return false;
      if (!q) return true;
      return `${e.tenant_name} ${e.user_email} ${e.path} ${e.message} ${e.status_code}`.toLowerCase().includes(q);
    });
  }, [errors, search, unresolvedOnly]);

  return (
    <div className="sacc-section">
      <div className="sacc-section-header">
        <h3><AlertTriangle size={18} /> Error Center ({errors.length})</h3>
        <div className="sacc-filters">
          <label className="sacc-search"><Search size={14} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Zoek op tenant, pad, fout…" /></label>
          <label className="sacc-checkbox"><input type="checkbox" checked={unresolvedOnly} onChange={(e) => setUnresolvedOnly(e.target.checked)} /> Alleen onopgelost</label>
        </div>
      </div>

      {errors.length === 0 ? (
        <div className="sacc-empty-state">
          <AlertTriangle size={24} />
          <strong>Geen errors gevonden</strong>
          <p>Het Error Center toont runtime errors zodra de backend deze registreert. Op dit moment zijn er geen recente fouten.</p>
        </div>
      ) : (
        <div className="sacc-table-wrap">
          <table className="sacc-table">
            <thead><tr><th>Tijd</th><th>Tenant</th><th>User</th><th>Status</th><th>Pad</th><th>Bericht</th><th>Opgelost</th></tr></thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td>{dateLabel(e.created_at)}</td>
                  <td>{e.tenant_name || '—'}</td>
                  <td>{e.user_email || '—'}</td>
                  <td><span className={`sacc-badge sacc-badge-${statusTone(e.status_code)}`}>{e.status_code}</span></td>
                  <td className="sacc-mono">{e.method} {e.path}</td>
                  <td>{e.message}</td>
                  <td>{e.resolved ? '✓' : '—'}</td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={7} className="sacc-empty">Geen errors voor deze filters.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

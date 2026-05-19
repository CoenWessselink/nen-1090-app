import type { TenantLimitSummary } from '@/api/superadminCommercialGovernance';

function statusTone(s: string) { if (s === 'exceeded') return 'danger'; if (s === 'warning') return 'warning'; return 'success'; }

export function TenantLimitsPanel({ tenantId: _tenantId, limits, onRefresh: _onRefresh }: { tenantId: string; limits: TenantLimitSummary | null; onRefresh: () => void }) {
  if (!limits) return <div className="cg-state">Geen limietdata beschikbaar.</div>;

  return (
    <div className="cg-section">
      <h3>Limieten &amp; quota — {limits.plan_code}</h3>
      <table className="cg-table">
        <thead><tr><th>Limiet</th><th>Gebruikt</th><th>Max</th><th>%</th><th>Bron</th><th>Status</th></tr></thead>
        <tbody>
          {limits.limits.map((l) => {
            const pct = l.unlimited ? 0 : l.limit ? Math.round((l.used / l.limit) * 100) : 0;
            return (
              <tr key={l.key}>
                <td><strong>{l.label}</strong><small>{l.key}</small></td>
                <td>{l.used}</td>
                <td>{l.unlimited ? '∞' : l.limit}</td>
                <td>
                  <div className="cg-progress"><span style={{ width: `${Math.min(pct, 100)}%` }} className={`cg-progress-fill cg-fill-${statusTone(l.status)}`} /></div>
                  <small>{pct}%</small>
                </td>
                <td><span className="cg-badge cg-badge-neutral">{l.source}</span></td>
                <td><span className={`cg-badge cg-badge-${statusTone(l.status)}`}>{l.status}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

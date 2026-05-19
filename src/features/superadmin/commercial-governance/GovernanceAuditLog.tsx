import type { GovernanceAuditEvent } from '@/api/superadminCommercialGovernance';

function dateLabel(v: string) { if (!v) return '—'; const d = new Date(v); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('nl-NL'); }

export function GovernanceAuditLog({ events }: { events: GovernanceAuditEvent[] }) {
  return (
    <div className="cg-section">
      <h3>Governance Audit Log</h3>
      {events.length ? (
        <table className="cg-table">
          <thead><tr><th>Tijd</th><th>Actor</th><th>Actie</th><th>Entiteit</th><th>Reden</th></tr></thead>
          <tbody>{events.map((e) => (
            <tr key={e.id}>
              <td>{dateLabel(e.created_at)}</td>
              <td>{e.actor_email}<small>{e.actor_role}</small></td>
              <td><strong>{e.action}</strong></td>
              <td>{e.entity_type} {e.entity_id ? `(${e.entity_id.slice(0, 8)}…)` : ''}</td>
              <td>{e.reason || '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      ) : (
        <div className="cg-empty-state">
          <strong>Geen audit events</strong>
          <p>Governance audit events verschijnen zodra commerciële acties worden uitgevoerd (plan wijzigen, schorsen, feature flags, impersonatie).</p>
        </div>
      )}
    </div>
  );
}

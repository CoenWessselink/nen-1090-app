import { Activity, AlertTriangle, CheckCircle2, Database, Mail, Server, Shield, HardDrive } from 'lucide-react';
import type { PlatformHealth } from '@/api/superadminControlCenter';

function tone(status: string) {
  const s = status.toLowerCase();
  if (s === 'healthy' || s === 'configured' || s === 'active') return 'success';
  if (s === 'degraded' || s === 'unknown' || s === 'not_configured') return 'warning';
  return 'danger';
}

function icon(status: string) {
  const t = tone(status);
  if (t === 'success') return <CheckCircle2 size={16} />;
  if (t === 'warning') return <AlertTriangle size={16} />;
  return <AlertTriangle size={16} />;
}

export function SuperadminHealthCards({ health }: { health: PlatformHealth | null }) {
  if (!health) return <div className="sacc-state">Platform health laden…</div>;

  const cards = [
    { label: 'API', value: health.api.status, icon: <Server size={18} />, sub: health.api.version || health.api.environment },
    { label: 'Database', value: health.database.status, icon: <Database size={18} />, sub: health.database.latency_ms != null ? `${health.database.latency_ms}ms` : '' },
    { label: 'Auth', value: health.auth.status, icon: <Shield size={18} />, sub: `TTL ${health.auth.access_ttl_min}min` },
    { label: 'Mail', value: health.mail.status, icon: <Mail size={18} />, sub: health.mail.provider },
    { label: 'Storage', value: health.storage.status, icon: <HardDrive size={18} />, sub: health.storage.uploads_available ? 'Uploads OK' : 'Unavailable' },
    { label: 'Errors 24h', value: String(health.recent.errors_24h), icon: <AlertTriangle size={18} />, sub: '', raw: true },
    { label: 'Pending activations', value: String(health.recent.activations_pending), icon: <Activity size={18} />, sub: '', raw: true },
  ];

  return (
    <div className="sacc-health-grid">
      {cards.map((card) => (
        <div key={card.label} className={`sacc-health-card sacc-tone-${card.raw ? 'neutral' : tone(card.value)}`}>
          <div className="sacc-health-icon">{card.icon}</div>
          <div className="sacc-health-body">
            <span className="sacc-health-label">{card.label}</span>
            <strong>{card.raw ? card.value : card.value}{!card.raw && icon(card.value)}</strong>
            {card.sub ? <small>{card.sub}</small> : null}
          </div>
        </div>
      ))}

      <div className="sacc-counts-row">
        <div><span>Tenants</span><strong>{health.counts.tenants}</strong></div>
        <div><span>Users</span><strong>{health.counts.users}</strong></div>
        <div><span>Projects</span><strong>{health.counts.projects}</strong></div>
        <div><span>Welds</span><strong>{health.counts.welds}</strong></div>
      </div>
    </div>
  );
}

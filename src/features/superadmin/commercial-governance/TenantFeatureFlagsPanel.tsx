import { useState } from 'react';
import { updateTenantFeatureFlag, type TenantFeatureFlag } from '@/api/superadminCommercialGovernance';

function sourceTone(s: string) { if (s === 'tenant_override') return 'warning'; if (s === 'plan') return 'neutral'; return 'neutral'; }

export function TenantFeatureFlagsPanel({ tenantId, features, onRefresh }: { tenantId: string; features: TenantFeatureFlag[]; onRefresh: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function toggle(key: string, current: boolean) {
    setBusy(key); setErr(null);
    try { await updateTenantFeatureFlag(tenantId, key, !current); onRefresh(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Toggle mislukt.'); }
    finally { setBusy(null); }
  }

  const grouped = new Map<string, TenantFeatureFlag[]>();
  features.forEach((f) => { const cat = f.category || 'Overig'; if (!grouped.has(cat)) grouped.set(cat, []); grouped.get(cat)!.push(f); });

  return (
    <div className="cg-section">
      <h3>Feature Flags</h3>
      {err ? <div className="cg-alert cg-alert-danger">{err}</div> : null}
      {Array.from(grouped.entries()).map(([category, flags]) => (
        <div key={category} className="cg-flag-group">
          <h4>{category}</h4>
          {flags.map((f) => (
            <div key={f.feature_key} className="cg-flag-row">
              <div className="cg-flag-info">
                <strong>{f.name}</strong>
                <span className={`cg-badge cg-badge-${sourceTone(f.source)}`}>{f.source}</span>
              </div>
              <button
                type="button"
                className={`cg-toggle${f.enabled ? ' is-on' : ''}`}
                onClick={() => toggle(f.feature_key, f.enabled)}
                disabled={busy === f.feature_key}
                aria-label={`${f.name} ${f.enabled ? 'uit' : 'aan'}zetten`}
              >
                <span className="cg-toggle-knob" />
              </button>
            </div>
          ))}
        </div>
      ))}
      {!features.length && <div className="cg-empty">Geen feature flags beschikbaar.</div>}
    </div>
  );
}

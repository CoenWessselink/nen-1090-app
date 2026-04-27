import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, FileCheck2, Gauge, ShieldCheck } from 'lucide-react';
import { getProjectNormSelection, getProjectQualityDashboard, type ProjectNormSelection, type QualityDashboard } from '@/api/norms';

function n(value: unknown) { return Number(value || 0); }
function pct(value: unknown) { return `${Math.round(n(value))}%`; }
function profile(selection: ProjectNormSelection | null, dashboard: QualityDashboard | null) {
  return selection?.norm_profile?.code || selection?.profile?.code || dashboard?.norm_profile?.code || 'EU_EXC2_STANDARD';
}

export function ProjectQualityNormCard({ projectId, onOpen }: { projectId: string; onOpen?: () => void }) {
  const [dashboard, setDashboard] = useState<QualityDashboard | null>(null);
  const [selection, setSelection] = useState<ProjectNormSelection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getProjectQualityDashboard(projectId), getProjectNormSelection(projectId)])
      .then(([dash, sel]) => { if (!active) return; setDashboard(dash); setSelection(sel); setError(null); })
      .catch((err) => { if (!active) return; setError(err instanceof Error ? err.message : 'Kwaliteitsdashboard niet geladen.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId]);

  const welds = dashboard?.welds || {};
  const percentages = dashboard?.percentages || {};
  const nc = dashboard?.nonconformities || {};
  const ndt = dashboard?.ndt || {};
  const ce = dashboard?.ce_readiness || {};

  return (
    <button type="button" className="quality-norm-card" onClick={onOpen} aria-label="Open kwaliteit en normstatus">
      <div className="quality-norm-card-header">
        <div><span>Kwaliteit & Normstatus</span><strong>{profile(selection, dashboard)}</strong></div>
        <ShieldCheck size={22} />
      </div>
      {loading ? <p className="quality-norm-muted">Normstatus laden…</p> : null}
      {error ? <p className="quality-norm-error">{error}</p> : null}
      {!loading && !error ? (
        <div className="quality-norm-grid">
          <div><Gauge size={16} /><span>Totaal lassen</span><strong>{n(welds.total)}</strong></div>
          <div><CheckCircle2 size={16} /><span>Conform</span><strong>{pct(percentages.conform)}</strong></div>
          <div><Activity size={16} /><span>In control</span><strong>{pct(percentages.in_control)}</strong></div>
          <div><AlertTriangle size={16} /><span>Afgekeurd</span><strong>{pct(percentages.rejected)}</strong></div>
          <div><AlertTriangle size={16} /><span>Open NC's</span><strong>{n(nc.open)}</strong></div>
          <div><FileCheck2 size={16} /><span>NDO pending</span><strong>{n(ndt.pending)}</strong></div>
          <div className="wide"><FileCheck2 size={16} /><span>CE readiness</span><strong>{pct(ce.percentage)}</strong></div>
        </div>
      ) : null}
    </button>
  );
}

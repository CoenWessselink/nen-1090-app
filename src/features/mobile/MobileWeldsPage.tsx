import { useEffect, useState } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProjectWelds } from '@/api/projects';
import { getInspectionForWeld } from '@/api/inspections';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { latestInspectionDate, weldNumber, weldStatusLabel, weldStatusTone, weldSubtitle } from '@/features/mobile/mobile-utils';
import type { Inspection, Weld } from '@/types/domain';

export function MobileWeldsPage() {
  const navigate = useNavigate();
  const { projectId = '' } = useParams();
  const [welds, setWelds] = useState<Weld[]>([]);
  const [inspectionMap, setInspectionMap] = useState<Record<string, Inspection | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getProjectWelds(projectId, { page: 1, limit: 50 })
      .then(async (response) => {
        if (!active) return;
        const rows = Array.isArray(response?.items) ? response.items : [];
        setWelds(rows);
        const entries = await Promise.all(
          rows.slice(0, 20).map(async (weld) => {
            try {
              const inspection = (await getInspectionForWeld(projectId, weld.id)) as Inspection | null;
              return [String(weld.id), inspection] as const;
            } catch {
              return [String(weld.id), null] as const;
            }
          }),
        );
        if (!active) return;
        setInspectionMap(Object.fromEntries(entries));
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Lassen konden niet worden geladen.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  return (
    <MobilePageScaffold
      title="Lassen"
      backTo={`/projecten/${projectId}/overzicht`}
      rightSlot={
        <button className="mobile-icon-button" type="button" aria-label="Nieuwe las" onClick={() => navigate(`/projecten/${projectId}/lassen/nieuw`)}>
          <Plus size={18} />
        </button>
      }
    >
      <div className="mobile-inline-actions" style={{ marginBottom: 12 }}>
        <button type="button" className="mobile-primary-button" onClick={() => navigate(`/projecten/${projectId}/lassen/nieuw`)}>
          <Plus size={16} /> Nieuwe las
        </button>
      </div>
      {loading ? <div className="mobile-state-card">Lassen laden…</div> : null}
      {error ? <div className="mobile-state-card mobile-state-card-error">{error}</div> : null}
      {!loading && !error ? (
        <div className="mobile-list-stack">
          {welds.map((weld) => {
            const inspection = inspectionMap[String(weld.id)] || null;
            const tone = weldStatusTone(inspection?.status || inspection?.result || weld.status);
            return (
              <div key={String(weld.id)} className="mobile-list-card">
                <div className="mobile-list-card-head">
                  <strong>Lasnummer {weldNumber(weld)}</strong>
                  <button className="mobile-link-button" type="button" onClick={() => navigate(`/projecten/${projectId}/lassen/${weld.id}/inspectie`)}>
                    Inspectie <ChevronRight size={14} />
                  </button>
                </div>
                <span className="mobile-list-card-subtitle">{weldSubtitle(weld)}</span>
                <div className="mobile-inline-meta">
                  <span>Status: {weldStatusLabel(inspection?.status || inspection?.result || weld.status)}</span>
                  <span className={`mobile-pill mobile-pill-${tone}`}>{weldStatusLabel(inspection?.status || inspection?.result || weld.status)}</span>
                </div>
                <span className="mobile-list-card-meta">Laatste inspectie: {latestInspectionDate(weld, inspection)}</span>
                <div className="mobile-inline-actions">
                  <button type="button" className="mobile-secondary-button" onClick={() => navigate(`/projecten/${projectId}/lassen/${weld.id}/bewerken`)}>
                    Bewerken
                  </button>
                  <button type="button" className="mobile-primary-button" onClick={() => navigate(`/projecten/${projectId}/lassen/${weld.id}/inspectie`)}>
                    Inspectie
                  </button>
                </div>
              </div>
            );
          })}
          {!welds.length ? <div className="mobile-state-card">Nog geen lassen in dit project.</div> : null}
        </div>
      ) : null}
    </MobilePageScaffold>
  );
}

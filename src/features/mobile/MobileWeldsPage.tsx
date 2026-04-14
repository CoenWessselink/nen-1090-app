import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
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

  async function loadWelds() {
    setLoading(true);
    try {
      const response = await getProjectWelds(projectId, { page: 1, limit: 50 });
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
      setInspectionMap(Object.fromEntries(entries));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lassen konden niet worden geladen.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWelds();
  }, [projectId]);

  return (
    <MobilePageScaffold title="Lassen" backTo={`/projecten/${projectId}/overzicht`} testId="mobile-welds-page">
      {loading ? <div className="mobile-state-card" data-testid="mobile-welds-loading">Lassen laden…</div> : null}
      {error ? (
        <div className="mobile-state-card mobile-state-card-error" data-testid="mobile-welds-error">
          <strong>Lassen niet beschikbaar</strong>
          <span>{error}</span>
          <button type="button" className="mobile-secondary-button" onClick={() => void loadWelds()}>
            Opnieuw proberen
          </button>
        </div>
      ) : null}
      {!loading && !error ? (
        <div className="mobile-list-stack" data-testid="mobile-welds-list">
          {welds.map((weld) => {
            const inspection = inspectionMap[String(weld.id)] || null;
            const tone = weldStatusTone((inspection as Record<string, unknown> | null)?.status || (inspection as Record<string, unknown> | null)?.result || weld.status);
            return (
              <div key={String(weld.id)} className="mobile-list-card" data-testid={`mobile-weld-card-${weld.id}`}>
                <div className="mobile-list-card-head">
                  <strong>Lasnummer&nbsp;&nbsp;{weldNumber(weld)}</strong>
                  <button className="mobile-link-button" type="button" onClick={() => navigate(`/projecten/${projectId}/lassen/${weld.id}/inspectie`)}>
                    Inspectie <ChevronRight size={14} />
                  </button>
                </div>
                <span className="mobile-list-card-subtitle">{weldSubtitle(weld)}</span>
                <div className="mobile-inline-meta">
                  <span>Status: {weldStatusLabel((inspection as Record<string, unknown> | null)?.status || (inspection as Record<string, unknown> | null)?.result || weld.status)}</span>
                  <span className={`mobile-pill mobile-pill-${tone}`}>{weldStatusLabel((inspection as Record<string, unknown> | null)?.status || (inspection as Record<string, unknown> | null)?.result || weld.status)}</span>
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

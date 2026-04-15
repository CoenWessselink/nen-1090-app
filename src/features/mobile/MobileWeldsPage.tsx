import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProjectWelds } from '@/api/projects';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { APP_REFRESH_EVENT, latestInspectionDate, normalizeApiError, weldNumber, weldStatusLabel, weldStatusTone, weldSubtitle } from '@/features/mobile/mobile-utils';
import type { Weld } from '@/types/domain';

export function MobileWeldsPage() {
  const navigate = useNavigate();
  const { projectId = '' } = useParams();
  const [welds, setWelds] = useState<Weld[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWelds = useCallback(() => {
    let active = true;
    setLoading(true);
    getProjectWelds(projectId, { page: 1, limit: 100 })
      .then((response) => {
        if (!active) return;
        const rows = Array.isArray(response?.items) ? response.items : [];
        setWelds(rows);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(normalizeApiError(err, 'Lassen konden niet worden geladen.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  useEffect(() => loadWelds(), [loadWelds]);

  useEffect(() => {
    const reload = () => loadWelds();
    window.addEventListener(APP_REFRESH_EVENT, reload as EventListener);
    window.addEventListener('focus', reload);
    return () => {
      window.removeEventListener(APP_REFRESH_EVENT, reload as EventListener);
      window.removeEventListener('focus', reload);
    };
  }, [loadWelds]);

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
            const tone = weldStatusTone(weld.status);
            return (
              <div key={String(weld.id)} className="mobile-list-card" onDoubleClick={() => navigate(`/projecten/${projectId}/lassen/${weld.id}/bewerken`)}>
                <div className="mobile-list-card-head">
                  <strong>Lasnummer {weldNumber(weld)}</strong>
                  <button className="mobile-link-button" type="button" onClick={() => navigate(`/projecten/${projectId}/lassen/${weld.id}/inspectie`)}>
                    Inspectie <ChevronRight size={14} />
                  </button>
                </div>
                <span className="mobile-list-card-subtitle">{weldSubtitle(weld)}</span>
                <div className="mobile-inline-meta">
                  <span>Status: {weldStatusLabel(weld.status)}</span>
                  <span className={`mobile-pill mobile-pill-${tone}`}>{weldStatusLabel(weld.status)}</span>
                </div>
                <span className="mobile-list-card-meta">Laatste update: {latestInspectionDate(weld, null)}</span>
                <div className="mobile-inline-actions stack-on-mobile">
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

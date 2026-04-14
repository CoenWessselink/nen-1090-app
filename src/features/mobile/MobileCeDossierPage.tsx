import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCeDossier } from '@/api/ce';
import { getProjectDocuments } from '@/api/documents';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { firstPdfDocument, normalizeChecklist, projectOverviewPath } from '@/features/mobile/mobile-utils';
import type { CeDocument } from '@/types/domain';

export function MobileCeDossierPage() {
  const navigate = useNavigate();
  const { projectId = '' } = useParams();
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [documents, setDocuments] = useState<CeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDossier() {
    setLoading(true);
    try {
      const [dossier, docs] = await Promise.all([
        getCeDossier(projectId),
        getProjectDocuments(projectId, { page: 1, limit: 50 }).catch(() => ({ items: [] as CeDocument[] })),
      ]);
      setPayload((dossier || {}) as Record<string, unknown>);
      setDocuments(Array.isArray(docs?.items) ? docs.items : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CE-dossier kon niet worden geladen.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDossier();
  }, [projectId]);

  const checklist = useMemo(() => normalizeChecklist(payload?.checklist || payload?.sections), [payload]);
  const score = Number(payload?.score || 0);
  const pdf = firstPdfDocument(documents);

  return (
    <MobilePageScaffold title="CE-Dossier" backTo={projectOverviewPath(projectId)} testId="mobile-ce-page">
      {loading ? <div className="mobile-state-card" data-testid="mobile-ce-loading">CE-dossier laden…</div> : null}
      {error ? (
        <div className="mobile-state-card mobile-state-card-error" data-testid="mobile-ce-error">
          <strong>CE-dossier niet beschikbaar</strong>
          <span>{error}</span>
          <button type="button" className="mobile-secondary-button" onClick={() => void loadDossier()}>
            Opnieuw proberen
          </button>
        </div>
      ) : null}
      {!loading ? (
        <div className="mobile-list-stack" data-testid="mobile-ce-content">
          <div className="mobile-progress-card">
            <div>
              <strong>Dossier Progressie</strong>
              <span>Voldoende</span>
            </div>
            <div className="mobile-progress-value">{Math.round(score / 10) || 0}/10</div>
            <div className="mobile-progress-bar"><span style={{ width: `${Math.max(Math.min(score, 100), 8)}%` }} /></div>
            <small>{score}% compleet</small>
          </div>
          <div className="mobile-checklist-card">
            {checklist.map((item) => (
              <div key={item.label} className="mobile-checklist-row">
                <strong>{item.label}</strong>
                <span className={`mobile-checklist-status status-${item.status.toLowerCase().replace(/\s+/g, '-')}`}>{item.status}</span>
              </div>
            ))}
            {!checklist.length ? <div className="mobile-state-card">Nog geen CE-checklist beschikbaar.</div> : null}
          </div>
          <button type="button" className="mobile-primary-button" onClick={() => (pdf ? navigate(`/projecten/${projectId}/documenten/${pdf.id}/viewer`) : navigate(`/projecten/${projectId}/documenten`))} data-testid="mobile-ce-open-pdf">
            Open PDF viewer
          </button>
        </div>
      ) : null}
    </MobilePageScaffold>
  );
}

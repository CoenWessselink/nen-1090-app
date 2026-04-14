import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, RefreshCcw } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { createPdfExport, getCeDossier } from '@/api/ce';
import { getProjectDocuments } from '@/api/documents';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { firstPdfDocument, formatValue, normalizeChecklist } from '@/features/mobile/mobile-utils';
import type { CeDocument } from '@/types/domain';

function toChecklistGroups(checklist: Array<{ label: string; status: string }>) {
  const primary = checklist.slice(0, 4);
  const secondary = checklist.slice(4);
  return { primary, secondary };
}

export function MobileCeDossierPage() {
  const navigate = useNavigate();
  const { projectId = '' } = useParams();
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [documents, setDocuments] = useState<CeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDossier() {
    const [dossier, docs] = await Promise.all([
      getCeDossier(projectId),
      getProjectDocuments(projectId, { page: 1, limit: 100 }).catch(() => ({ items: [] as CeDocument[] })),
    ]);
    setPayload((dossier || {}) as Record<string, unknown>);
    setDocuments(Array.isArray(docs?.items) ? docs.items : []);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadDossier()
      .then(() => {
        if (!active) return;
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'CE-dossier kon niet worden geladen.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  const checklist = useMemo(() => normalizeChecklist(payload?.checklist || payload?.sections), [payload]);
  const score = Math.max(0, Math.min(100, Number(payload?.score || 0)));
  const status = formatValue(payload?.status, score >= 80 ? 'Voldoende' : 'In behandeling');
  const pdf = firstPdfDocument(documents);
  const { primary, secondary } = toChecklistGroups(checklist);
  const completed = checklist.filter((item) => item.status === 'Compleet').length;

  async function handleCreatePdf() {
    try {
      setExporting(true);
      setError(null);
      const result = await createPdfExport(projectId);
      const downloadUrl = typeof result === 'object' && result ? String((result as Record<string, unknown>).download_url || (result as Record<string, unknown>).url || '') : '';
      if (downloadUrl) {
        window.open(downloadUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      navigate(`/projecten/${projectId}/pdf-viewer`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF kon niet worden aangemaakt.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <MobilePageScaffold title="CE-Dossier" backTo={`/projecten/${projectId}/overzicht`}>
      {loading ? <div className="mobile-state-card">CE-dossier laden…</div> : null}
      {error ? <div className="mobile-state-card mobile-state-card-error">{error}</div> : null}
      {!loading ? (
        <div className="mobile-list-stack">
          <div className="mobile-progress-card">
            <div className="mobile-progress-head">
              <div>
                <strong>Dossier Progressie</strong>
                <span>{status}</span>
              </div>
              <div className="mobile-progress-value">{completed}/{checklist.length || 10}</div>
            </div>
            <div className="mobile-progress-bar"><span style={{ width: `${Math.max(score, 6)}%` }} /></div>
            <small>{score}% compleet</small>
          </div>

          <div className="mobile-detail-card">
            <div className="mobile-field-row"><span>Lassen geregistreerd</span><strong>{formatValue(payload?.welds_count || payload?.weld_count, '0')}</strong></div>
            <div className="mobile-field-row"><span>Inspecties aanwezig</span><strong>{formatValue(payload?.inspection_count, '0')}</strong></div>
            <div className="mobile-field-row"><span>Documenten gekoppeld</span><strong>{formatValue(payload?.attachments_count || documents.length, '0')}</strong></div>
          </div>

          <div className="mobile-checklist-card">
            {primary.map((item) => (
              <div key={item.label} className="mobile-checklist-row">
                <strong>{item.label}</strong>
                <span className={`mobile-checklist-status status-${item.status.toLowerCase().replace(/\s+/g, '-')}`}>{item.status}</span>
              </div>
            ))}
          </div>

          {secondary.length ? (
            <div className="mobile-checklist-card">
              {secondary.map((item) => (
                <div key={item.label} className="mobile-checklist-row">
                  <strong>{item.label}</strong>
                  <span className={`mobile-checklist-status status-${item.status.toLowerCase().replace(/\s+/g, '-')}`}>{item.status}</span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mobile-inline-actions">
            <button type="button" className="mobile-primary-button" onClick={() => navigate(pdf ? `/projecten/${projectId}/documenten/${pdf.id}/viewer` : `/projecten/${projectId}/pdf-viewer`)}>
              <FileText size={16} /> Open PDF viewer
            </button>
            <button type="button" className="mobile-secondary-button" disabled={exporting} onClick={handleCreatePdf}>
              <Download size={16} /> {exporting ? 'PDF maken…' : 'Maak PDF'}
            </button>
          </div>

          <button type="button" className="mobile-link-button" onClick={() => { setLoading(true); loadDossier().finally(() => setLoading(false)); }}>
            <RefreshCcw size={14} /> Vernieuw dossierstatus
          </button>
        </div>
      ) : null}
    </MobilePageScaffold>
  );
}

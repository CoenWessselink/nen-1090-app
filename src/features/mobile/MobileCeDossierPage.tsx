import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, RefreshCcw } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { createPdfExport, getCeDossier } from '@/api/ce';
import { getProjectDocuments } from '@/api/documents';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { openDownloadUrl } from '@/utils/download';
import { firstPdfDocument, formatValue, groupChecklist, normalizeApiError, normalizeChecklist, summarizeChecklist } from '@/features/mobile/mobile-utils';
import type { CeDocument } from '@/types/domain';

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
        setError(normalizeApiError(err, 'CE-dossier kon niet worden geladen.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  const checklist = useMemo(() => normalizeChecklist(payload?.checklist || payload?.sections), [payload]);
  const checklistGroups = useMemo(() => groupChecklist(checklist), [checklist]);
  const summary = useMemo(() => summarizeChecklist(checklist), [checklist]);
  const score = Math.max(0, Math.min(100, Number(payload?.score || (summary.total ? Math.round((summary.complete / summary.total) * 100) : 0))));
  const status = formatValue(payload?.status, score >= 80 ? 'Voldoende' : 'In behandeling');
  const pdf = firstPdfDocument(documents);

  async function handleCreatePdf() {
    try {
      setExporting(true);
      setError(null);
      const result = await createPdfExport(projectId);
      const downloadUrl = typeof result === 'object' && result ? String((result as Record<string, unknown>).download_url || (result as Record<string, unknown>).url || '') : '';
      if (downloadUrl) {
        await openDownloadUrl(downloadUrl, 'CE-Dossier.pdf');
        return;
      }
      navigate(`/projecten/${projectId}/pdf-viewer`);
    } catch (err) {
      setError(normalizeApiError(err, 'PDF kon niet worden aangemaakt.'));
    } finally {
      setExporting(false);
    }
  }

  return (
    <MobilePageScaffold title="CE-Dossier" backTo={`/projecten/${projectId}/overzicht`}>
      {loading ? <div className="mobile-state-card">CE-dossier laden…</div> : null}
      {error ? <div className="mobile-inline-alert is-error">{error}</div> : null}
      {!loading ? (
        <div className="mobile-list-stack">
          <div className="mobile-progress-card">
            <div className="mobile-progress-head">
              <div>
                <strong>Dossier progressie</strong>
                <span>{status}</span>
              </div>
              <div className="mobile-progress-value">{summary.complete}/{summary.total || 10}</div>
            </div>
            <div className="mobile-progress-bar"><span style={{ width: `${Math.max(score, 6)}%` }} /></div>
            <small>{score}% compleet</small>
          </div>

          <div className="mobile-summary-grid">
            <div className="mobile-summary-card"><span>Compleet</span><strong>{summary.complete}</strong></div>
            <div className="mobile-summary-card"><span>Vereist</span><strong>{summary.required}</strong></div>
            <div className="mobile-summary-card"><span>Ontbreekt</span><strong>{summary.missing}</strong></div>
            <div className="mobile-summary-card"><span>PDF</span><strong>{pdf ? 'Ja' : 'Nee'}</strong></div>
          </div>

          <div className="mobile-detail-card">
            <div className="mobile-field-row"><span>Lassen geregistreerd</span><strong>{formatValue(payload?.welds_count || payload?.weld_count, '0')}</strong></div>
            <div className="mobile-field-row"><span>Inspecties aanwezig</span><strong>{formatValue(payload?.inspection_count, '0')}</strong></div>
            <div className="mobile-field-row"><span>Documenten gekoppeld</span><strong>{formatValue(payload?.attachments_count || documents.length, '0')}</strong></div>
          </div>

          {checklistGroups.map((group) => (
            <div key={group.group} className="mobile-checklist-card grouped-checklist-card">
              <div className="mobile-section-kicker">{group.group}</div>
              {group.rows.map((item) => (
                <div key={`${group.group}-${item.label}`} className="mobile-checklist-row">
                  <strong>{item.label}</strong>
                  <span className={`mobile-checklist-status status-${item.status.toLowerCase().replace(/\s+/g, '-')}`}>{item.status}</span>
                </div>
              ))}
            </div>
          ))}

          <div className="mobile-inline-actions stack-on-mobile">
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

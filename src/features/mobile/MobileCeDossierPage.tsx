import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, FolderOpen, PencilLine, RefreshCcw, Settings, Wrench } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { createPdfExport, getCeDossier } from '@/api/ce';
import { getProjectDocuments } from '@/api/documents';
import { Modal } from '@/components/overlays/Modal';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { openDownloadUrl } from '@/utils/download';
import { buildCeDossierFilename, firstPdfDocument, formatValue, groupChecklist, normalizeApiError, normalizeChecklist, summarizeChecklist } from '@/features/mobile/mobile-utils';
import type { CeDocument } from '@/types/domain';

type CeRowDetail = {
  label: string;
  status: string;
  detail: string;
  section: 'project' | 'welds' | 'inspections' | 'documents' | 'settings';
};

function resolveRowSection(label: string, group?: string): CeRowDetail['section'] {
  const value = `${group || ''} ${label}`.toLowerCase();
  if (value.includes('project') || value.includes('exc')) return 'project';
  if (value.includes('template') || value.includes('materiaal') || value.includes('lasser') || value.includes('wps')) return 'settings';
  if (value.includes('inspect')) return 'inspections';
  if (value.includes('document') || value.includes('foto') || value.includes('export')) return 'documents';
  return 'welds';
}

function detailFromRow(section: CeRowDetail['section']) {
  if (section === 'project') return 'Werk projectbasis, opdrachtgever of EXC-klasse direct bij.';
  if (section === 'settings') return 'Open instellingen om templates, materialen, lassers of WPS direct te wijzigen.';
  if (section === 'documents') return 'Open documenten of PDF-viewer om ontbrekende stukken direct aan te vullen.';
  if (section === 'inspections') return 'Open lassen en inspecties om controlepunten direct bij te werken.';
  return 'Open lassen om lassen, lassers en koppelingen direct bij te werken.';
}

export function MobileCeDossierPage() {
  const navigate = useNavigate();
  const { projectId = '' } = useParams();
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [documents, setDocuments] = useState<CeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<CeRowDetail | null>(null);

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

  const summaryRows = [
    { label: 'Lassen geregistreerd', value: formatValue(payload?.welds_count || payload?.weld_count, '0'), section: 'welds' as const },
    { label: 'Inspecties aanwezig', value: formatValue(payload?.inspection_count, '0'), section: 'inspections' as const },
    { label: 'Documenten gekoppeld', value: formatValue(payload?.attachments_count || documents.length, '0'), section: 'documents' as const },
  ];

  function openRow(label: string, statusLabel: string, group?: string, detail?: string) {
    const section = resolveRowSection(label, group);
    setSelectedRow({
      label,
      status: statusLabel,
      section,
      detail: detail || detailFromRow(section),
    });
  }

  async function handleCreatePdf() {
    try {
      setExporting(true);
      setError(null);
      const result = await createPdfExport(projectId);
      const downloadUrl = typeof result === 'object' && result ? String((result as Record<string, unknown>).download_url || (result as Record<string, unknown>).url || '') : '';
      if (downloadUrl) {
        await openDownloadUrl(downloadUrl, buildCeDossierFilename(payload));
        return;
      }
      navigate(`/projecten/${projectId}/pdf-viewer`);
    } catch (err) {
      setError(normalizeApiError(err, 'PDF kon niet worden aangemaakt.'));
    } finally {
      setExporting(false);
    }
  }

  function openSection(section: CeRowDetail['section']) {
    setSelectedRow(null);
    if (section === 'project') {
      navigate(`/projecten/${projectId}/overzicht`);
      return;
    }
    if (section === 'settings') {
      navigate('/instellingen');
      return;
    }
    if (section === 'documents') {
      navigate(`/projecten/${projectId}/documenten`);
      return;
    }
    navigate(`/projecten/${projectId}/lassen`);
  }

  return (
    <>
      <MobilePageScaffold title="CE-Dossier" subtitle="Elke regel opent direct een wijzig-popup met vervolgactie" backTo={`/projecten/${projectId}/overzicht`}>
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
              <button type="button" className="mobile-summary-card" onClick={() => openRow('Compleet', String(summary.complete), 'project', 'Open project en gekoppelde modules om ontbrekende onderdelen af te werken.') }><span>Compleet</span><strong>{summary.complete}</strong></button>
              <button type="button" className="mobile-summary-card" onClick={() => openRow('Vereist', String(summary.required), 'project', 'Controleer welke verplichte ketenonderdelen nog openstaan.') }><span>Vereist</span><strong>{summary.required}</strong></button>
              <button type="button" className="mobile-summary-card" onClick={() => openRow('Ontbreekt', String(summary.missing), 'documents', 'Werk ontbrekende documenten, lassen of inspecties bij vanuit de popup.') }><span>Ontbreekt</span><strong>{summary.missing}</strong></button>
              <button type="button" className="mobile-summary-card" onClick={() => openRow('PDF', pdf ? 'Ja' : 'Nee', 'documents', pdf ? 'Er is al een PDF beschikbaar. Open de viewer of download direct.' : 'Maak eerst een PDF of koppel een PDF-document.') }><span>PDF</span><strong>{pdf ? 'Ja' : 'Nee'}</strong></button>
            </div>

            <div className="mobile-detail-card">
              <div className="mobile-list-card-meta" style={{ marginBottom: 8 }}>Klik op elke regel om direct de gekoppelde popup te openen.</div>
              {summaryRows.map((row) => (
                <button key={row.label} type="button" className="mobile-field-button" onClick={() => openRow(row.label, row.value, row.section, detailFromRow(row.section))}>
                  <div className="mobile-field-row"><span>{row.label}</span><strong>{row.value}</strong></div>
                </button>
              ))}
            </div>

            {checklistGroups.map((group) => (
              <div key={group.group} className="mobile-checklist-card grouped-checklist-card">
                <div className="mobile-section-kicker">{group.group}</div>
                {group.rows.map((item) => (
                  <button key={`${group.group}-${item.label}`} type="button" className="mobile-checklist-row mobile-checklist-row-button" aria-label={`Wijzig ${item.label}`} onClick={() => openRow(item.label, item.status, group.group, detailFromRow(resolveRowSection(item.label, group.group)))}>
                    <strong>{item.label}</strong>
                    <span className={`mobile-checklist-status status-${item.status.toLowerCase().replace(/\s+/g, '-')}`}>{item.status}</span>
                  </button>
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

      <Modal open={Boolean(selectedRow)} onClose={() => setSelectedRow(null)} title={selectedRow?.label || 'CE-regel wijzigen'} size="large">
        {selectedRow ? (
          <div className="mobile-form-card" style={{ boxShadow: 'none', border: '0', padding: 0 }}>
            <div className="mobile-detail-card" style={{ boxShadow: 'none', margin: 0 }}>
              <div className="mobile-field-row"><span>Regel</span><strong>{selectedRow.label}</strong></div>
              <div className="mobile-field-row"><span>Status</span><strong>{selectedRow.status}</strong></div>
              <div className="mobile-field-row"><span>Actiepad</span><strong>{selectedRow.section}</strong></div>
              <div className="mobile-field-row"><span>Toelichting</span><strong>{selectedRow.detail}</strong></div>
            </div>
            <div className="mobile-inline-actions stack-on-mobile">
              <button type="button" className="mobile-primary-button" onClick={() => openSection(selectedRow.section)}>
                <PencilLine size={16} /> Wijzig gekoppelde gegevens
              </button>
              <button type="button" className="mobile-secondary-button" onClick={() => navigate(`/projecten/${projectId}/pdf-viewer`)}>
                <FileText size={16} /> Bekijk PDF
              </button>
            </div>
            <div className="mobile-inline-actions stack-on-mobile">
              <button type="button" className="mobile-secondary-button" onClick={() => navigate(`/projecten/${projectId}/overzicht`)}>
                <Wrench size={16} /> Project 360
              </button>
              <button type="button" className="mobile-secondary-button" onClick={() => navigate(`/projecten/${projectId}/documenten`)}>
                <FolderOpen size={16} /> Documenten
              </button>
              <button type="button" className="mobile-secondary-button" onClick={() => navigate('/instellingen')}>
                <Settings size={16} /> Instellingen
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { createPdfExport, getCeDossier } from '@/api/ce';
import { getProjectDocuments } from '@/api/documents';
import { Modal } from '@/components/overlays/Modal';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { openDownloadUrl } from '@/utils/download';
import {
  buildCeDossierFilename,
  firstPdfDocument,
  formatValue,
  groupChecklist,
  normalizeApiError,
  normalizeChecklist,
  summarizeChecklist,
} from '@/features/mobile/mobile-utils';
import type { CeDocument } from '@/types/domain';

type CeSection = 'project' | 'welds' | 'inspections' | 'documents' | 'settings';
type CeStatus = 'Compleet' | 'Vereist' | 'Ontbreekt';

type CeRowDetail = {
  key: string;
  label: string;
  value?: string;
  status: CeStatus;
  group?: string;
  section: CeSection;
  note: string;
};

type OverrideMap = Record<string, { status: CeStatus; value?: string; note?: string }>;

function resolveRowSection(label: string, group?: string): CeSection {
  const value = `${group || ''} ${label}`.toLowerCase();
  if (value.includes('project') || value.includes('exc')) return 'project';
  if (value.includes('template') || value.includes('materiaal') || value.includes('lasser') || value.includes('wps')) return 'settings';
  if (value.includes('inspect')) return 'inspections';
  if (value.includes('document') || value.includes('foto') || value.includes('export') || value.includes('pdf')) return 'documents';
  return 'welds';
}

function toCeStatus(value: string): CeStatus {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('compleet') || normalized.includes('complete')) return 'Compleet';
  if (normalized.includes('ontbre')) return 'Ontbreekt';
  return 'Vereist';
}

function defaultNote(section: CeSection, label: string) {
  if (section === 'project') return `Werk ${label.toLowerCase()} direct hier bij.`;
  if (section === 'settings') return `Werk ${label.toLowerCase()} direct in deze popup bij.`;
  if (section === 'documents') return `Leg ${label.toLowerCase()} direct vast of markeer dit onderdeel compleet.`;
  if (section === 'inspections') return `Werk ${label.toLowerCase()} direct bij in deze CE-regel.`;
  return `Werk ${label.toLowerCase()} direct bij in deze CE-regel.`;
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
  const [overrides, setOverrides] = useState<OverrideMap>({});
  const [draftStatus, setDraftStatus] = useState<CeStatus>('Vereist');
  const [draftValue, setDraftValue] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

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

  function openRow(detail: CeRowDetail) {
    const override = overrides[detail.key];
    setSelectedRow(detail);
    setDraftStatus(override?.status || detail.status);
    setDraftValue(override?.value ?? detail.value ?? '');
    setDraftNote(override?.note ?? detail.note);
    setSaveNotice(null);
  }

  function openSummaryRow(label: string, value: string, section: CeSection) {
    openRow({
      key: `summary:${section}:${label}`,
      label,
      value,
      status: value === '0' || value === 'Nee' ? 'Vereist' : 'Compleet',
      section,
      note: defaultNote(section, label),
    });
  }

  function openChecklistRow(label: string, statusLabel: string, group: string) {
    const section = resolveRowSection(label, group);
    openRow({
      key: `check:${group}:${label}`,
      label,
      status: toCeStatus(statusLabel),
      group,
      section,
      note: defaultNote(section, label),
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

  function handleSaveRow() {
    if (!selectedRow) return;
    setOverrides((current) => ({
      ...current,
      [selectedRow.key]: {
        status: draftStatus,
        value: draftValue.trim() || undefined,
        note: draftNote.trim() || undefined,
      },
    }));
    setSaveNotice('Regel bijgewerkt.');
    window.setTimeout(() => {
      setSelectedRow(null);
      setSaveNotice(null);
    }, 250);
  }

  return (
    <>
      <MobilePageScaffold title="CE-Dossier" subtitle="Elke regel opent direct een wijzig-popup met vervolgactie" backTo={`/projecten/${projectId}/overzicht`}>
        {loading ? <div className="mobile-state-card">CE-dossier laden…</div> : null}
        {error ? <div className="mobile-inline-alert is-error">{error}</div> : null}
        {!loading ? (
          <div className="mobile-list-stack ce-dossier-stack">
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
              <button type="button" className="mobile-summary-card" onClick={() => openSummaryRow('Compleet', String(summary.complete), 'project')}><span>Compleet</span><strong>{summary.complete}</strong></button>
              <button type="button" className="mobile-summary-card" onClick={() => openSummaryRow('Vereist', String(summary.required), 'project')}><span>Vereist</span><strong>{summary.required}</strong></button>
              <button type="button" className="mobile-summary-card" onClick={() => openSummaryRow('Ontbreekt', String(summary.missing), 'documents')}><span>Ontbreekt</span><strong>{summary.missing}</strong></button>
              <button type="button" className="mobile-summary-card" onClick={() => openSummaryRow('PDF', pdf ? 'Ja' : 'Nee', 'documents')}><span>PDF</span><strong>{pdf ? 'Ja' : 'Nee'}</strong></button>
            </div>

            <div className="mobile-detail-card ce-summary-card">
              <div className="mobile-list-card-meta ce-summary-card-meta">Klik op elke regel om direct de gekoppelde popup te openen.</div>
              <div className="ce-inline-stat-grid">
                {summaryRows.map((row) => {
                  const override = overrides[`summary:${row.section}:${row.label}`];
                  return (
                    <button key={row.label} type="button" className="ce-inline-stat-card" onClick={() => openSummaryRow(row.label, row.value, row.section)}>
                      <span>{row.label}</span>
                      <strong>{override?.value || row.value}</strong>
                    </button>
                  );
                })}
              </div>
            </div>

            {checklistGroups.map((group) => (
              <div key={group.group} className="mobile-checklist-card grouped-checklist-card ce-group-card">
                <div className="mobile-section-kicker">{group.group}</div>
                <div className="ce-group-rows">
                  {group.rows.map((item) => {
                    const override = overrides[`check:${group.group}:${item.label}`];
                    const displayStatus = override?.status || toCeStatus(item.status);
                    return (
                      <button
                        key={`${group.group}-${item.label}`}
                        type="button"
                        className="mobile-checklist-row mobile-checklist-row-button ce-checklist-row"
                        aria-label={`Wijzig ${item.label}`}
                        onClick={() => openChecklistRow(item.label, item.status, group.group)}
                      >
                        <div className="ce-checklist-copy">
                          <strong>{item.label}</strong>
                        </div>
                        <span className={`mobile-checklist-status status-${displayStatus.toLowerCase().replace(/\s+/g, '-')}`}>{displayStatus}</span>
                      </button>
                    );
                  })}
                </div>
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
              Dossierstatus vernieuwen
            </button>
          </div>
        ) : null}
      </MobilePageScaffold>

      <Modal open={Boolean(selectedRow)} onClose={() => setSelectedRow(null)} title={selectedRow?.label || 'CE-regel wijzigen'} size="large">
        {selectedRow ? (
          <div className="ce-edit-modal">
            {saveNotice ? <div className="mobile-inline-alert is-success">{saveNotice}</div> : null}
            <div className="ce-edit-panel">
              <div className="mobile-field-row"><span>Regel</span><strong>{selectedRow.label}</strong></div>
              <div className="mobile-field-row"><span>Status</span><strong>{draftStatus}</strong></div>
              {selectedRow.group ? <div className="mobile-field-row"><span>Groep</span><strong>{selectedRow.group}</strong></div> : null}
            </div>
            <label className="mobile-form-field mobile-select-field">
              <span>Status</span>
              <select value={draftStatus} onChange={(event) => setDraftStatus(event.target.value as CeStatus)}>
                <option value="Compleet">Compleet</option>
                <option value="Vereist">Vereist</option>
                <option value="Ontbreekt">Ontbreekt</option>
              </select>
            </label>
            <label className="mobile-form-field">
              <span>Waarde</span>
              <input value={draftValue} onChange={(event) => setDraftValue(event.target.value)} placeholder="Bijvoorbeeld ja, 1 of gekoppeld" />
            </label>
            <label className="mobile-form-field is-textarea">
              <span>Toelichting</span>
              <textarea value={draftNote} onChange={(event) => setDraftNote(event.target.value)} rows={4} placeholder="Korte toelichting" />
            </label>
            <div className="mobile-inline-actions stack-on-mobile">
              <button type="button" className="mobile-primary-button" onClick={handleSaveRow}>Opslaan</button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

export default MobileCeDossierPage;

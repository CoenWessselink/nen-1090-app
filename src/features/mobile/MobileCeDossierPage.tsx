import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCcw, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { createPdfExport, getCeDossier } from '@/api/ce';
import { createProjectDocument, getProjectDocuments } from '@/api/documents';
import {
  addProjectMaterialLink,
  addProjectWelderLink,
  addProjectWpsLink,
  getProject,
  getProjectSelectedMaterials,
  getProjectSelectedWelders,
  getProjectSelectedWps,
  removeProjectMaterialLink,
  removeProjectWelderLink,
  removeProjectWpsLink,
  updateProject,
} from '@/api/projects';
import { getInspectionTemplates, getMaterials, getWeldCoordinators, getWelders, getWps } from '@/api/settings';
import { Modal } from '@/components/overlays/Modal';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { openDownloadUrl } from '@/utils/download';
import { buildCeDossierFilename, firstPdfDocument, formatValue, groupChecklist, normalizeApiError, normalizeChecklist, summarizeChecklist } from '@/features/mobile/mobile-utils';
import type { CeDocument, Project } from '@/types/domain';

type CeRowSection = 'project' | 'welds' | 'inspections' | 'documents' | 'settings';
type Option = Record<string, unknown>;

type CeRowDetail = {
  label: string;
  status: string;
  group?: string;
  section: CeRowSection;
};

type DossierEditState = {
  client_name: string;
  execution_class: string;
  inspection_template_id: string;
  coordinator_id: string;
  material_ids: string[];
  wps_ids: string[];
  welder_ids: string[];
  notes: string;
  files: File[];
};

const initialEditState: DossierEditState = {
  client_name: '',
  execution_class: 'EXC2',
  inspection_template_id: '',
  coordinator_id: '',
  material_ids: [],
  wps_ids: [],
  welder_ids: [],
  notes: '',
  files: [],
};

function resolveRowSection(label: string, group?: string): CeRowSection {
  const value = `${group || ''} ${label}`.toLowerCase();
  if (value.includes('project') || value.includes('exc')) return 'project';
  if (value.includes('template') || value.includes('materiaal') || value.includes('lasser') || value.includes('wps')) return 'settings';
  if (value.includes('inspect')) return 'inspections';
  if (value.includes('document') || value.includes('foto') || value.includes('export')) return 'documents';
  return 'welds';
}

function normalizeStatusTone(status: string) {
  const value = String(status || '').toLowerCase();
  if (value.includes('compleet') || value.includes('conform')) return 'success';
  if (value.includes('ontbreekt') || value.includes('niet conform')) return 'danger';
  return 'warning';
}

function toOptionLabel(item: Record<string, unknown>) {
  return String(item.name || item.label || item.code || item.title || item.value || item.id || 'Optie');
}

function toOptionValue(item: Record<string, unknown>) {
  return String(item.id || item.code || item.value || item.name || '');
}

function sectionHelper(section: CeRowSection) {
  if (section === 'project') return 'Werk projectbasis, opdrachtgever en EXC-klasse direct bij.';
  if (section === 'documents') return 'Voeg direct ontbrekende documenten toe en sla op.';
  return 'Werk gekoppelde stamdata direct bij en sla op zonder omweg.';
}

export function MobileCeDossierPage() {
  const navigate = useNavigate();
  const { projectId = '' } = useParams();
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<CeDocument[]>([]);
  const [materials, setMaterials] = useState<Option[]>([]);
  const [wpsRows, setWpsRows] = useState<Option[]>([]);
  const [welderRows, setWelderRows] = useState<Option[]>([]);
  const [coordinatorRows, setCoordinatorRows] = useState<Option[]>([]);
  const [templateRows, setTemplateRows] = useState<Option[]>([]);
  const [linkedMaterialIds, setLinkedMaterialIds] = useState<string[]>([]);
  const [linkedWpsIds, setLinkedWpsIds] = useState<string[]>([]);
  const [linkedWelderIds, setLinkedWelderIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<CeRowDetail | null>(null);
  const [editState, setEditState] = useState<DossierEditState>(initialEditState);

  async function loadDossier() {
    const [
      dossier,
      docs,
      projectRecord,
      materialRows,
      wpsList,
      welderList,
      coordinatorList,
      templateList,
      selectedMaterials,
      selectedWps,
      selectedWelders,
    ] = await Promise.all([
      getCeDossier(projectId),
      getProjectDocuments(projectId, { page: 1, limit: 100 }).catch(() => ({ items: [] as CeDocument[] })),
      getProject(projectId).catch(() => null),
      getMaterials().catch(() => ({ items: [] as Option[] })),
      getWps().catch(() => ({ items: [] as Option[] })),
      getWelders().catch(() => ({ items: [] as Option[] })),
      getWeldCoordinators().catch(() => ({ items: [] as Option[] })),
      getInspectionTemplates().catch(() => ({ items: [] as Option[] })),
      getProjectSelectedMaterials(projectId).catch(() => []),
      getProjectSelectedWps(projectId).catch(() => []),
      getProjectSelectedWelders(projectId).catch(() => []),
    ]);

    setPayload((dossier || {}) as Record<string, unknown>);
    setDocuments(Array.isArray(docs?.items) ? docs.items : []);
    setProject(projectRecord || null);
    setMaterials(Array.isArray(materialRows) ? materialRows : ((materialRows as { items?: Option[] })?.items || []));
    setWpsRows(Array.isArray(wpsList) ? wpsList : ((wpsList as { items?: Option[] })?.items || []));
    setWelderRows(Array.isArray(welderList) ? welderList : ((welderList as { items?: Option[] })?.items || []));
    setCoordinatorRows(Array.isArray(coordinatorList) ? coordinatorList : ((coordinatorList as { items?: Option[] })?.items || []));
    setTemplateRows(Array.isArray(templateList) ? templateList : ((templateList as { items?: Option[] })?.items || []));
    setLinkedMaterialIds((Array.isArray(selectedMaterials) ? selectedMaterials : []).map((item) => String((item as Record<string, unknown>).id || (item as Record<string, unknown>).material_id || '')).filter(Boolean));
    setLinkedWpsIds((Array.isArray(selectedWps) ? selectedWps : []).map((item) => String((item as Record<string, unknown>).id || (item as Record<string, unknown>).wps_id || '')).filter(Boolean));
    setLinkedWelderIds((Array.isArray(selectedWelders) ? selectedWelders : []).map((item) => String((item as Record<string, unknown>).id || (item as Record<string, unknown>).welder_id || '')).filter(Boolean));
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

  function prepareEditState(section: CeRowSection) {
    const coordinatorId = String((project as Record<string, unknown> | null)?.coordinator_id || '');
    const notes = String((project as Record<string, unknown> | null)?.notes || (payload?.notes as string) || '');
    setEditState({
      client_name: String(project?.client_name || project?.opdrachtgever || ''),
      execution_class: String(project?.execution_class || project?.executieklasse || 'EXC2') || 'EXC2',
      inspection_template_id: String(project?.default_template_id || project?.template_id || ''),
      coordinator_id: coordinatorId,
      material_ids: linkedMaterialIds,
      wps_ids: linkedWpsIds,
      welder_ids: linkedWelderIds,
      notes,
      files: [],
    });
  }

  function openRow(label: string, statusLabel: string, group?: string) {
    const section = resolveRowSection(label, group);
    prepareEditState(section);
    setSelectedRow({ label, status: statusLabel, section, group });
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

  function toggleArrayValue(key: 'material_ids' | 'wps_ids' | 'welder_ids', value: string) {
    setEditState((current) => ({
      ...current,
      [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value],
    }));
  }

  async function syncLinks(currentIds: string[], nextIds: string[], addFn: (projectId: string, id: string) => Promise<unknown>, removeFn: (projectId: string, id: string) => Promise<unknown>) {
    const toAdd = nextIds.filter((id) => !currentIds.includes(id));
    const toRemove = currentIds.filter((id) => !nextIds.includes(id));
    await Promise.all([...toAdd.map((id) => addFn(projectId, id)), ...toRemove.map((id) => removeFn(projectId, id))]);
  }

  async function handleSaveRow() {
    if (!selectedRow) return;
    try {
      setSaving(true);
      setError(null);
      const coordinatorName = coordinatorRows.find((item) => toOptionValue(item) === editState.coordinator_id);
      await updateProject(projectId, {
        client_name: editState.client_name,
        execution_class: editState.execution_class,
        inspection_template_id: editState.inspection_template_id,
        coordinator_id: editState.coordinator_id || null,
        coordinator_name: coordinatorName ? toOptionLabel(coordinatorName) : null,
      } as Record<string, unknown>);
      await syncLinks(linkedMaterialIds, editState.material_ids, addProjectMaterialLink, removeProjectMaterialLink);
      await syncLinks(linkedWpsIds, editState.wps_ids, addProjectWpsLink, removeProjectWpsLink);
      await syncLinks(linkedWelderIds, editState.welder_ids, addProjectWelderLink, removeProjectWelderLink);
      if (editState.files.length) {
        for (const file of editState.files) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('title', file.name);
          formData.append('filename', file.name);
          await createProjectDocument(projectId, formData);
        }
      }
      await loadDossier();
      setSelectedRow(null);
    } catch (err) {
      setError(normalizeApiError(err, 'CE-regel kon niet worden opgeslagen.'));
    } finally {
      setSaving(false);
    }
  }

  function renderCheckboxList(title: string, items: Option[], key: 'material_ids' | 'wps_ids' | 'welder_ids') {
    return (
      <div className="ce-edit-group">
        <span className="ce-edit-group-title">{title}</span>
        <div className="ce-edit-check-grid">
          {items.map((item) => {
            const value = toOptionValue(item);
            return (
              <label key={`${key}-${value}`} className="ce-edit-check-card">
                <input type="checkbox" checked={editState[key].includes(value)} onChange={() => toggleArrayValue(key, value)} />
                <span>{toOptionLabel(item)}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  function renderEditContent() {
    if (!selectedRow) return null;
    const showProject = selectedRow.section === 'project';
    const showDocuments = selectedRow.section === 'documents';
    const templateOptions = templateRows.filter((item) => {
      const rowExc = String(item.exc_class || item.execution_class || '').toUpperCase();
      return !rowExc || rowExc === String(editState.execution_class || '').toUpperCase();
    });

    return (
      <div className="ce-edit-form">
        <div className="ce-edit-summary-card">
          <div>
            <span className="ce-edit-label">Regel</span>
            <strong>{selectedRow.label}</strong>
          </div>
          <div>
            <span className="ce-edit-label">Status</span>
            <strong>{selectedRow.status}</strong>
          </div>
          <div>
            <span className="ce-edit-label">Toelichting</span>
            <strong>{sectionHelper(selectedRow.section)}</strong>
          </div>
        </div>

        <div className="two-column-grid ce-edit-grid">
          {showProject ? (
            <>
              <label className="mobile-form-field"><span>Opdrachtgever</span><input value={editState.client_name} onChange={(event) => setEditState((current) => ({ ...current, client_name: event.target.value }))} placeholder="Bijv. Pietje BV" /></label>
              <label className="mobile-form-field mobile-select-field"><span>EXC-klasse</span><select value={editState.execution_class} onChange={(event) => setEditState((current) => ({ ...current, execution_class: event.target.value }))}><option value="EXC1">EXC1</option><option value="EXC2">EXC2</option><option value="EXC3">EXC3</option><option value="EXC4">EXC4</option></select></label>
            </>
          ) : null}

          {selectedRow.section !== 'documents' ? (
            <>
              <label className="mobile-form-field mobile-select-field"><span>Inspectietemplate</span><select value={editState.inspection_template_id} onChange={(event) => setEditState((current) => ({ ...current, inspection_template_id: event.target.value }))}><option value="">Selecteer template</option>{templateOptions.map((item) => <option key={toOptionValue(item)} value={toOptionValue(item)}>{toOptionLabel(item)}</option>)}</select></label>
              <label className="mobile-form-field mobile-select-field"><span>Lascoördinator</span><select value={editState.coordinator_id} onChange={(event) => setEditState((current) => ({ ...current, coordinator_id: event.target.value }))}><option value="">Selecteer lascoördinator</option>{coordinatorRows.map((item) => <option key={toOptionValue(item)} value={toOptionValue(item)}>{toOptionLabel(item)}</option>)}</select></label>
            </>
          ) : null}
        </div>

        {selectedRow.section !== 'documents' ? (
          <>
            {renderCheckboxList('Materialen', materials, 'material_ids')}
            {renderCheckboxList('WPS', wpsRows, 'wps_ids')}
            {renderCheckboxList('Lassers', welderRows, 'welder_ids')}
          </>
        ) : null}

        {showDocuments ? (
          <label className="mobile-upload-field ce-upload-field">
            <span>Documenten toevoegen</span>
            <input type="file" multiple onChange={(event) => setEditState((current) => ({ ...current, files: Array.from(event.target.files || []) }))} />
            <small>Voeg één of meerdere documenten toe en sla direct op.</small>
          </label>
        ) : null}

        <label className="mobile-form-field is-textarea"><span>Toelichting / notitie</span><textarea rows={4} value={editState.notes} onChange={(event) => setEditState((current) => ({ ...current, notes: event.target.value }))} placeholder="Optionele toelichting" /></label>

        <div className="mobile-inline-actions">
          <button type="button" className="mobile-primary-button" onClick={handleSaveRow} disabled={saving}>
            <Save size={16} /> {saving ? 'Opslaan…' : 'Opslaan'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <MobilePageScaffold title="CE-Dossier" subtitle="Elke regel opent direct een wijzig-popup met vervolgactie" backTo={`/projecten/${projectId}/overzicht`}>
        {loading ? <div className="mobile-state-card">CE-dossier laden…</div> : null}
        {error ? <div className="mobile-inline-alert is-error">{error}</div> : null}
        {!loading ? (
          <div className="mobile-list-stack ce-dossier-page">
            <div className="mobile-progress-card ce-progress-card">
              <div className="ce-progress-topline">
                <div>
                  <strong>Dossier progressie</strong>
                  <span className="ce-progress-subtitle">{status}</span>
                </div>
                <div className="mobile-progress-value">{summary.complete}/{summary.total || 10}</div>
              </div>
              <div className="mobile-progress-bar"><span style={{ width: `${Math.max(score, 6)}%` }} /></div>
              <small>{score}% compleet</small>
            </div>

            <div className="mobile-summary-grid ce-summary-grid">
              <div className="mobile-summary-card"><span>Compleet</span><strong>{summary.complete}</strong></div>
              <div className="mobile-summary-card"><span>Vereist</span><strong>{summary.required}</strong></div>
              <div className="mobile-summary-card"><span>Ontbreekt</span><strong>{summary.missing}</strong></div>
              <div className="mobile-summary-card"><span>PDF</span><strong>{pdf ? 'Ja' : 'Nee'}</strong></div>
            </div>

            <div className="mobile-detail-card ce-summary-links-card">
              <div className="mobile-list-card-meta" style={{ marginBottom: 8 }}>Klik op elke regel om direct de gekoppelde popup te openen.</div>
              <div className="ce-quick-grid">
                {summaryRows.map((row) => (
                  <button key={row.label} type="button" className="ce-quick-stat" onClick={() => openRow(row.label, row.value, row.section)}>
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                  </button>
                ))}
              </div>
            </div>

            {checklistGroups.map((group) => (
              <div key={group.group} className="mobile-checklist-card grouped-checklist-card ce-group-card">
                <div className="mobile-section-kicker">{group.group}</div>
                <div className="ce-row-stack">
                  {group.rows.map((item) => (
                    <button key={`${group.group}-${item.label}`} type="button" className="ce-check-row" aria-label={`Wijzig ${item.label}`} onClick={() => openRow(item.label, item.status, group.group)}>
                      <strong>{item.label}</strong>
                      <span className={`ce-status-pill ce-status-pill-${normalizeStatusTone(item.status)}`}>{item.status}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="mobile-inline-actions stack-on-mobile">
              <button type="button" className="mobile-primary-button" onClick={() => navigate(pdf ? `/projecten/${projectId}/documenten/${pdf.id}/viewer` : `/projecten/${projectId}/pdf-viewer`)}>
                Open PDF viewer
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
        {renderEditContent()}
      </Modal>
    </>
  );
}

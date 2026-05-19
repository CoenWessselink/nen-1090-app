import { useEffect, useMemo, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAssemblies } from '@/api/assemblies';
import { deleteAttachment } from '@/api/documents';
import { getProject } from '@/api/projects';
import { deleteWeld, getWeld, getWeldAttachments, updateWeld, uploadWeldAttachment } from '@/api/welds';
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog';
import { useInspectionTemplates, useMaterials, useProcesses, useWeldCoordinators, useWelders, useWps } from '@/hooks/useSettings';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { dispatchAppRefresh, normalizeApiError } from '@/features/mobile/mobile-utils';

type WeldFormState = {
  assembly_id: string;
  weld_no: string;
  inspected_at: string;
  process: string;
  material: string;
  material_id: string;
  welders: string;
  welder_id: string;
  location: string;
  execution_class: string;
  template_id: string;
  status: string;
  wps: string;
  wps_id: string;
  coordinator_id: string;
};

type AttachmentRow = { id: string; title: string; filename?: string };
type RuntimeTemplate = Record<string, unknown>;

function normalizeExc(value: unknown): string {
  const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  return raw.match(/EXC[1-4]/)?.[0] || 'EXC2';
}

function normalizeStatus(value: unknown): string {
  const raw = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['conform', 'compliant', 'ok', 'approved', 'goedgekeurd'].includes(raw)) return 'conform';
  if (['not_conform', 'non_conform', 'non_compliant', 'not_compliant', 'defect', 'rejected', 'niet_conform', 'afgekeurd'].includes(raw)) return 'not_conform';
  if (['in_control', 'in_controle', 'gerepareerd', 'repaired', 'pending', 'open', 'in_progress'].includes(raw)) return 'in_control';
  return 'in_control';
}

function statusForApi(value: unknown): string {
  const normalized = normalizeStatus(value);
  if (normalized === 'conform') return 'approved';
  if (normalized === 'not_conform') return 'rejected';
  return 'in_progress';
}

function optionName(item: Record<string, unknown> | undefined) {
  if (!item) return '';
  return String(item.name || item.title || item.label || item.code || item.value || item.id || '').trim();
}

function optionCode(item: Record<string, unknown> | undefined) {
  if (!item) return '';
  return String(item.code || item.value || item.name || item.title || item.id || '').trim();
}

function templateMatchesExc(item: RuntimeTemplate, exc: string): boolean {
  return normalizeExc(item.exc_class || item.execution_class || item.profile_code || item.code || item.name) === normalizeExc(exc);
}

function bestTemplateForExc(templates: RuntimeTemplate[], exc: string): string {
  const matches = templates.filter((item) => templateMatchesExc(item, exc));
  return String((matches.find((item) => item.is_default && item.is_locked) || matches.find((item) => item.is_default) || matches[0])?.id || '');
}

function coordinatorIdFromRecord(record: Record<string, unknown>): string {
  return String(record.coordinator_id || record.welding_coordinator_id || record.weld_coordinator_id || '').trim();
}

function templateIdFromRecord(record: Record<string, unknown>): string {
  return String(record.template_id || record.inspection_template_id || record.default_template_id || '').trim();
}

export function MobileWeldEditPage() {
  const navigate = useNavigate();
  const { projectId = '', weldId = '' } = useParams();
  const processes = useProcesses();
  const materials = useMaterials();
  const welders = useWelders();
  const wps = useWps();
  const coordinators = useWeldCoordinators();
  const inspectionTemplates = useInspectionTemplates();
  const [form, setForm] = useState<WeldFormState>({
    assembly_id: '', weld_no: '', inspected_at: '', process: '135', material: '', material_id: '',
    welders: '', welder_id: '', location: '', execution_class: 'EXC2', template_id: '',
    status: 'in_control', wps: '', wps_id: '', coordinator_id: '',
  });
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [assemblyOptions, setAssemblyOptions] = useState<Array<Record<string, unknown>>>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingWeld, setDeletingWeld] = useState(false);
  const [confirmDeleteWeld, setConfirmDeleteWeld] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allTemplates = useMemo(() => ((inspectionTemplates.data?.items || []) as RuntimeTemplate[]), [inspectionTemplates.data?.items]);
  const materialItems = useMemo(() => ((materials.data?.items || []) as Array<Record<string, unknown>>), [materials.data?.items]);
  const welderItems = useMemo(() => ((welders.data?.items || []) as Array<Record<string, unknown>>), [welders.data?.items]);
  const wpsItems = useMemo(() => ((wps.data?.items || []) as Array<Record<string, unknown>>), [wps.data?.items]);
  const templateOptions = useMemo(() => allTemplates.filter((item) => templateMatchesExc(item, form.execution_class)), [allTemplates, form.execution_class]);
  const canSave = useMemo(() => Boolean(form.weld_no.trim()), [form.weld_no]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      getWeld(projectId, weldId),
      getProject(projectId).catch(() => null),
      getWeldAttachments(projectId, weldId).catch(() => []),
      getAssemblies(projectId).catch(() => ({ items: [] })),
    ])
      .then(([result, projectRecord, attachmentResult, assembliesResult]) => {
        if (!active) return;
        const record = (result || {}) as Record<string, unknown>;
        const project = (projectRecord || {}) as Record<string, unknown>;
        const wpsId = String(record.wps_id || project.default_wps_id || project.wps_id || '').trim();
        const materialId = String(record.material_id || project.default_material_id || project.material_id || '').trim();
        const welderId = String(record.welder_id || project.default_welder_id || project.welder_id || '').trim();
        const coordinatorId = coordinatorIdFromRecord(record) || coordinatorIdFromRecord(project);
        const templateId = templateIdFromRecord(record) || templateIdFromRecord(project);
        setForm({
          assembly_id: String(record.assembly_id || record.assemblyId || ''),
          weld_no: String(record.weld_no || record.weld_number || ''),
          inspected_at: String(record.inspected_at || record.inspection_date || '').slice(0, 10),
          process: String(record.process || '135'),
          material: String(record.material || ''),
          material_id: materialId,
          welders: String(record.welders || record.welder_name || ''),
          welder_id: welderId,
          location: String(record.location || ''),
          execution_class: normalizeExc(record.execution_class || record.exc_class || project.execution_class || project.exc_class),
          template_id: templateId,
          status: normalizeStatus(record.status || record.inspection_status || record.result),
          wps: String(record.wps || ''),
          wps_id: wpsId,
          coordinator_id: coordinatorId,
        });
        const assemblyRows = Array.isArray(assembliesResult) ? assembliesResult : Array.isArray((assembliesResult as Record<string, unknown>)?.items) ? ((assembliesResult as Record<string, unknown>).items as Array<Record<string, unknown>>) : [];
        setAssemblyOptions(assemblyRows);
        const rows = Array.isArray(attachmentResult) ? attachmentResult : Array.isArray((attachmentResult as Record<string, unknown>)?.items) ? ((attachmentResult as Record<string, unknown>).items as unknown[]) : [];
        setAttachments(rows.map((item) => { const row = item as Record<string, unknown>; return { id: String(row.id || ''), title: String(row.title || row.filename || row.name || 'Bestand'), filename: String(row.filename || row.name || '') }; }).filter((item) => item.id));
        setError(null);
      })
      .catch((err) => { if (!active) return; setError(normalizeApiError(err, 'Las kon niet worden geladen.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId, weldId]);

  useEffect(() => {
    if (!allTemplates.length || loading) return;
    const currentTemplate = allTemplates.find((item) => String(item.id || '') === String(form.template_id || ''));
    if (currentTemplate && templateMatchesExc(currentTemplate, form.execution_class)) return;
    const nextTemplate = bestTemplateForExc(allTemplates, form.execution_class);
    if (nextTemplate && nextTemplate !== form.template_id) {
      setForm((current) => ({ ...current, template_id: nextTemplate }));
    }
  }, [allTemplates, form.execution_class, form.template_id, loading]);

  function handleExcChange(nextExc: string) {
    const nextTemplate = bestTemplateForExc(allTemplates, nextExc);
    setForm((current) => ({ ...current, execution_class: nextExc, template_id: nextTemplate || current.template_id }));
  }

  async function handleDeleteAttachment(attachmentId: string) {
    try { await deleteAttachment(attachmentId); setAttachments((current) => current.filter((item) => item.id !== attachmentId)); }
    catch (err) { setError(normalizeApiError(err, 'Foto verwijderen mislukt.')); }
  }

  async function handleSave() {
    if (!canSave) { setError('Lasnummer is verplicht.'); return; }
    setSaving(true);
    setError(null);
    try {
      const selectedWps = wpsItems.find((item) => String(item.id || '') === String(form.wps_id || ''));
      const selectedMaterial = materialItems.find((item) => String(item.id || '') === String(form.material_id || ''));
      const selectedWelder = welderItems.find((item) => String(item.id || '') === String(form.welder_id || ''));
      const welderLabel = optionName(selectedWelder) || form.welders || null;
      const apiStatus = statusForApi(form.status);
      await updateWeld(projectId, weldId, {
        assembly_id: form.assembly_id || null,
        weld_number: form.weld_no, weld_no: form.weld_no,
        inspected_at: form.inspected_at || null,
        process: form.process,
        material_id: form.material_id || null, material: optionCode(selectedMaterial) || form.material || null,
        location: form.location,
        welder_id: form.welder_id || null, welder_name: welderLabel, welders: welderLabel,
        execution_class: form.execution_class,
        template_id: form.template_id || null, inspection_template_id: form.template_id || null,
        status: apiStatus,
        result: apiStatus,
        wps_id: form.wps_id || null, wps: optionCode(selectedWps) || form.wps || null,
        coordinator_id: form.coordinator_id || null,
        welding_coordinator_id: form.coordinator_id || null,
        weld_coordinator_id: form.coordinator_id || null,
      });
      if (newFiles.length) {
        await Promise.all(newFiles.map((file) => { const fd = new FormData(); fd.append('files', file, file.name); return uploadWeldAttachment(projectId, weldId, fd); }));
      }
      dispatchAppRefresh({ scope: 'welds', projectId, weldId, reason: 'weld-updated' });
      navigate(`/projecten/${projectId}/lassen`, { replace: true });
    } catch (err) { setError(normalizeApiError(err, 'Las opslaan mislukt.')); }
    finally { setSaving(false); }
  }

  async function handleDeleteWeld() {
    setDeletingWeld(true); setError(null);
    try { await deleteWeld(projectId, weldId); dispatchAppRefresh({ scope: 'welds', projectId, weldId, reason: 'weld-deleted' }); navigate(`/projecten/${projectId}/lassen`, { replace: true }); }
    catch (err) { setError(normalizeApiError(err, 'Las kon niet worden verwijderd.')); setDeletingWeld(false); setConfirmDeleteWeld(false); }
  }

  return (
    <MobilePageScaffold title="Las bewerken" subtitle="Werk lasgegevens bij" backTo={`/projecten/${projectId}/lassen`}>
      {loading ? <div className="mobile-state-card">Las laden…</div> : null}
      {error ? <div className="mobile-inline-alert is-error">{error}</div> : null}
      {!loading ? (
        <div className="mobile-form-card" data-testid="mobile-weld-edit-form">
          <label className="mobile-form-field mobile-select-field"><span>Assemblage</span><select value={form.assembly_id} onChange={(e) => setForm((c) => ({ ...c, assembly_id: e.target.value }))}><option value="">Selecteer assemblage</option>{assemblyOptions.map((item, i) => <option key={`${item.id || i}`} value={String(item.id || '')}>{String(item.code || item.name || item.id || '')}</option>)}</select></label>
          <label className="mobile-form-field"><span>Lasnummer</span><input value={form.weld_no} onChange={(e) => setForm((c) => ({ ...c, weld_no: e.target.value }))} placeholder="Lasnummer" /></label>
          <label className="mobile-form-field"><span>Lasdatum</span><input type="date" value={form.inspected_at} onChange={(e) => setForm((c) => ({ ...c, inspected_at: e.target.value }))} /></label>
          <label className="mobile-form-field mobile-select-field"><span>Executieklasse</span><select value={form.execution_class} onChange={(e) => handleExcChange(e.target.value)}>{['EXC1','EXC2','EXC3','EXC4'].map((exc) => <option key={exc} value={exc}>{exc}</option>)}</select></label>
          <label className="mobile-form-field mobile-select-field"><span>Lasmethode</span><select value={form.process} onChange={(e) => setForm((c) => ({ ...c, process: e.target.value }))}>{((processes.data?.items || []) as Array<Record<string, unknown>>).map((item) => { const v = String(item.code || item.name || item.title || ''); return <option key={String(item.id || v)} value={v}>{String(item.name || item.title || v)}</option>; })}<option value="135">135 (MAG)</option><option value="111">111 (BMBE)</option><option value="141">141 (TIG)</option></select></label>
          <label className="mobile-form-field mobile-select-field"><span>WPS</span><select value={form.wps_id} onChange={(e) => { const next = e.target.value; const sel = wpsItems.find((item) => String(item.id || '') === next); setForm((c) => ({ ...c, wps_id: next, wps: optionCode(sel) })); }}><option value="">Selecteer WPS</option>{wpsItems.map((item) => <option key={String(item.id)} value={String(item.id || '')}>{String(item.code || item.title || item.name || item.id)}</option>)}</select></label>
          <label className="mobile-form-field mobile-select-field"><span>Materiaal</span><select value={form.material_id} onChange={(e) => { const next = e.target.value; const sel = materialItems.find((item) => String(item.id || '') === next); setForm((c) => ({ ...c, material_id: next, material: optionCode(sel) })); }}><option value="">Selecteer materiaal</option>{materialItems.map((item) => <option key={String(item.id)} value={String(item.id || '')}>{String(item.code || item.title || item.name || item.id)}</option>)}</select></label>
          <label className="mobile-form-field mobile-select-field"><span>Lasser</span><select value={form.welder_id} onChange={(e) => { const next = e.target.value; const sel = welderItems.find((item) => String(item.id || '') === next); setForm((c) => ({ ...c, welder_id: next, welders: optionName(sel) })); }}><option value="">Selecteer lasser</option>{welderItems.map((item) => <option key={String(item.id)} value={String(item.id || '')}>{String(item.name || item.code || item.title || item.id || '')}</option>)}</select></label>
          <label className="mobile-form-field mobile-select-field"><span>Lascoördinator</span><select value={form.coordinator_id} onChange={(e) => setForm((c) => ({ ...c, coordinator_id: e.target.value }))}><option value="">Selecteer lascoördinator</option>{((coordinators.data?.items || []) as Array<Record<string, unknown>>).map((item) => <option key={String(item.id || item.code || '')} value={String(item.id || '')}>{String(item.name || item.code || item.id || '')}</option>)}</select></label>
          <label className="mobile-form-field"><span>Locatie</span><input value={form.location} onChange={(e) => setForm((c) => ({ ...c, location: e.target.value }))} placeholder="Locatie" /></label>
          <label className="mobile-form-field mobile-select-field"><span>Inspectietemplate</span><select value={form.template_id} onChange={(e) => setForm((c) => ({ ...c, template_id: e.target.value }))}><option value="">Automatisch via EXC</option>{templateOptions.map((item) => <option key={String(item.id)} value={String(item.id)}>{[String(item.name || item.title || item.id), String(item.norm || '').trim(), item.version ? `v${String(item.version)}` : ''].filter(Boolean).join(' · ')}</option>)}</select></label>
          <label className="mobile-form-field mobile-select-field"><span>Status</span><select value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value }))}><option value="conform">Conform (compliant)</option><option value="in_control">In controle (in control)</option><option value="not_conform">Niet conform (non-compliant)</option></select></label>
          <label className="mobile-upload-field"><span><Camera size={16} /> Foto's toevoegen</span><input type="file" accept="image/*" capture="environment" multiple onChange={(e) => setNewFiles(Array.from(e.target.files || []))} /><small>Voeg extra foto's toe aan deze las</small></label>
          {newFiles.length ? <div className="mobile-file-list">{newFiles.map((file) => <div key={`${file.name}-${file.size}`} className="mobile-file-pill">{file.name}</div>)}</div> : null}
          {attachments.length ? (
            <div className="mobile-attachment-list">{attachments.map((item) => (
              <div key={item.id} className="mobile-attachment-row"><div><strong>{item.title}</strong>{item.filename ? <small>{item.filename}</small> : null}</div><button type="button" className="mobile-icon-ghost-button" onClick={() => handleDeleteAttachment(item.id)} aria-label="Foto verwijderen"><Trash2 size={16} /></button></div>
            ))}</div>
          ) : null}
          <div className="mobile-inline-actions stack-on-mobile">
            <button type="button" className="mobile-primary-button" onClick={handleSave} disabled={saving || !canSave}>{saving ? 'Opslaan…' : 'Opslaan'}</button>
            <button type="button" className="mobile-secondary-button" onClick={() => navigate(`/projecten/${projectId}/lassen`)}>Annuleren</button>
            <button type="button" className="mobile-danger-button" onClick={() => setConfirmDeleteWeld(true)} disabled={deletingWeld}><Trash2 size={14} /> {deletingWeld ? 'Verwijderen…' : 'Las verwijderen'}</button>
          </div>
          <ConfirmDialog open={confirmDeleteWeld} title="Las verwijderen" description={`Weet je zeker dat je las "${form.weld_no || weldId}" wilt verwijderen? Alle gekoppelde inspecties en foto's worden ook verwijderd. Deze actie kan niet ongedaan worden gemaakt.`} confirmLabel="Ja, verwijder las" cancelLabel="Annuleren" danger onConfirm={handleDeleteWeld} onClose={() => setConfirmDeleteWeld(false)} />
        </div>
      ) : null}
    </MobilePageScaffold>
  );
}

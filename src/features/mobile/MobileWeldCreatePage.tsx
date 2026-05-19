import { useEffect, useMemo, useState } from 'react';
import { Camera, ImagePlus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { createWeld, uploadWeldAttachment } from '@/api/welds';
import { getAssemblies } from '@/api/assemblies';
import { getProject } from '@/api/projects';
import { getProjectNormSelection } from '@/api/norms';
import { getInspectionTemplates, getProcesses, getWeldCoordinators, getWelders } from '@/api/settings';
import { useMaterials, useWps } from '@/hooks/useSettings';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { dispatchAppRefresh, normalizeApiError } from '@/features/mobile/mobile-utils';
import type { Project } from '@/types/domain';
import type { WeldFormValues } from '@/types/forms';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function defaultForm(projectId: string): MobileWeldForm {
  return { project_id: projectId, weld_number: '', assembly_id: '', wps_id: '', welder_name: '', coordinator_id: '', process: '135', material: '', location: '', status: 'conform', execution_class: 'EXC2', template_id: '', inspected_at: todayIso() };
}

type Option = { id?: string; code?: string; name?: string; title?: string; label?: string; value?: string; exc_class?: string; execution_class?: string; norm?: string; version?: string | number; is_default?: boolean; is_locked?: boolean };
type MobileWeldForm = WeldFormValues & { material?: string; inspected_at?: string; wps?: string };

function asOptions(value: unknown): Option[] {
  if (Array.isArray(value)) return value as Option[];
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.items)) return record.items as Option[];
    if (Array.isArray(record.data)) return record.data as Option[];
    if (Array.isArray(record.results)) return record.results as Option[];
  }
  return [];
}

function unwrapCreatedWeldId(value: unknown): string {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const nested = record.weld && typeof record.weld === 'object' ? (record.weld as Record<string, unknown>) : {};
  return String(record.id || record.weld_id || nested.id || nested.weld_id || '');
}

function normalizeExc(value: unknown): WeldFormValues['execution_class'] {
  const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  const match = raw.match(/EXC[1-4]/)?.[0];
  return (match || 'EXC2') as WeldFormValues['execution_class'];
}

function optionName(item: Option | Record<string, unknown> | undefined) {
  if (!item) return '';
  return String((item as Record<string, unknown>).name || (item as Record<string, unknown>).title || (item as Record<string, unknown>).label || (item as Record<string, unknown>).code || (item as Record<string, unknown>).value || (item as Record<string, unknown>).id || '').trim();
}

function optionCode(item: Option | Record<string, unknown> | undefined) {
  if (!item) return '';
  return String((item as Record<string, unknown>).code || (item as Record<string, unknown>).value || (item as Record<string, unknown>).name || (item as Record<string, unknown>).id || '').trim();
}

function excFromProject(project: Project | null, selection: unknown): WeldFormValues['execution_class'] {
  const selectionRecord = selection && typeof selection === 'object' ? (selection as Record<string, unknown>) : {};
  const profile = (selectionRecord.norm_profile || selectionRecord.profile) && typeof (selectionRecord.norm_profile || selectionRecord.profile) === 'object'
    ? ((selectionRecord.norm_profile || selectionRecord.profile) as Record<string, unknown>)
    : {};
  return normalizeExc(selectionRecord.exc_class || profile.exc_class || project?.execution_class || project?.executieklasse || project?.exc_class || (project as Record<string, unknown> | null)?.default_execution_class);
}

function templateIdFromProject(project: Project | null, selection: unknown): string {
  const selectionRecord = selection && typeof selection === 'object' ? (selection as Record<string, unknown>) : {};
  const snapshots = Array.isArray(selectionRecord.snapshots) ? selectionRecord.snapshots as Array<Record<string, unknown>> : [];
  return String((project as Record<string, unknown> | null)?.default_template_id || (project as Record<string, unknown> | null)?.inspection_template_id || selectionRecord.template_id || selectionRecord.inspection_template_id || snapshots[0]?.source_template_id || snapshots[0]?.template_id || '').trim();
}

function matchingTemplateId(templates: Option[], exc: string, preferredId = ''): string {
  if (preferredId && templates.some((item) => String(item.id || '') === preferredId)) return preferredId;
  const normalizedExc = normalizeExc(exc);
  const matches = templates.filter((item) => normalizeExc(item.exc_class || item.execution_class || item.code || item.name) === normalizedExc);
  return String((matches.find((item) => item.is_default && item.is_locked) || matches.find((item) => item.is_default) || matches[0])?.id || '');
}

export function MobileWeldCreatePage() {
  const navigate = useNavigate();
  const { projectId = '' } = useParams();
  const [form, setForm] = useState<MobileWeldForm>(() => defaultForm(projectId));
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processes, setProcesses] = useState<Option[]>([]);
  const materialsQuery = useMaterials();
  const wpsQuery = useWps();
  const materials = useMemo(() => materialsQuery.data?.items ?? [], [materialsQuery.data?.items]);
  const wpsOptions = useMemo(() => wpsQuery.data?.items ?? [], [wpsQuery.data?.items]);
  const [welders, setWelders] = useState<Option[]>([]);
  const [templates, setTemplates] = useState<Option[]>([]);
  const [assemblies, setAssemblies] = useState<Option[]>([]);
  const [coordinators, setCoordinators] = useState<Option[]>([]);
  const [projectLoaded, setProjectLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      getProject(projectId).catch(() => null),
      getProjectNormSelection(projectId).catch(() => null),
      getProcesses().catch(() => []),
      getWelders().catch(() => []),
      getWeldCoordinators().catch(() => []),
      getInspectionTemplates().catch(() => []),
      getAssemblies(projectId).catch(() => ({ items: [] })),
    ])
      .then(([projectRecord, normSelection, processRows, welderRows, coordinatorRows, templateRows, assemblyRows]) => {
        if (!active) return;
        const templateOptions = asOptions(templateRows);
        const coordinatorOptions = asOptions(coordinatorRows);
        const welderOptions = asOptions(welderRows);
        setProcesses(asOptions(processRows));
        setWelders(welderOptions);
        setCoordinators(coordinatorOptions);
        setTemplates(templateOptions);
        setAssemblies(asOptions(assemblyRows));

        const proj = projectRecord ? (projectRecord as Project) : null;
        const projectData = (projectRecord || {}) as Record<string, unknown>;
        const inheritedExc = excFromProject(proj, normSelection);
        const preferredTemplateId = templateIdFromProject(proj, normSelection);
        const defaultCoordinatorId = String(projectData.coordinator_id || projectData.welding_coordinator_id || '');
        const defaultWpsId = String(projectData.default_wps_id || projectData.wps_id || '');
        const defaultMaterialId = String(projectData.default_material_id || projectData.material_id || '');
        const defaultWelderId = String(projectData.default_welder_id || projectData.welder_id || '');
        const defaultWelder = welderOptions.find((item) => String(item.id || '') === defaultWelderId);
        setForm((current) => ({
          ...current,
          execution_class: inheritedExc,
          template_id: matchingTemplateId(templateOptions, inheritedExc, preferredTemplateId),
          coordinator_id: current.coordinator_id || defaultCoordinatorId,
          wps_id: current.wps_id || defaultWpsId,
          material: current.material || defaultMaterialId,
          welder_name: current.welder_name || optionName(defaultWelder) || defaultWelderId,
        }));
        setProjectLoaded(true);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    if (!projectLoaded) return;
    const nextTemplateId = matchingTemplateId(templates, form.execution_class, form.template_id);
    if (nextTemplateId !== form.template_id) setForm((current) => ({ ...current, template_id: nextTemplateId }));
  }, [templates, form.execution_class, form.template_id, projectLoaded]);

  const canSave = useMemo(() => Boolean(form.weld_number.trim()), [form]);

  function patch<K extends keyof MobileWeldForm>(key: K, value: MobileWeldForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    if (!canSave) { setError('Weld number is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const selectedWps = (wpsOptions as Array<Record<string, unknown>>).find((item) => String(item.id || optionCode(item)) === String(form.wps_id || ''));
      const selectedMaterial = (materials as Array<Record<string, unknown>>).find((item) => String(item.id || optionCode(item)) === String(form.material || ''));
      const created = await createWeld(projectId, {
        weld_no: form.weld_number,
        weld_number: form.weld_number,
        assembly_id: form.assembly_id || null,
        coordinator_id: form.coordinator_id || null,
        welding_coordinator_id: form.coordinator_id || null,
        weld_coordinator_id: form.coordinator_id || null,
        wps_id: form.wps_id || null,
        wps: optionCode(selectedWps) || form.wps || null,
        process: form.process || null,
        material: optionCode(selectedMaterial) || form.material || null,
        location: form.location || null,
        inspected_at: form.inspected_at || null,
        welder_name: form.welder_name || null,
        welders: form.welder_name || null,
        status: form.status || 'conform',
        execution_class: form.execution_class || 'EXC2',
        template_id: form.template_id || null,
        inspection_template_id: form.template_id || null,
        project_id: projectId,
      }) as Record<string, unknown>;
      const weldId = unwrapCreatedWeldId(created);
      if (!weldId) throw new Error('Weld was created, but the API did not return a weld id.');
      for (const file of files) {
        const formData = new FormData();
        formData.append('files', file, file.name);
        await uploadWeldAttachment(projectId, weldId, formData);
      }
      dispatchAppRefresh({ scope: 'welds', projectId, weldId, reason: 'weld-created' });
      navigate(`/projecten/${projectId}/lassen`, { replace: true });
    } catch (err) {
      setError(normalizeApiError(err, 'Could not save the weld.'));
    } finally {
      setSaving(false);
    }
  }

  const filteredTemplates = templates.filter((item) => normalizeExc(item.exc_class || item.execution_class || item.code || item.name) === normalizeExc(form.execution_class));

  return (
    <MobilePageScaffold title="Create weld" subtitle="Add weld details" backTo={`/projecten/${projectId}/lassen`}>
      {error ? <div className="mobile-inline-alert is-error">{error}</div> : null}
      <div className="mobile-form-card" data-testid="mobile-weld-create-form">
        <label className="mobile-form-field mobile-select-field"><span>Assembly</span><select value={form.assembly_id || ''} onChange={(event) => patch('assembly_id', event.target.value)}><option value="">Select assembly</option>{assemblies.map((item, index) => <option key={`${item.id || item.code || item.value || index}`} value={String(item.id || item.value || '')}>{String(item.code || item.name || item.label || item.value || item.id || '')}</option>)}</select></label>
        <div className="mobile-inline-actions" style={{ marginTop: -6, marginBottom: 8 }}><button type="button" className="mobile-secondary-button" onClick={() => navigate(`/projecten/${projectId}/assemblies/nieuw`)}>Create assembly</button></div>
        <label className="mobile-form-field"><span>Weld number</span><input value={form.weld_number} onChange={(event) => patch('weld_number', event.target.value)} placeholder="Example: W-101" /></label>
        <label className="mobile-form-field"><span>Inspection date</span><input type="date" value={form.inspected_at || ''} onChange={(event) => patch('inspected_at', event.target.value)} /></label>
        <label className="mobile-form-field mobile-select-field"><span>Execution Class (EXC)</span><select value={form.execution_class || 'EXC2'} onChange={(event) => patch('execution_class', event.target.value as WeldFormValues['execution_class'])}><option value="EXC1">EXC1</option><option value="EXC2">EXC2</option><option value="EXC3">EXC3</option><option value="EXC4">EXC4</option></select></label>
        <label className="mobile-form-field mobile-select-field"><span>Welding process</span><select value={form.process || '135'} onChange={(event) => patch('process', event.target.value)}>{processes.length ? processes.map((item, index) => <option key={`${item.id || item.code || item.value || index}`} value={String(item.code || item.value || item.name || '135')}>{String(item.name || item.label || item.code || item.value || '135')}</option>) : <><option value="135">135 (MAG)</option><option value="111">111 (SMAW)</option><option value="141">141 (TIG)</option></>}</select></label>
        <label className="mobile-form-field mobile-select-field"><span>WPS</span><select value={form.wps_id || ''} onChange={(event) => patch('wps_id', event.target.value)}><option value="">Select WPS</option>{(wpsOptions as Array<Record<string, unknown>>).map((item, index) => <option key={`${item.id || optionCode(item) || index}`} value={String(item.id || optionCode(item))}>{optionCode(item)} · {optionName(item)}</option>)}</select></label>
        <label className="mobile-form-field mobile-select-field"><span>Material</span><select value={form.material || ''} onChange={(event) => patch('material', event.target.value)}><option value="">Select material</option>{(materials as Array<Record<string, unknown>>).map((item, index) => <option key={`${item.id || optionCode(item) || index}`} value={String(item.id || optionCode(item))}>{optionCode(item)} · {optionName(item)}</option>)}</select></label>
        <label className="mobile-form-field mobile-select-field"><span>Welder</span><select value={form.welder_name || ''} onChange={(event) => patch('welder_name', event.target.value)}><option value="">Select welder</option>{welders.map((item, index) => <option key={`${item.id || item.code || item.value || index}`} value={String(item.name || item.label || item.code || item.value || '')}>{String(item.name || item.label || item.code || item.value || '')}</option>)}</select></label>
        <label className="mobile-form-field mobile-select-field"><span>Welding Coordinator</span><select value={form.coordinator_id || ''} onChange={(event) => patch('coordinator_id', event.target.value)}><option value="">Select Welding Coordinator</option>{coordinators.map((item, index) => <option key={`${item.id || item.code || item.value || index}`} value={String(item.id || '')}>{String(item.name || item.label || item.code || item.value || item.id || '')}</option>)}</select></label>
        <label className="mobile-form-field"><span>Location</span><input value={form.location || ''} onChange={(event) => patch('location', event.target.value)} placeholder="Location" /></label>
        <label className="mobile-form-field mobile-select-field"><span>Inspection template</span><select value={form.template_id || ''} onChange={(event) => patch('template_id', event.target.value)}><option value="">Select template</option>{filteredTemplates.map((item, index) => <option key={`${item.id || index}`} value={String(item.id || '')}>{[String(item.name || item.label || item.id || ''), String(item.norm || '').trim(), item.version ? `v${String(item.version)}` : ''].filter(Boolean).join(' · ')}</option>)}</select></label>
        <label className="mobile-form-field mobile-select-field"><span>Status</span><select value={form.status} onChange={(event) => patch('status', event.target.value as WeldFormValues['status'])}><option value="conform">Compliant</option><option value="defect">Non-compliant</option><option value="gerepareerd">Pending review</option></select></label>
        <label className="mobile-upload-field"><span><ImagePlus size={16} /> Add photos</span><input type="file" accept="image/*" capture="environment" multiple onChange={(event) => setFiles(Array.from(event.target.files || []))} /><small><Camera size={14} /> Camera or photo library</small></label>
        {files.length ? <div className="mobile-file-list">{files.map((file) => <div key={`${file.name}-${file.size}`} className="mobile-file-pill">{file.name}</div>)}</div> : null}
        <div className="mobile-inline-actions stack-on-mobile"><button type="button" className="mobile-secondary-button" onClick={() => navigate(`/projecten/${projectId}/lassen`)}>Cancel</button><button type="button" className="mobile-primary-button" onClick={handleSave} disabled={saving || !canSave}>{saving ? 'Saving weld…' : 'Create weld'}</button></div>
      </div>
    </MobilePageScaffold>
  );
}

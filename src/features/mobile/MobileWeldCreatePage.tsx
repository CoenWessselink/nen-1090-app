import { useEffect, useMemo, useState } from 'react';
import { Camera, ImagePlus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { createWeld, uploadWeldAttachment } from '@/api/welds';
import { getAssemblies } from '@/api/assemblies';
import { getInspectionTemplates, getMaterials, getProcesses, getWeldCoordinators, getWelders } from '@/api/settings';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { dispatchAppRefresh, normalizeApiError } from '@/features/mobile/mobile-utils';
import type { WeldFormValues } from '@/types/forms';

function defaultForm(projectId: string): WeldFormValues {
  return { project_id: projectId, weld_number: '', assembly_id: '', wps_id: '', welder_name: '', coordinator_id: '', process: '135', location: '', status: 'conform', execution_class: 'EXC2', template_id: '' };
}

type Option = { id?: string; code?: string; name?: string; label?: string; value?: string; exc_class?: string; execution_class?: string; norm?: string; version?: string | number };
type MobileWeldForm = WeldFormValues & { material?: string };

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

export function MobileWeldCreatePage() {
  const navigate = useNavigate();
  const { projectId = '' } = useParams();
  const [form, setForm] = useState<MobileWeldForm>({ ...defaultForm(projectId), material: '' });
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processes, setProcesses] = useState<Option[]>([]);
  const [materials, setMaterials] = useState<Option[]>([]);
  const [welders, setWelders] = useState<Option[]>([]);
  const [templates, setTemplates] = useState<Option[]>([]);
  const [assemblies, setAssemblies] = useState<Option[]>([]);
  const [coordinators, setCoordinators] = useState<Option[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([getProcesses().catch(() => []), getMaterials().catch(() => []), getWelders().catch(() => []), getWeldCoordinators().catch(() => []), getInspectionTemplates().catch(() => []), getAssemblies(projectId).catch(() => ({ items: [] }))])
      .then(([processRows, materialRows, welderRows, coordinatorRows, templateRows, assemblyRows]) => {
        if (!active) return;
        setProcesses(asOptions(processRows));
        setMaterials(asOptions(materialRows));
        setWelders(asOptions(welderRows));
        setCoordinators(asOptions(coordinatorRows));
        setTemplates(asOptions(templateRows));
        setAssemblies(asOptions(assemblyRows));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    const matching = templates.find((item) => String(item.exc_class || item.execution_class || '').toUpperCase() === String(form.execution_class || '').toUpperCase());
    if (matching?.id && !form.template_id) setForm((current) => ({ ...current, template_id: String(matching.id) }));
  }, [templates, form.execution_class, form.template_id]);

  const canSave = useMemo(() => Boolean(form.weld_number.trim()), [form]);

  function patch<K extends keyof MobileWeldForm>(key: K, value: MobileWeldForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    if (!canSave) { setError('Weld number is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const created = await createWeld(projectId, {
        weld_no: form.weld_number,
        weld_number: form.weld_number,
        assembly_id: form.assembly_id || null,
        coordinator_id: form.coordinator_id || null,
        wps_id: form.wps_id || null,
        process: form.process || null,
        material: form.material || null,
        location: form.location || null,
        welder_name: form.welder_name || null,
        welders: form.welder_name || null,
        status: form.status || 'conform',
        execution_class: form.execution_class || 'EXC2',
        template_id: form.template_id || null,
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

  return (
    <MobilePageScaffold title="Create weld" subtitle="Add weld details" backTo={`/projecten/${projectId}/lassen`}>
      {error ? <div className="mobile-inline-alert is-error">{error}</div> : null}
      <div className="mobile-form-card" data-testid="mobile-weld-create-form">
        <label className="mobile-form-field"><span>Weld number</span><input value={form.weld_number} onChange={(event) => patch('weld_number', event.target.value)} placeholder="Example: W-101" /></label>
        <label className="mobile-form-field mobile-select-field"><span>Assembly</span><select value={form.assembly_id || ''} onChange={(event) => patch('assembly_id', event.target.value)}><option value="">Select assembly</option>{assemblies.map((item, index) => <option key={`${item.id || item.code || item.value || index}`} value={String(item.id || item.value || '')}>{String(item.code || item.name || item.label || item.value || item.id || '')}</option>)}</select></label>
        <div className="mobile-inline-actions" style={{ marginTop: -6, marginBottom: 8 }}><button type="button" className="mobile-secondary-button" onClick={() => navigate(`/projecten/${projectId}/assemblies/nieuw`)}>Create assembly</button></div>
        <label className="mobile-form-field mobile-select-field"><span>Execution Class (EXC)</span><select value={form.execution_class || 'EXC2'} onChange={(event) => patch('execution_class', event.target.value as WeldFormValues['execution_class'])}><option value="EXC1">EXC1</option><option value="EXC2">EXC2</option><option value="EXC3">EXC3</option><option value="EXC4">EXC4</option></select></label>
        <label className="mobile-form-field mobile-select-field"><span>Welding process</span><select value={form.process || '135'} onChange={(event) => patch('process', event.target.value)}>{processes.length ? processes.map((item, index) => <option key={`${item.id || item.code || item.value || index}`} value={String(item.code || item.value || item.name || '135')}>{String(item.name || item.label || item.code || item.value || '135')}</option>) : <><option value="135">135 (MAG)</option><option value="111">111 (SMAW)</option><option value="141">141 (TIG)</option></>}</select></label>
        <label className="mobile-form-field mobile-select-field"><span>Material</span><select value={form.material || ''} onChange={(event) => patch('material', event.target.value)}><option value="">Select material</option>{materials.map((item, index) => <option key={`${item.id || item.code || item.value || index}`} value={String(item.code || item.value || item.name || '')}>{String(item.name || item.label || item.code || item.value || '')}</option>)}</select></label>
        <label className="mobile-form-field mobile-select-field"><span>Welder</span><select value={form.welder_name || ''} onChange={(event) => patch('welder_name', event.target.value)}><option value="">Select welder</option>{welders.map((item, index) => <option key={`${item.id || item.code || item.value || index}`} value={String(item.name || item.label || item.code || item.value || '')}>{String(item.name || item.label || item.code || item.value || '')}</option>)}</select></label>
        <label className="mobile-form-field mobile-select-field"><span>Welding Coordinator</span><select value={form.coordinator_id || ''} onChange={(event) => patch('coordinator_id', event.target.value)}><option value="">Select Welding Coordinator</option>{coordinators.map((item, index) => <option key={`${item.id || item.code || item.value || index}`} value={String(item.id || '')}>{String(item.name || item.label || item.code || item.value || item.id || '')}</option>)}</select></label>
        <label className="mobile-form-field mobile-select-field"><span>Inspection template</span><select value={form.template_id || ''} onChange={(event) => patch('template_id', event.target.value)}><option value="">Select template</option>{templates.filter((item) => !form.execution_class || String(item.exc_class || item.execution_class || '').toUpperCase() === String(form.execution_class || '').toUpperCase()).map((item, index) => <option key={`${item.id || index}`} value={String(item.id || '')}>{[String(item.name || item.label || item.id || ''), String(item.norm || '').trim(), item.version ? `v${String(item.version)}` : ''].filter(Boolean).join(' · ')}</option>)}</select></label>
        <label className="mobile-form-field mobile-select-field"><span>Status</span><select value={form.status} onChange={(event) => patch('status', event.target.value as WeldFormValues['status'])}><option value="conform">Compliant</option><option value="defect">Non-compliant</option><option value="gerepareerd">Pending review</option></select></label>
        <label className="mobile-upload-field"><span><ImagePlus size={16} /> Add photos</span><input type="file" accept="image/*" capture="environment" multiple onChange={(event) => setFiles(Array.from(event.target.files || []))} /><small><Camera size={14} /> Camera or photo library</small></label>
        {files.length ? <div className="mobile-file-list">{files.map((file) => <div key={`${file.name}-${file.size}`} className="mobile-file-pill">{file.name}</div>)}</div> : null}
        <div className="mobile-inline-actions stack-on-mobile"><button type="button" className="mobile-secondary-button" onClick={() => navigate(`/projecten/${projectId}/lassen`)}>Cancel</button><button type="button" className="mobile-primary-button" onClick={handleSave} disabled={saving || !canSave}>{saving ? 'Saving weld…' : 'Create weld'}</button></div>
      </div>
    </MobilePageScaffold>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import { Card } from '@/components/ui/Card';
import type { Project } from '@/types/domain';
import type { ProjectAssemblyDraft, ProjectFormValues, ProjectWeldDraft } from '@/types/forms';
import { useClients, useInspectionTemplates, useMaterials, useProcesses, useWeldCoordinators, useWelders, useWps } from '@/hooks/useSettings';

const schema = z.object({
  projectnummer: z.string().min(1, 'Projectnummer is verplicht'),
  name: z.string().min(1, 'Omschrijving is verplicht'),
  client_name: z.string().min(1, 'Opdrachtgever is verplicht'),
  execution_class: z.string().min(1, 'Executieklasse is verplicht'),
  status: z.string().min(1, 'Status is verplicht'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  project_type: z.string().optional(),
  location: z.string().optional(),
  planner: z.string().optional(),
  inspection_template_id: z.string().optional(),
  apply_materials: z.boolean().optional(),
  apply_wps: z.boolean().optional(),
  apply_welders: z.boolean().optional(),
});

const steps = [
  { key: 'algemeen', label: 'Stap 1 · Algemeen' },
  { key: 'kaders', label: 'Stap 2 · Kaders & templates' },
  { key: 'koppelingen', label: 'Stap 3 · Assemblies, lassen & foto’s' },
  { key: 'controle', label: 'Stap 4 · Controle & opslaan' },
] as const;

const projectTypeOptions = ['Nieuwbouw', 'Renovatie', 'Onderhoud', 'Machinebouw', 'Staalconstructie'];
const locationOptions = ['Werkplaats', 'Montage', 'Externe locatie', 'Magazijn'];
const plannerOptions = ['Planner A', 'Planner B', 'Werkvoorbereiding', 'Projectleiding'];

function normalizeExecutionClass(value: unknown) {
  const text = String(value || '').trim().toUpperCase();
  return ['EXC1', 'EXC2', 'EXC3', 'EXC4'].includes(text) ? text : '';
}

function getInspectionTemplateLabel(item: Record<string, unknown>) {
  const executionClass = normalizeExecutionClass(item.execution_class || item.exc_class);
  const version = item.version ? `v${String(item.version)}` : '';
  return [String(item.name || item.title || item.code || item.id || 'Template'), executionClass, version].filter(Boolean).join(' · ');
}

function makeAssemblyRow(index = 1): ProjectAssemblyDraft {
  return { temp_id: `asm-${Date.now()}-${index}`, code: `ASM-${index}`, name: '', drawing_no: '', revision: '', status: 'open', notes: '' };
}

function makeWeldRow(index = 1): ProjectWeldDraft {
  return { temp_id: `wld-${Date.now()}-${index}`, weld_number: `L-${index}`, assembly_temp_id: '', wps_id: '', welder_name: '', process: '135', location: '', status: 'concept', photos: [] };
}

export function ProjectForm({
  initial,
  onSubmit,
  isSubmitting,
  submitLabel = 'Project opslaan',
}: {
  initial?: Project;
  onSubmit: (values: ProjectFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
  submitLabel?: string;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [assemblies, setAssemblies] = useState<ProjectAssemblyDraft[]>([makeAssemblyRow()]);
  const [welds, setWelds] = useState<ProjectWeldDraft[]>([makeWeldRow()]);
  const clients = useClients();
  const wps = useWps();
  const materials = useMaterials();
  const welders = useWelders();
  const processes = useProcesses();
  const inspectionTemplates = useInspectionTemplates();
  const coordinators = useWeldCoordinators();

  const clientOptions = useMemo(() => {
    const rows = (clients.data?.items || []) as Array<Record<string, unknown>>;
    const seeded = rows.map((item) => String(item.name || item.title || item.code || '')).filter(Boolean);
    const fallback = [String(initial?.client_name || initial?.opdrachtgever || '').trim(), 'CWS Staalbouw', 'Demo Opdrachtgever', 'Interne productie'].filter(Boolean);
    return Array.from(new Set([...seeded, ...fallback]));
  }, [clients.data, initial]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      projectnummer: String(initial?.projectnummer || initial?.code || ''),
      name: String(initial?.name || initial?.omschrijving || ''),
      client_name: String(initial?.client_name || initial?.opdrachtgever || clientOptions[0] || ''),
      execution_class: String(initial?.execution_class || initial?.executieklasse || 'EXC2'),
      status: String(initial?.status || 'concept'),
      start_date: String(initial?.start_date || '').slice(0, 10),
      end_date: String(initial?.end_date || '').slice(0, 10),
      project_type: 'Staalconstructie',
      location: 'Werkplaats',
      planner: 'Werkvoorbereiding',
      inspection_template_id: String(initial?.default_template_id || ''),
      apply_materials: true,
      apply_wps: true,
      apply_welders: true,
    },
  });

  const values = watch();
  const templateRows = useMemo(() => (inspectionTemplates.data?.items || []) as Array<Record<string, unknown>>, [inspectionTemplates.data]);
  const executionClass = normalizeExecutionClass(values.execution_class);
  const matchingTemplates = useMemo(() => {
    if (!executionClass) return templateRows;
    return templateRows.filter((item) => normalizeExecutionClass(item.execution_class || item.exc_class) === executionClass);
  }, [executionClass, templateRows]);

  useEffect(() => {
    if (!matchingTemplates.length) return;
    const currentTemplateId = String(values.inspection_template_id || '');
    const currentTemplate = matchingTemplates.find((item) => String(item.id) === currentTemplateId);
    if (!currentTemplate) {
      setValue('inspection_template_id', String(matchingTemplates[0]?.id || ''));
    }
  }, [matchingTemplates, setValue, values.inspection_template_id]);

  async function nextStep() {
    const generalFields: Array<keyof ProjectFormValues> = ['projectnummer', 'name', 'client_name', 'execution_class', 'status'];
    if (stepIndex === 0) {
      const valid = await trigger(generalFields);
      if (!valid) return;
    }
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  function updateAssembly(tempId: string, patch: Partial<ProjectAssemblyDraft>) {
    setAssemblies((current) => current.map((row) => row.temp_id === tempId ? { ...row, ...patch } : row));
  }

  function updateWeld(tempId: string, patch: Partial<ProjectWeldDraft>) {
    setWelds((current) => current.map((row) => row.temp_id === tempId ? { ...row, ...patch } : row));
  }

  const selectedTemplate = matchingTemplates.find((item) => String(item.id || '') === values.inspection_template_id);

  return (
    <form className="form-grid" onSubmit={handleSubmit(async (formValues) => onSubmit({
      ...formValues,
      assemblies: assemblies.filter((item) => item.code.trim() || item.name.trim()),
      welds: welds.filter((item) => item.weld_number.trim()),
    }))}>
      <div className="toolbar-cluster">
        {steps.map((step, index) => (
          <Button key={step.key} type="button" variant={index === stepIndex ? 'primary' : 'secondary'} onClick={() => setStepIndex(index)}>
            {step.label}
          </Button>
        ))}
      </div>

      {stepIndex === 0 ? (
        <Card>
          <div className="form-grid">
            <div className="two-column-grid">
              <FormField label="Projectnummer" error={errors.projectnummer?.message}><Input {...register('projectnummer')} /></FormField>
              <FormField label="Opdrachtgever" error={errors.client_name?.message}>
                <>
                  <Input list="project-client-options" {...register('client_name')} placeholder="Voer opdrachtgever in" />
                  <datalist id="project-client-options">
                    {clientOptions.map((client) => <option key={client} value={client} />)}
                  </datalist>
                </>
              </FormField>
            </div>
            <FormField label="Omschrijving" error={errors.name?.message}><Input {...register('name')} /></FormField>
            <div className="two-column-grid">
              <FormField label="Executieklasse" error={errors.execution_class?.message}>
                <Select {...register('execution_class')}><option value="EXC1">EXC1</option><option value="EXC2">EXC2</option><option value="EXC3">EXC3</option><option value="EXC4">EXC4</option></Select>
              </FormField>
              <FormField label="Status" error={errors.status?.message}>
                <Select {...register('status')}><option value="concept">Concept</option><option value="in-uitvoering">In uitvoering</option><option value="in-controle">In controle</option><option value="gereed">Gereed</option><option value="geblokkeerd">Geblokkeerd</option></Select>
              </FormField>
            </div>
            <div className="two-column-grid">
              <FormField label="Projecttype"><Select {...register('project_type')}>{projectTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}</Select></FormField>
              <FormField label="Planner / verantwoordelijke"><Select {...register('planner')}>{plannerOptions.map((option) => <option key={option} value={option}>{option}</option>)}</Select></FormField>
            </div>
            <div className="two-column-grid">
              <FormField label="Locatie"><Select {...register('location')}>{locationOptions.map((option) => <option key={option} value={option}>{option}</option>)}</Select></FormField>
              <FormField label="Standaard proces">
                <Select onChange={(event) => setWelds((current) => current.map((row) => ({ ...row, process: event.target.value || row.process })))} defaultValue="">
                  <option value="">Gebruik bestaande lasregels</option>
                  {((processes.data?.items || []) as Array<Record<string, unknown>>).map((item) => {
                    const value = String(item.code || item.name || item.title || '');
                    return <option key={String(item.id || value)} value={value}>{String(item.name || item.title || value)}</option>;
                  })}
                </Select>
              </FormField>
            </div>
            <div className="two-column-grid">
              <FormField label="Startdatum"><Input type="date" {...register('start_date')} /></FormField>
              <FormField label="Einddatum"><Input type="date" {...register('end_date')} /></FormField>
            </div>
          </div>
        </Card>
      ) : null}

      {stepIndex === 1 ? (
        <Card>
          <div className="form-grid">
            <FormField label="Inspectietemplate">
              <Select {...register('inspection_template_id')}>
                {!matchingTemplates.length ? <option value="">Geen template beschikbaar voor {executionClass || 'de huidige EXC'}</option> : null}
                {matchingTemplates.map((item) => <option key={String(item.id)} value={String(item.id)}>{getInspectionTemplateLabel(item)}</option>)}
              </Select>
            </FormField>
            <div className="list-stack compact-list">
              <div className="list-row">
                <div>
                  <strong>Templatekoppeling op projectniveau</strong>
                  <div className="list-subtle">De gekozen template wordt als standaard opgeslagen voor alle nieuwe lassen in dit project. Per las kan later handmatig worden afgeweken.</div>
                </div>
              </div>
              <div className="list-row">
                <div>
                  <strong>Actieve executieklasse</strong>
                  <div className="list-subtle">{executionClass || 'Niet ingesteld'}</div>
                </div>
              </div>
              <div className="list-row">
                <div>
                  <strong>Gekozen template</strong>
                  <div className="list-subtle">{selectedTemplate ? getInspectionTemplateLabel(selectedTemplate) : 'Nog geen template gekozen'}</div>
                </div>
              </div>
              <label className="list-row"><div><strong>Materiaalset direct toevoegen</strong><div className="list-subtle">Beschikbare materials uit instellingen: {(materials.data?.items || []).length}</div></div><input type="checkbox" {...register('apply_materials')} /></label>
              <label className="list-row"><div><strong>WPS-set direct toevoegen</strong><div className="list-subtle">Beschikbare WPS uit instellingen: {(wps.data?.items || []).length}</div></div><input type="checkbox" {...register('apply_wps')} /></label>
              <label className="list-row"><div><strong>Lasserset direct toevoegen</strong><div className="list-subtle">Beschikbare lassers uit instellingen: {(welders.data?.items || []).length}</div></div><input type="checkbox" {...register('apply_welders')} /></label>
            </div>
          </div>
        </Card>
      ) : null}

      {stepIndex === 2 ? (
        <div className="detail-stack">
          <Card>
            <div className="section-title-row"><h3>Assemblies</h3><Button type="button" variant="secondary" onClick={() => setAssemblies((current) => [...current, makeAssemblyRow(current.length + 1)])}>Nieuwe assembly</Button></div>
            <div className="list-stack compact-list">
              {assemblies.map((assembly) => (
                <div key={assembly.temp_id} className="detail-stack" style={{ border: '1px solid var(--line)', borderRadius: 14, padding: 12 }}>
                  <div className="two-column-grid">
                    <FormField label="Code"><Input value={assembly.code} onChange={(event) => updateAssembly(assembly.temp_id, { code: event.target.value })} /></FormField>
                    <FormField label="Naam"><Input value={assembly.name} onChange={(event) => updateAssembly(assembly.temp_id, { name: event.target.value })} /></FormField>
                  </div>
                  <div className="two-column-grid">
                    <FormField label="Tekening"><Input value={assembly.drawing_no || ''} onChange={(event) => updateAssembly(assembly.temp_id, { drawing_no: event.target.value })} /></FormField>
                    <FormField label="Revisie"><Input value={assembly.revision || ''} onChange={(event) => updateAssembly(assembly.temp_id, { revision: event.target.value })} /></FormField>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="section-title-row"><h3>Lassen</h3><Button type="button" variant="secondary" onClick={() => setWelds((current) => [...current, makeWeldRow(current.length + 1)])}>Nieuwe las</Button></div>
            <div className="list-stack compact-list">
              {welds.map((weld) => (
                <div key={weld.temp_id} className="detail-stack" style={{ border: '1px solid var(--line)', borderRadius: 14, padding: 12 }}>
                  <div className="two-column-grid">
                    <FormField label="Lasnummer"><Input value={weld.weld_number} onChange={(event) => updateWeld(weld.temp_id, { weld_number: event.target.value })} /></FormField>
                    <FormField label="Assembly"><Select value={weld.assembly_temp_id || ''} onChange={(event) => updateWeld(weld.temp_id, { assembly_temp_id: event.target.value })}><option value="">Koppel later</option>{assemblies.map((assembly) => <option key={assembly.temp_id} value={assembly.temp_id}>{assembly.code || assembly.name || assembly.temp_id}</option>)}</Select></FormField>
                  </div>
                  <div className="two-column-grid">
                    <FormField label="Proces"><Input value={weld.process || ''} onChange={(event) => updateWeld(weld.temp_id, { process: event.target.value })} /></FormField>
                    <FormField label="Locatie"><Input value={weld.location} onChange={(event) => updateWeld(weld.temp_id, { location: event.target.value })} /></FormField>
                  </div>
                  <div className="two-column-grid">
                    <FormField label="Lasser"><Select value={weld.welder_name || ''} onChange={(event) => updateWeld(weld.temp_id, { welder_name: event.target.value })}><option value="">Selecteer lasser</option>{((welders.data?.items || []) as Array<Record<string, unknown>>).map((item) => { const value = String(item.name || item.code || item.id || ''); return <option key={String(item.id || value)} value={value}>{value}</option>; })}</Select></FormField>
                    <FormField label="Lascoördinator"><Select value={weld.coordinator_id || ''} onChange={(event) => updateWeld(weld.temp_id, { coordinator_id: event.target.value })}><option value="">Selecteer lascoördinator</option>{((coordinators.data?.items || []) as Array<Record<string, unknown>>).map((item) => <option key={String(item.id || item.code || '')} value={String(item.id || '')}>{String(item.name || item.code || item.id || '')}</option>)}</Select></FormField>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}

      {stepIndex === 3 ? (
        <Card>
          <div className="detail-stack">
            <div className="list-row"><div><strong>Project</strong><div className="list-subtle">{values.projectnummer} · {values.name}</div></div></div>
            <div className="list-row"><div><strong>Opdrachtgever</strong><div className="list-subtle">{values.client_name}</div></div></div>
            <div className="list-row"><div><strong>Executieklasse</strong><div className="list-subtle">{values.execution_class}</div></div></div>
            <div className="list-row"><div><strong>Template voor nieuwe lassen</strong><div className="list-subtle">{selectedTemplate ? getInspectionTemplateLabel(selectedTemplate) : 'Geen template gekozen'}</div></div></div>
            <div className="list-row"><div><strong>Assemblies</strong><div className="list-subtle">{assemblies.filter((item) => item.code || item.name).length}</div></div></div>
            <div className="list-row"><div><strong>Lassen</strong><div className="list-subtle">{welds.filter((item) => item.weld_number).length}</div></div></div>
          </div>
        </Card>
      ) : null}

      <div className="toolbar-cluster">
        <Button type="button" variant="secondary" onClick={() => setStepIndex((current) => Math.max(current - 1, 0))} disabled={stepIndex === 0}>Vorige stap</Button>
        {stepIndex < steps.length - 1 ? <Button type="button" onClick={nextStep}>Volgende stap</Button> : <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Opslaan...' : submitLabel}</Button>}
      </div>
    </form>
  );
}

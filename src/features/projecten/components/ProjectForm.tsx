import { useMemo, useState } from 'react';
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
import { useInspectionTemplates, useMaterials, useWelders, useWps } from '@/hooks/useSettings';

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

function uniqueProjectClients(initial?: Project) {
  return Array.from(new Set([
    String(initial?.client_name || initial?.opdrachtgever || '').trim(),
    'CWS Staalbouw',
    'Demo Opdrachtgever',
    'Interne productie',
  ].filter(Boolean)));
}

function getInspectionTemplateLabel(item: Record<string, unknown>) {
  return String(item.name || item.title || item.code || item.id || 'Template');
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
  const wps = useWps();
  const materials = useMaterials();
  const welders = useWelders();
  const inspectionTemplates = useInspectionTemplates();

  const clientOptions = useMemo(() => uniqueProjectClients(initial), [initial]);

  const {
    register,
    handleSubmit,
    watch,
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
      inspection_template_id: '',
      apply_materials: true,
      apply_wps: true,
      apply_welders: true,
    },
  });

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

  const values = watch();
  const selectedTemplate = (inspectionTemplates.data?.items || []).find((item) => String(item.id || '') === values.inspection_template_id);

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
                <Select {...register('client_name')}>
                  <option value="">Selecteer opdrachtgever</option>
                  {clientOptions.map((client) => <option key={client} value={client}>{client}</option>)}
                </Select>
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
              <div />
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
                <option value="">Geen template direct toepassen</option>
                {(inspectionTemplates.data?.items || []).map((item) => <option key={String(item.id)} value={String(item.id)}>{getInspectionTemplateLabel(item)}</option>)}
              </Select>
            </FormField>
            <div className="list-stack compact-list">
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
            <div className="section-title-row"><h3>Assemblies</h3><Button type="button" variant="secondary" onClick={() => setAssemblies((current) => [...current, makeAssemblyRow(current.length + 1)])}>+ Nieuwe assembly</Button></div>
            <div className="list-stack">
              {assemblies.map((assembly, index) => (
                <div key={assembly.temp_id} className="card-grid" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
                  <div className="two-column-grid">
                    <FormField label={`Assembly code ${index + 1}`}><Input value={assembly.code} onChange={(e) => updateAssembly(assembly.temp_id, { code: e.target.value })} /></FormField>
                    <FormField label="Naam"><Input value={assembly.name} onChange={(e) => updateAssembly(assembly.temp_id, { name: e.target.value })} /></FormField>
                  </div>
                  <div className="two-column-grid">
                    <FormField label="Tekeningnummer"><Input value={assembly.drawing_no || ''} onChange={(e) => updateAssembly(assembly.temp_id, { drawing_no: e.target.value })} /></FormField>
                    <FormField label="Revisie"><Input value={assembly.revision || ''} onChange={(e) => updateAssembly(assembly.temp_id, { revision: e.target.value })} /></FormField>
                  </div>
                  <div className="form-actions"><Button type="button" variant="ghost" onClick={() => setAssemblies((current) => current.length > 1 ? current.filter((item) => item.temp_id !== assembly.temp_id) : current)}>Verwijderen</Button></div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div className="section-title-row"><h3>Lassen</h3><div className="toolbar-cluster"><Button type="button" variant="secondary" onClick={() => setWelds((current) => [...current, makeWeldRow(current.length + 1)])}>+ Nieuwe las</Button></div></div>
            <div className="list-stack">
              {welds.map((weld, index) => (
                <div key={weld.temp_id} className="card-grid" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
                  <div className="two-column-grid">
                    <FormField label={`Lasnummer ${index + 1}`}><Input value={weld.weld_number} onChange={(e) => updateWeld(weld.temp_id, { weld_number: e.target.value })} /></FormField>
                    <FormField label="Assembly">
                      <Select value={weld.assembly_temp_id || ''} onChange={(e) => updateWeld(weld.temp_id, { assembly_temp_id: e.target.value })}>
                        <option value="">Geen assembly</option>
                        {assemblies.map((assembly) => <option key={assembly.temp_id} value={assembly.temp_id}>{assembly.code || assembly.name || assembly.temp_id}</option>)}
                      </Select>
                    </FormField>
                  </div>
                  <div className="two-column-grid">
                    <FormField label="WPS">
                      <Select value={weld.wps_id || ''} onChange={(e) => updateWeld(weld.temp_id, { wps_id: e.target.value })}>
                        <option value="">Geen WPS</option>
                        {(wps.data?.items || []).map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.code || item.name || item.id)}</option>)}
                      </Select>
                    </FormField>
                    <FormField label="Lasser">
                      <Select value={weld.welder_name || ''} onChange={(e) => updateWeld(weld.temp_id, { welder_name: e.target.value })}>
                        <option value="">Geen lasser</option>
                        {(welders.data?.items || []).map((item) => <option key={String(item.id)} value={String(item.name || item.code || item.id)}>{String(item.name || item.code || item.id)}</option>)}
                      </Select>
                    </FormField>
                  </div>
                  <div className="two-column-grid">
                    <FormField label="Proces"><Input value={weld.process || ''} onChange={(e) => updateWeld(weld.temp_id, { process: e.target.value })} /></FormField>
                    <FormField label="Locatie"><Input value={weld.location} onChange={(e) => updateWeld(weld.temp_id, { location: e.target.value })} /></FormField>
                  </div>
                  <FormField label="Foto’s / bijlagen bij deze las">
                    <Input type="file" multiple onChange={(e) => updateWeld(weld.temp_id, { photos: Array.from(e.target.files || []) })} />
                  </FormField>
                  <div className="form-actions" style={{ justifyContent: 'space-between' }}>
                    <Button type="button" variant="secondary" onClick={() => setWelds((current) => [...current, { ...weld, temp_id: `copy-${Date.now()}-${index}`, photos: [] }])}>Las kopiëren</Button>
                    <Button type="button" variant="ghost" onClick={() => setWelds((current) => current.length > 1 ? current.filter((item) => item.temp_id !== weld.temp_id) : current)}>Verwijderen</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}

      {stepIndex === 3 ? (
        <Card>
          <div className="detail-grid">
            <div><span>Projectnummer</span><strong>{values.projectnummer || '—'}</strong></div>
            <div><span>Omschrijving</span><strong>{values.name || '—'}</strong></div>
            <div><span>Opdrachtgever</span><strong>{values.client_name || '—'}</strong></div>
            <div><span>Executieklasse</span><strong>{values.execution_class || '—'}</strong></div>
            <div><span>Status</span><strong>{values.status || '—'}</strong></div>
            <div><span>Template</span><strong>{selectedTemplate ? getInspectionTemplateLabel(selectedTemplate) : 'Geen'}</strong></div>
            <div><span>Assemblies</span><strong>{assemblies.filter((item) => item.code || item.name).length}</strong></div>
            <div><span>Lassen</span><strong>{welds.filter((item) => item.weld_number).length}</strong></div>
            <div><span>Foto’s</span><strong>{welds.reduce((sum, item) => sum + (item.photos?.length || 0), 0)}</strong></div>
          </div>
          <div className="list-subtle" style={{ marginTop: 12 }}>Na opslaan worden project, assemblies, lassen en foto-bijlagen direct aangemaakt zodat Lascontrole direct per las kan doorwerken.</div>
        </Card>
      ) : null}

      <div className="form-actions" style={{ justifyContent: 'space-between' }}>
        <Button type="button" variant="secondary" onClick={() => setStepIndex((current) => Math.max(current - 1, 0))} disabled={stepIndex === 0}>Vorige</Button>
        <div className="toolbar-cluster">
          {stepIndex < steps.length - 1 ? <Button type="button" onClick={nextStep}>Volgende</Button> : null}
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Opslaan...' : submitLabel}</Button>
        </div>
      </div>
    </form>
  );
}

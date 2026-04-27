import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createProject, getProject, updateProject } from '@/api/projects';
import { getNormProfiles, getNormSystems, setProjectNormSelection, type NormProfile, type NormSystem } from '@/api/norms';
import { useClients, useInspectionTemplates } from '@/hooks/useSettings';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { dispatchAppRefresh, normalizeApiError } from '@/features/mobile/mobile-utils';
import type { ProjectFormValues } from '@/types/forms';

const executionClasses = ['EXC1', 'EXC2', 'EXC3', 'EXC4'] as const;
function defaultForm(): ProjectFormValues { return { projectnummer: '', name: '', client_name: '', execution_class: 'EXC2', status: 'conform', start_date: '', end_date: '', assemblies: [], welds: [], apply_materials: false, apply_wps: false, apply_welders: false, inspection_template_id: '', norm_system_id: '', norm_profile_id: '', iso3834_level: '', iso5817_level: '' }; }

export function MobileProjectCreatePage() {
  const navigate = useNavigate();
  const { projectId = '' } = useParams();
  const isEdit = Boolean(projectId);
  const [form, setForm] = useState<ProjectFormValues>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(projectId));
  const clients = useClients();
  const inspectionTemplates = useInspectionTemplates();
  const [normSystems, setNormSystems] = useState<NormSystem[]>([]);
  const [normProfiles, setNormProfiles] = useState<NormProfile[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getNormSystems(), getNormProfiles({ active: true })]).then(([systems, profiles]) => {
      if (!active) return;
      setNormSystems(systems); setNormProfiles(profiles);
      const exc2 = profiles.find((profile) => profile.code === 'EU_EXC2_STANDARD') || profiles[0];
      setForm((current) => ({ ...current, norm_system_id: current.norm_system_id || (exc2 as any)?.norm_system_id || systems[0]?.id || '', norm_profile_id: current.norm_profile_id || exc2?.id || '', iso3834_level: current.iso3834_level || exc2?.iso3834_level || '', iso5817_level: current.iso5817_level || exc2?.iso5817_level || '' }));
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const clientOptions = useMemo(() => Array.from(new Set([...
    ((clients.data?.items || []) as Array<Record<string, unknown>>).map((item) => String(item.name || item.client_name || item.opdrachtgever || item.title || item.code || '')).map((value) => value.trim()).filter(Boolean),
    ...['CWS Staalbouw', 'Demo Opdrachtgever', String(form.client_name || '').trim()].filter(Boolean),
  ])), [clients.data, form.client_name]);
  const templateOptions = useMemo(() => ((inspectionTemplates.data?.items || []) as Array<Record<string, unknown>>), [inspectionTemplates.data]);
  const filteredTemplates = useMemo(() => { const exc = String(form.execution_class || '').toUpperCase(); return templateOptions.filter((item) => String(item.exc_class || item.execution_class || '').toUpperCase() === exc); }, [form.execution_class, templateOptions]);
  function templateLabel(item: Record<string, unknown>) { return [String(item.name || item.title || item.code || item.id || 'Template'), String(item.norm || '').trim(), item.version ? `v${String(item.version)}` : ''].filter(Boolean).join(' · '); }

  useEffect(() => {
    if (!projectId) return;
    let active = true; setLoading(true);
    getProject(projectId).then((project) => { if (!active) return; setForm({ ...defaultForm(), projectnummer: String(project.projectnummer || project.code || ''), name: String(project.name || ''), client_name: String(project.client_name || project.opdrachtgever || ''), execution_class: (String(project.execution_class || 'EXC2').toUpperCase() || 'EXC2') as ProjectFormValues['execution_class'], inspection_template_id: String(project.default_template_id || project.inspection_template_id || ''), status: String(project.status || 'conform'), start_date: String(project.start_date || ''), end_date: String(project.end_date || ''), norm_system_id: String((project as any).norm_system_id || ''), norm_profile_id: String((project as any).norm_profile_id || ''), iso3834_level: String((project as any).iso3834_level || ''), iso5817_level: String((project as any).iso5817_level || '') }); })
      .catch((err) => { if (!active) return; setError(normalizeApiError(err, 'Project kon niet worden geladen.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId]);
  useEffect(() => { if (!form.client_name && clientOptions.length) setForm((current) => ({ ...current, client_name: clientOptions[0] })); }, [clientOptions, form.client_name]);
  useEffect(() => { if (!filteredTemplates.length) return; const current = filteredTemplates.find((item) => String(item.id) === String(form.inspection_template_id || '')); if (!current) setForm((state) => ({ ...state, inspection_template_id: String(filteredTemplates[0]?.id || '') })); }, [filteredTemplates, form.inspection_template_id]);
  const canSave = useMemo(() => Boolean(form.projectnummer.trim() && form.name.trim() && form.client_name.trim() && form.execution_class.trim()), [form]);
  function patch<K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) { setForm((current) => ({ ...current, [key]: value })); }
  async function handleSave() {
    if (!canSave) { setError('Vul projectnummer, naam, opdrachtgever en EXC-klasse in.'); return; }
    setSaving(true); setError(null);
    try {
      const result = isEdit ? await updateProject(projectId, form) : await createProject(form);
      if (form.norm_profile_id) await setProjectNormSelection(String(result.id || projectId), { norm_system_id: form.norm_system_id || undefined, norm_profile_id: form.norm_profile_id, exc_class: form.execution_class, iso3834_level: form.iso3834_level || undefined, iso5817_level: form.iso5817_level || undefined }).catch(() => undefined);
      dispatchAppRefresh({ scope: 'projects', projectId: String(result.id || projectId || ''), reason: isEdit ? 'project-updated' : 'project-created' });
      navigate(`/projecten/${result.id}/overzicht`, { replace: true });
    } catch (err) { setError(normalizeApiError(err, isEdit ? 'Project wijzigen mislukt.' : 'Project aanmaken mislukt.')); }
    finally { setSaving(false); }
  }
  function selectProfile(profileId: string) { const profile = normProfiles.find((item) => item.id === profileId); setForm((current) => ({ ...current, norm_profile_id: profileId, norm_system_id: current.norm_system_id || (profile as any)?.norm_system_id || '', execution_class: profile?.exc_class || current.execution_class, iso3834_level: profile?.iso3834_level || '', iso5817_level: profile?.iso5817_level || '' })); }

  return <MobilePageScaffold title={isEdit ? 'Project wijzigen' : 'Nieuw project'} backTo={projectId ? `/projecten/${projectId}/overzicht` : '/projecten'}>
    {loading ? <div className="mobile-state-card">Project laden…</div> : null}{error ? <div className="mobile-state-card mobile-state-card-error">{error}</div> : null}
    {!loading ? <div className="mobile-form-card" data-testid="mobile-project-create-form">
      <label className="mobile-form-field"><span>Projectnaam</span><input value={form.name} onChange={(event) => patch('name', event.target.value)} placeholder="Bijv. Magazijn" /></label>
      <label className="mobile-form-field"><span>Projectnummer</span><input value={form.projectnummer} onChange={(event) => patch('projectnummer', event.target.value)} placeholder="Bijv. 500" /></label>
      <label className="mobile-form-field"><span>Opdrachtgever</span><input list="mobile-project-client-suggestions" value={form.client_name} onChange={(event) => patch('client_name', event.target.value)} placeholder="Voer opdrachtgever in" /><datalist id="mobile-project-client-suggestions">{clientOptions.map((option) => <option key={option} value={option} />)}</datalist></label>
      <label className="mobile-form-field mobile-select-field"><span>Executieklasse</span><select value={form.execution_class} onChange={(event) => patch('execution_class', event.target.value)}>{executionClasses.map((exc) => <option key={exc} value={exc}>{exc}</option>)}</select></label>
      <label className="mobile-form-field mobile-select-field"><span>Normsysteem</span><select value={form.norm_system_id || ''} onChange={(event) => patch('norm_system_id', event.target.value)}><option value="">Automatisch</option>{normSystems.map((system) => <option key={system.id} value={system.id}>{system.code} · {system.name}</option>)}</select></label>
      <label className="mobile-form-field mobile-select-field"><span>Normprofiel</span><select value={form.norm_profile_id || ''} onChange={(event) => selectProfile(event.target.value)}><option value="">EU_EXC2_STANDARD automatisch</option>{normProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.code} · {profile.name}</option>)}</select><small>Dit profiel bepaalt de standaard inspectietemplates. Wijzigingen maken nieuwe snapshots voor toekomstige inspecties.</small></label>
      <div className="mobile-detail-card compact-norm-info"><div className="mobile-field-row"><span>ISO 3834</span><strong>{form.iso3834_level || 'Automatisch'}</strong></div><div className="mobile-field-row"><span>ISO 5817</span><strong>{form.iso5817_level || 'Automatisch'}</strong></div></div>
      <label className="mobile-form-field mobile-select-field"><span>Inspectietemplate</span><select value={form.inspection_template_id || ''} onChange={(event) => patch('inspection_template_id', event.target.value)}><option value="">Automatisch volgens EXC</option>{filteredTemplates.map((item) => <option key={String(item.id)} value={String(item.id)}>{templateLabel(item)}</option>)}</select></label>
      <label className="mobile-form-field"><span>Startdatum</span><input type="date" value={form.start_date || ''} onChange={(event) => patch('start_date', event.target.value)} /></label>
      <label className="mobile-form-field"><span>Einddatum</span><input type="date" value={form.end_date || ''} onChange={(event) => patch('end_date', event.target.value)} /></label>
      <div className="mobile-inline-actions stack-on-mobile"><button type="button" className="mobile-secondary-button" onClick={() => navigate(projectId ? `/projecten/${projectId}/overzicht` : '/projecten')}>Annuleren</button><button type="button" className="mobile-primary-button" onClick={handleSave} disabled={saving || !canSave}>{saving ? 'Opslaan…' : isEdit ? 'Project wijzigen' : 'Project aanmaken'}</button></div>
    </div> : null}
  </MobilePageScaffold>;
}

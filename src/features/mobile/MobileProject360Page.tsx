import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, FileText, FolderOpen, History, ListChecks, PanelsTopLeft, Pencil, Plus, Wrench } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProject, updateProject } from '@/api/projects';
import { Modal } from '@/components/overlays/Modal';
import { useClients, useInspectionTemplates } from '@/hooks/useSettings';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import {
  APP_REFRESH_EVENT,
  dispatchAppRefresh,
  normalizeApiError,
  projectClient,
  projectCode,
  projectExecutionClass,
  projectTitle,
} from '@/features/mobile/mobile-utils';
import type { Project } from '@/types/domain';
import type { ProjectFormValues } from '@/types/forms';

const executionClasses = ['EXC1', 'EXC2', 'EXC3', 'EXC4'] as const;

function buildProjectForm(project: Project | null): ProjectFormValues {
  return {
    projectnummer: String(project?.projectnummer || project?.code || ''),
    name: String(project?.name || project?.omschrijving || ''),
    client_name: String(project?.client_name || project?.opdrachtgever || ''),
    execution_class: (String(project?.execution_class || project?.executieklasse || 'EXC2').toUpperCase() || 'EXC2') as ProjectFormValues['execution_class'],
    inspection_template_id: String(project?.default_template_id || project?.inspection_template_id || ''),
    status: String(project?.status || 'conform'),
    start_date: String(project?.start_date || '').slice(0, 10),
    end_date: String(project?.end_date || '').slice(0, 10),
    assemblies: [],
    welds: [],
    apply_materials: false,
    apply_wps: false,
    apply_welders: false,
  };
}

export function MobileProject360Page() {
  const navigate = useNavigate();
  const { projectId = '' } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectFormValues>(buildProjectForm(null));
  const clients = useClients();
  const inspectionTemplates = useInspectionTemplates();

  const loadProject = useCallback((background = false) => {
    let active = true;
    if (background) setRefreshing(true);
    else setLoading(true);
    getProject(projectId)
      .then((result) => {
        if (!active) return;
        const nextProject = result || null;
        setProject(nextProject);
        setForm(buildProjectForm(nextProject));
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Project kon niet worden geladen.');
      })
      .finally(() => {
        if (!active) return;
        if (background) setRefreshing(false);
        else setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  useEffect(() => loadProject(false), [loadProject]);

  useEffect(() => {
    const reload = () => loadProject(true);
    window.addEventListener(APP_REFRESH_EVENT, reload as EventListener);
    return () => {
      window.removeEventListener(APP_REFRESH_EVENT, reload as EventListener);
    };
  }, [loadProject]);

  const clientOptions = useMemo(() => {
    const rows = ((clients.data?.items || []) as Array<Record<string, unknown>>)
      .map((item) => String(item.name || item.client_name || item.opdrachtgever || item.title || item.code || ''))
      .map((value) => value.trim())
      .filter(Boolean);
    return Array.from(new Set([...rows, String(form.client_name || '').trim()].filter(Boolean)));
  }, [clients.data, form.client_name]);

  const templateOptions = useMemo(
    () => ((inspectionTemplates.data?.items || []) as Array<Record<string, unknown>>),
    [inspectionTemplates.data],
  );
  const filteredTemplates = useMemo(() => {
    const exc = String(form.execution_class || '').toUpperCase();
    return templateOptions.filter((item) => String(item.exc_class || item.execution_class || '').toUpperCase() === exc);
  }, [form.execution_class, templateOptions]);

  function templateLabel(item: Record<string, unknown>) {
    const name = String(item.name || item.title || item.code || item.id || 'Template');
    const norm = String(item.norm || '').trim();
    const version = item.version ? `v${String(item.version)}` : '';
    return [name, norm, version].filter(Boolean).join(' · ');
  }

  const canSave = useMemo(() => {
    return Boolean(form.projectnummer.trim() && form.name.trim() && form.client_name.trim() && form.execution_class.trim());
  }, [form]);

  const actions = useMemo(
    () => [
      { label: 'Nieuwe assembly', color: 'primary', icon: PanelsTopLeft, to: `/projecten/${projectId}/assemblies/nieuw` },
      { label: 'Lassen', color: 'success', icon: Wrench, to: `/projecten/${projectId}/lassen` },
      { label: 'Documenten', color: 'danger', icon: FolderOpen, to: `/projecten/${projectId}/documenten` },
      { label: 'CE-Dossier', color: 'warning', icon: FileText, to: `/projecten/${projectId}/ce-dossier` },
      { label: 'Bekijk PDF', color: 'primary', icon: Eye, to: `/projecten/${projectId}/pdf-viewer` },
      { label: 'Historie', color: 'neutral', icon: History, to: `/projecten/${projectId}/historie` },
      { label: 'Inspecties', color: 'neutral', icon: ListChecks, to: `/projecten/${projectId}/lassen` },
    ],
    [projectId],
  );

  function patch<K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSaveProject() {
    if (!canSave) {
      setEditError('Vul projectnummer, naam, opdrachtgever en EXC-klasse in.');
      return;
    }

    setSaving(true);
    setEditError(null);

    try {
      await updateProject(projectId, form);
      dispatchAppRefresh({ scope: 'projects', projectId, reason: 'project-updated-from-project360' });
      await loadProject(true);
      setEditOpen(false);
    } catch (err) {
      setEditError(normalizeApiError(err, 'Project wijzigen mislukt.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <MobilePageScaffold
        title="Project 360"
        subtitle="Dubbelklik op het projectblok of gebruik de zichtbare projectknoppen"
        backTo="/projecten"
        rightSlot={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="mobile-icon-button" type="button" aria-label="Project wijzigen" onClick={() => setEditOpen(true)}>
              <Pencil size={18} />
            </button>
            <button className="mobile-icon-button" type="button" aria-label="Nieuwe las" onClick={() => navigate(`/projecten/${projectId}/lassen/nieuw`)}>
              <Plus size={18} />
            </button>
          </div>
        }
      >
        {loading ? <div className="mobile-state-card">Project laden…</div> : null}
        {error ? <div className="mobile-state-card mobile-state-card-error">{error}</div> : null}
        {refreshing && !loading ? <div className="mobile-list-card-meta" style={{ marginBottom: 8 }}>Gegevens worden bijgewerkt…</div> : null}
        {!loading && !error && project ? (
          <>
            <div className="mobile-detail-card" style={{ cursor: 'pointer' }} onDoubleClick={() => setEditOpen(true)} role="button" tabIndex={0} onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setEditOpen(true);
              }
            }}>
              <div className="mobile-field-row"><span>Projectnaam</span><strong>{projectTitle(project)}</strong></div>
              <div className="mobile-field-row"><span>Projectnummer</span><strong>{projectCode(project)}</strong></div>
              <div className="mobile-field-row"><span>Opdrachtgever</span><strong>{projectClient(project)}</strong></div>
              <div className="mobile-field-row"><span>Executieklasse</span><strong>{projectExecutionClass(project)}</strong></div>
            </div>
            <div className="mobile-inline-actions" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
              <button type="button" className="mobile-secondary-button" onClick={() => navigate(`/projecten/${projectId}/assemblies/nieuw`)}>
                <PanelsTopLeft size={16} /> Nieuwe assembly
              </button>
              <button type="button" className="mobile-secondary-button" onClick={() => setEditOpen(true)}>
                <Pencil size={16} /> Wijzig project
              </button>
              <button type="button" className="mobile-secondary-button" onClick={() => navigate(`/projecten/${projectId}/pdf-viewer`)}>
                <Eye size={16} /> Bekijk PDF
              </button>
              <button type="button" className="mobile-primary-button" onClick={() => navigate(`/projecten/${projectId}/lassen/nieuw`)}>
                <Plus size={16} /> Nieuwe las
              </button>
            </div>
            <div className="mobile-action-grid">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <button key={action.label} type="button" className={`mobile-action-card mobile-action-card-${action.color}`} onClick={() => navigate(action.to)}>
                    <Icon size={18} />
                    <span>{action.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
      </MobilePageScaffold>

      <Modal open={editOpen} onClose={() => { setEditOpen(false); setEditError(null); }} title="Project wijzigen" size="large">
        <div className="mobile-form-card" style={{ boxShadow: 'none', border: '0', padding: 0 }}>
          {editError ? <div className="mobile-inline-alert is-error">{editError}</div> : null}
          <label className="mobile-form-field"><span>Projectnaam</span><input value={form.name} onChange={(event) => patch('name', event.target.value)} placeholder="Bijv. Magazijn" /></label>
          <label className="mobile-form-field"><span>Projectnummer</span><input value={form.projectnummer} onChange={(event) => patch('projectnummer', event.target.value)} placeholder="Bijv. 500" /></label>
          <label className="mobile-form-field">
            <span>Opdrachtgever</span>
            <input list="project360-client-suggestions" value={form.client_name} onChange={(event) => patch('client_name', event.target.value)} placeholder="Voer opdrachtgever in" />
            <datalist id="project360-client-suggestions">
              {clientOptions.map((option) => <option key={option} value={option} />)}
            </datalist>
          </label>
          <label className="mobile-form-field mobile-select-field">
            <span>Executieklasse</span>
            <select value={form.execution_class} onChange={(event) => patch('execution_class', event.target.value)}>
              {executionClasses.map((exc) => <option key={exc} value={exc}>{exc}</option>)}
            </select>
          </label>
          <label className="mobile-form-field mobile-select-field">
            <span>Inspectietemplate</span>
            <select value={form.inspection_template_id || ''} onChange={(event) => patch('inspection_template_id', event.target.value)}>
              <option value="">Automatisch volgens EXC</option>
              {filteredTemplates.map((item) => (
                <option key={String(item.id)} value={String(item.id)}>{templateLabel(item)}</option>
              ))}
            </select>
          </label>
          <label className="mobile-form-field"><span>Startdatum</span><input type="date" value={form.start_date || ''} onChange={(event) => patch('start_date', event.target.value)} /></label>
          <label className="mobile-form-field"><span>Einddatum</span><input type="date" value={form.end_date || ''} onChange={(event) => patch('end_date', event.target.value)} /></label>
          <div className="mobile-inline-actions stack-on-mobile">
            <button type="button" className="mobile-secondary-button" onClick={() => { setEditOpen(false); setEditError(null); setForm(buildProjectForm(project)); }}>Annuleren</button>
            <button type="button" className="mobile-primary-button" onClick={handleSaveProject} disabled={saving || !canSave}>{saving ? 'Opslaan…' : 'Project wijzigen'}</button>
          </div>
        </div>
      </Modal>
    </>
  );
}

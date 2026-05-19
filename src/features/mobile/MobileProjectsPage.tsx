import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleAlert, Pencil, Plus, Search, ShieldCheck, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { deleteProject, getProjectWelds, getProjects } from '@/api/projects';
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { APP_REFRESH_EVENT, formatValue, normalizeApiError, normalizeWeldStatus, projectCode, projectExecutionClass, projectTitle, weldStatusLabel } from '@/features/mobile/mobile-utils';
import type { Project, Weld } from '@/types/domain';

type ProjectRuntimeStatus = {
  status: 'conform' | 'in_control' | 'not_conform' | 'open';
  label: string;
  toneClass: string;
  countLabel: string;
};

type ProjectStatusMap = Record<string, ProjectRuntimeStatus>;

function weldRuntimeStatus(weld: Weld) {
  return normalizeWeldStatus(
    (weld as Record<string, unknown>).inspection_status
    || (weld as Record<string, unknown>).overall_status
    || (weld as Record<string, unknown>).overall_result
    || weld.result
    || weld.status
    || (weld as Record<string, unknown>).vt_status
    || (weld as Record<string, unknown>).ndo_status,
  );
}

function deriveProjectStatus(welds: Weld[] | undefined): ProjectRuntimeStatus {
  const rows = Array.isArray(welds) ? welds : [];
  const total = rows.length;
  if (!total) {
    return { status: 'open', label: 'In control', toneClass: 'mobile-pill-info', countLabel: '0 lassen' };
  }
  const statuses = rows.map(weldRuntimeStatus);
  const nonCompliant = statuses.filter((status) => status === 'not_conform').length;
  const compliant = statuses.filter((status) => status === 'conform').length;
  const inControl = statuses.filter((status) => status === 'in_control' || status === 'open' || !status).length;
  if (nonCompliant > 0) {
    return { status: 'not_conform', label: 'Non-compliant', toneClass: 'mobile-pill-danger', countLabel: `${nonCompliant}/${total} aandacht` };
  }
  if (compliant === total) {
    return { status: 'conform', label: 'Compliant', toneClass: 'mobile-pill-success', countLabel: `${compliant}/${total} compliant` };
  }
  return { status: 'in_control', label: 'In control', toneClass: 'mobile-pill-info', countLabel: `${compliant}/${total} compliant` };
}

function statusIcon(status: ProjectRuntimeStatus['status']) {
  if (status === 'conform') return <CheckCircle2 size={14} />;
  if (status === 'not_conform') return <CircleAlert size={14} />;
  return <ShieldCheck size={14} />;
}

export function MobileProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectStatuses, setProjectStatuses] = useState<ProjectStatusMap>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadProjectStatuses = useCallback(async (rows: Project[]) => {
    const entries = await Promise.all(rows.map(async (project) => {
      const id = String(project.id);
      try {
        const response = await getProjectWelds(id, { page: 1, limit: 100 });
        return [id, deriveProjectStatus(response.items || [])] as const;
      } catch {
        const fallback = normalizeWeldStatus((project as Record<string, unknown>).status);
        return [id, deriveProjectStatus([{ status: fallback } as Weld])] as const;
      }
    }));
    setProjectStatuses(Object.fromEntries(entries));
  }, []);

  const loadProjects = useCallback((background = false) => {
    let active = true;
    if (background) setRefreshing(true);
    else setLoading(true);
    getProjects({ page: 1, limit: 50 })
      .then((response) => {
        if (!active) return;
        const rows = Array.isArray(response?.items) ? response.items : [];
        setProjects(rows);
        setError(null);
        void loadProjectStatuses(rows);
      })
      .catch((err) => {
        if (!active) return;
        setError(normalizeApiError(err, 'Projecten konden niet worden geladen.'));
      })
      .finally(() => {
        if (!active) return;
        if (background) setRefreshing(false);
        else setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadProjectStatuses]);

  useEffect(() => loadProjects(false), [loadProjects]);

  useEffect(() => {
    const reload = () => loadProjects(true);
    window.addEventListener(APP_REFRESH_EVENT, reload as EventListener);
    return () => {
      window.removeEventListener(APP_REFRESH_EVENT, reload as EventListener);
    };
  }, [loadProjects]);

  async function handleDeleteProject() {
    if (!projectToDelete) return;
    const id = String(projectToDelete.id);
    setDeletingId(id);
    try {
      await deleteProject(id);
      setProjects((current) => current.filter((p) => String(p.id) !== id));
      setProjectStatuses((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setProjectToDelete(null);
    } catch (err) {
      setError(normalizeApiError(err, 'Project kon niet worden verwijderd.'));
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return projects;
    return projects.filter((project) => JSON.stringify(project).toLowerCase().includes(needle));
  }, [projects, search]);

  return (
    <MobilePageScaffold
      title="Projecten"
      subtitle="Project overzicht"
      rightSlot={
        <button className="mobile-icon-button" type="button" aria-label="Nieuw project" onClick={() => navigate('/projecten/nieuw')}>
          <Plus size={18} />
        </button>
      }
    >
      <div className="mobile-inline-actions" style={{ marginBottom: 16 }}>
        <button type="button" className="mobile-primary-button" onClick={() => navigate('/projecten/nieuw')}>
          <Plus size={16} /> Project aanmaken
        </button>
      </div>

      <div className="mobile-toolbar-card compact-project-toolbar">
        <label className="mobile-search-shell">
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoeken" />
        </label>
      </div>
      {loading ? <div className="mobile-state-card">Projecten laden…</div> : null}
      {error ? <div className="mobile-inline-alert is-error">{error}</div> : null}
      {!loading && !error ? (
        <div className="mobile-list-stack compact-project-list" aria-busy={refreshing}>
          {filtered.map((project) => {
            const runtimeStatus = projectStatuses[String(project.id)] || deriveProjectStatus(undefined);
            return (
            <div key={String(project.id)} className="mobile-list-card compact-project-card">
              <div
                className="mobile-list-card-head compact-project-card-head"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/projecten/${project.id}/overzicht`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/projecten/${project.id}/overzicht`)}
                style={{ cursor: 'pointer' }}
              >
                <div>
                  <strong>{projectTitle(project)}</strong>
                  <span className="mobile-list-card-subtitle">{projectCode(project)}</span>
                </div>
                <span className="mobile-list-card-link">Filters <SlidersHorizontal size={14} /></span>
              </div>
              <div
                className="compact-project-meta"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/projecten/${project.id}/overzicht`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/projecten/${project.id}/overzicht`)}
                style={{ cursor: 'pointer' }}
              >
                {formatValue(project.client_name || project.opdrachtgever, 'Geen opdrachtgever')}
              </div>
              <div className="compact-project-bottom" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span
                    className="mobile-pill mobile-pill-neutral"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/projecten/${project.id}/overzicht`)}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/projecten/${project.id}/overzicht`)}
                    style={{ cursor: 'pointer' }}
                  >
                    {projectExecutionClass(project)}
                  </span>
                  <span
                    className={`mobile-pill ${runtimeStatus.toneClass}`}
                    title={`Projectstatus uit onderliggende lassen/inspecties: ${runtimeStatus.countLabel}`}
                    aria-label={`Projectstatus ${runtimeStatus.label}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    {statusIcon(runtimeStatus.status)} {runtimeStatus.label}
                  </span>
                  <span className="mobile-list-card-subtitle" style={{ fontSize: 12 }}>{runtimeStatus.countLabel}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    className="mobile-icon-ghost-button"
                    style={{ color: '#1d4ed8', padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    onClick={(e) => { e.stopPropagation(); navigate(`/projecten/${project.id}/bewerken`); }}
                    aria-label={`Bewerk ${projectTitle(project)}`}
                  >
                    <Pencil size={14} /> Bewerken
                  </button>
                  <button
                    type="button"
                    className="mobile-icon-ghost-button"
                    style={{ color: '#dc2626', padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    onClick={(e) => { e.stopPropagation(); setProjectToDelete(project); }}
                    disabled={deletingId === String(project.id)}
                    aria-label={`Verwijder ${projectTitle(project)}`}
                  >
                    <Trash2 size={14} /> Verwijderen
                  </button>
                </div>
              </div>
            </div>
            );
          })}
          {!filtered.length ? (
            <div className="mobile-state-card">
              Geen projecten gevonden.
              <div className="mobile-inline-actions">
                <button type="button" className="mobile-primary-button" onClick={() => navigate('/projecten/nieuw')}>Project aanmaken</button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      <ConfirmDialog
        open={Boolean(projectToDelete)}
        title="Project verwijderen"
        description={`Weet je zeker dat je "${projectToDelete ? projectTitle(projectToDelete) : ''}" wilt verwijderen? Alle gekoppelde lassen, inspecties en documenten worden ook verwijderd. Deze actie kan niet ongedaan worden gemaakt.`}
        confirmLabel="Ja, verwijder project"
        cancelLabel="Annuleren"
        danger
        onConfirm={handleDeleteProject}
        onClose={() => setProjectToDelete(null)}
      />
    </MobilePageScaffold>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { deleteProject, getProjects } from '@/api/projects';
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { APP_REFRESH_EVENT, formatValue, normalizeApiError, projectCode, projectExecutionClass, projectTitle } from '@/features/mobile/mobile-utils';
import type { Project } from '@/types/domain';

export function MobileProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadProjects = useCallback((background = false) => {
    let active = true;
    if (background) setRefreshing(true);
    else setLoading(true);
    getProjects({ page: 1, limit: 50 })
      .then((response) => {
        if (!active) return;
        setProjects(Array.isArray(response?.items) ? response.items : []);
        setError(null);
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
  }, []);

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
          {filtered.map((project) => (
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
          ))}
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

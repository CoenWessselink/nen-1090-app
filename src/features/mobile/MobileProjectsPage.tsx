import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getProjects } from '@/api/projects';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { APP_REFRESH_EVENT, formatValue, normalizeApiError, projectCode, projectExecutionClass, projectTitle } from '@/features/mobile/mobile-utils';
import type { Project } from '@/types/domain';

export function MobileProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(() => {
    let active = true;
    setLoading(true);
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
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => loadProjects(), [loadProjects]);

  useEffect(() => {
    const reload = () => loadProjects();
    window.addEventListener(APP_REFRESH_EVENT, reload as EventListener);
    window.addEventListener('focus', reload);
    return () => {
      window.removeEventListener(APP_REFRESH_EVENT, reload as EventListener);
      window.removeEventListener('focus', reload);
    };
  }, [loadProjects]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return projects;
    return projects.filter((project) => JSON.stringify(project).toLowerCase().includes(needle));
  }, [projects, search]);

  return (
    <MobilePageScaffold
      title="Projecten"
      subtitle="Project 360"
      rightSlot={
        <button className="mobile-icon-button" type="button" aria-label="Nieuw project" onClick={() => navigate('/projecten/nieuw')}>
          <Plus size={18} />
        </button>
      }
    >
      <div className="mobile-toolbar-card compact-project-toolbar">
        <label className="mobile-search-shell">
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" />
        </label>
      </div>
      {loading ? <div className="mobile-state-card">Projecten laden…</div> : null}
      {error ? <div className="mobile-inline-alert is-error">{error}</div> : null}
      {!loading && !error ? (
        <div className="mobile-list-stack compact-project-list">
          {filtered.map((project) => (
            <button key={String(project.id)} type="button" className="mobile-list-card compact-project-card" onClick={() => navigate(`/projecten/${project.id}/overzicht`)}>
              <div className="mobile-list-card-head compact-project-card-head">
                <div>
                  <strong>{projectTitle(project)}</strong>
                  <span className="mobile-list-card-subtitle">{projectCode(project)}</span>
                </div>
                <span className="mobile-list-card-link">Filters <SlidersHorizontal size={14} /></span>
              </div>
              <div className="compact-project-meta">{formatValue(project.client_name || project.opdrachtgever, 'Geen opdrachtgever')}</div>
              <div className="compact-project-bottom">
                <span className="mobile-pill mobile-pill-neutral">{projectExecutionClass(project)}</span>
              </div>
            </button>
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
    </MobilePageScaffold>
  );
}

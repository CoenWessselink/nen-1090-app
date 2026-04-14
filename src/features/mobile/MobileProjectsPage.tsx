import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getProjects } from '@/api/projects';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { formatValue, projectCode, projectTitle } from '@/features/mobile/mobile-utils';
import type { Project } from '@/types/domain';

export function MobileProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
        setError(err instanceof Error ? err.message : 'Projecten konden niet worden geladen.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return projects;
    return projects.filter((project) => JSON.stringify(project).toLowerCase().includes(needle));
  }, [projects, search]);

  return (
    <MobilePageScaffold title="Project 360" subtitle="Projecten">
      <div className="mobile-toolbar-card">
        <label className="mobile-search-shell">
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" />
        </label>
      </div>
      {loading ? <div className="mobile-state-card">Projecten laden…</div> : null}
      {error ? <div className="mobile-state-card mobile-state-card-error">{error}</div> : null}
      {!loading && !error ? (
        <div className="mobile-list-stack">
          {filtered.map((project) => (
            <button key={String(project.id)} type="button" className="mobile-list-card" onClick={() => navigate(`/projecten/${project.id}/overzicht`)}>
              <div className="mobile-list-card-head">
                <strong>{projectTitle(project)}</strong>
                <span className="mobile-list-card-link">Filters <SlidersHorizontal size={14} /></span>
              </div>
              <span className="mobile-list-card-subtitle">{projectCode(project)}</span>
              <span className="mobile-list-card-meta">{formatValue(project.client_name || project.opdrachtgever, 'Geen opdrachtgever')}</span>
            </button>
          ))}
          {!filtered.length ? <div className="mobile-state-card">Geen projecten gevonden.</div> : null}
        </div>
      ) : null}
    </MobilePageScaffold>
  );
}

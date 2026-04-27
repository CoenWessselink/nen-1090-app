import { useMemo, useState } from 'react';
import { FolderKanban, Search, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { LoadingState } from '@/components/feedback/LoadingState';
import { useProjects } from '@/hooks/useProjects';
import { useProjectContext } from '@/context/ProjectContext';

function targetPathForSelection(pathname: string, projectId: string) {
  if (pathname.includes('/ce-dossier')) return `/projecten/${projectId}/ce-dossier`;
  if (pathname.includes('/welds') || pathname.includes('/lascontrole')) return `/projecten/${projectId}/lassen`;
  if (pathname.includes('/projecten/')) return `/projecten/${projectId}/overzicht`;
  if (pathname.includes('/projecten')) return `/projecten/${projectId}/overzicht`;
  return '';
}

export function ProjectScopePicker({ description = 'Selecteer een projectcontext voor project-scoped schermen.' }: { description?: string }) {
  const { activeProject, projectLabel, hasProject, setProject, clearProject } = useProjectContext();
  const [search, setSearch] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const projectsQuery = useProjects({ page: 1, limit: 12, search: search || undefined, sort: 'projectnummer', direction: 'asc' });

  const rows = useMemo(() => projectsQuery.data?.items || [], [projectsQuery.data]);

  return (
    <Card>
      <div className="section-title-row">
        <h3><FolderKanban size={18} /> Projectscope</h3>
        {hasProject ? <Button variant="secondary" onClick={() => { clearProject(); navigate('/projecten'); }}><X size={16} /> Wis project</Button> : null}
      </div>
      <div className="list-subtle" style={{ marginBottom: 12 }}>{description}</div>
      {hasProject ? <InlineMessage tone="success">{`Actief project: ${projectLabel}`}</InlineMessage> : <InlineMessage tone="danger">Nog geen project geselecteerd. Kies hieronder een project om documenten, welds en CE-dossier project-scoped te openen.</InlineMessage>}
      <div className="search-shell inline-search-shell" style={{ marginTop: 12 }}>
        <Search size={16} />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoek project op nummer, naam of opdrachtgever" />
      </div>
      {projectsQuery.isLoading ? <LoadingState label="Projecten laden..." /> : null}
      {!projectsQuery.isLoading ? (
        <div className="list-stack compact-list" style={{ marginTop: 12 }}>
          {rows.slice(0, 6).map((project) => {
            const selected = String(activeProject?.id) === String(project.id);
            return (
              <div className="list-row" key={String(project.id)}>
                <div>
                  <strong>{String(project.projectnummer || project.name || project.id)}</strong>
                  <div className="list-subtle">{String(project.name || project.omschrijving || '')} {project.client_name || project.opdrachtgever ? `· ${String(project.client_name || project.opdrachtgever)}` : ''}</div>
                </div>
                <div className="row-actions">
                  <Button
                    variant={selected ? 'secondary' : 'primary'}
                    onClick={() => {
                      const id = String(project.id);
                      setProject({ id, name: String(project.name || project.omschrijving || project.client_name || ''), projectnummer: String(project.projectnummer || '') });
                      const target = targetPathForSelection(location.pathname, id);
                      if (target && location.pathname !== target) navigate(target);
                    }}
                  >
                    {selected ? 'Actief' : 'Gebruik dit project'}
                  </Button>
                  <Button variant="secondary" onClick={() => navigate(`/projecten/${String(project.id)}`)}>Open project</Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </Card>
  );
}

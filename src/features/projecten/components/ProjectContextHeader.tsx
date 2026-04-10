import { Card } from '@/components/ui/Card';
import { useProject } from '@/hooks/useProjects';

function textOf(value: unknown, fallback = '—') {
  if (value == null) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}

export function ProjectContextHeader({ projectId }: { projectId: string }) {
  const projectQuery = useProject(projectId);
  const project = projectQuery.data;

  if (!projectId) return null;
  if (projectQuery.isLoading || !project) return null;

  return (
    <Card data-testid="project-context-header">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(160px, 1fr))',
          gap: 12,
          alignItems: 'stretch',
        }}
      >
        <div>
          <div className="list-subtle">Projectnaam</div>
          <strong>{textOf(project.name || project.omschrijving, 'Project')}</strong>
        </div>
        <div>
          <div className="list-subtle">Projectnummer</div>
          <strong>{textOf(project.projectnummer || project.code)}</strong>
        </div>
        <div>
          <div className="list-subtle">Opdrachtgever</div>
          <strong>{textOf(project.client_name || project.opdrachtgever, 'Geen opdrachtgever')}</strong>
        </div>
        <div>
          <div className="list-subtle">Executieklasse</div>
          <strong>{textOf(project.execution_class || project.executieklasse, 'Executieklasse onbekend')}</strong>
        </div>
      </div>
    </Card>
  );
}

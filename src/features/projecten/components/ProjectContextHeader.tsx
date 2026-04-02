import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useProject } from '@/hooks/useProjects';
import { formatDate } from '@/utils/format';
import { useNavigate } from 'react-router-dom';

function textOf(value: unknown, fallback = '—') {
  if (value == null) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}

function toneFromStatus(status?: string) {
  const value = String(status || '').toLowerCase();
  if (['gereed', 'vrijgegeven', 'conform'].includes(value)) return 'success' as const;
  if (['geblokkeerd', 'afgekeurd', 'niet conform'].includes(value)) return 'danger' as const;
  return 'warning' as const;
}

export function ProjectContextHeader({ projectId, title }: { projectId: string; title: string }) {
  const navigate = useNavigate();
  const projectQuery = useProject(projectId);
  const project = projectQuery.data;

  if (!projectId) return null;
  if (projectQuery.isLoading || !project) return null;

  return (
    <Card>
      <div className="detail-hero">
        <div>
          <div className="eyebrow">{title}</div>
          <h3>{textOf(project.projectnummer, textOf(project.name || project.omschrijving, 'Project'))}</h3>
          <div className="list-subtle">
            {textOf(project.client_name || project.opdrachtgever, 'Geen opdrachtgever')} · {textOf(project.execution_class || project.executieklasse, 'Executieklasse onbekend')}
          </div>
        </div>
        <div className="row-actions">
          <Badge tone={toneFromStatus(String(project.status || ''))}>{textOf(project.status, 'Concept')}</Badge>
          <Button variant="secondary" onClick={() => navigate('/projecten')}>Terug naar projecten</Button>
        </div>
      </div>
      <div className="divider" />
      <div className="detail-grid">
        <div><span>Start</span><strong>{formatDate(project.start_date)}</strong></div>
        <div><span>Einde</span><strong>{formatDate(project.end_date)}</strong></div>
        <div><span>Project-ID</span><strong>{textOf(project.id)}</strong></div>
        <div><span>Opdrachtgever</span><strong>{textOf(project.client_name || project.opdrachtgever)}</strong></div>
      </div>
    </Card>
  );
}

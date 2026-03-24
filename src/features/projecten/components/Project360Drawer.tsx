import { useNavigate } from 'react-router-dom';
import { Drawer } from '@/components/overlays/Drawer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { useProjectContext } from '@/context/ProjectContext';
import { useProjectWelds, useProjectInspections } from '@/hooks/useProjects';
import type { Project } from '@/types/domain';

type Props = {
  project: Project | null;
  open: boolean;
  onClose: () => void;
  onMessage: (message: string) => void;
};

type Row = Record<string, unknown>;

function text(value: unknown, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function tone(status: unknown): 'success' | 'danger' | 'neutral' {
  const value = String(status || '').toLowerCase();
  if (['gereed', 'conform', 'goedgekeurd', 'approved', 'resolved'].includes(value)) return 'success';
  if (['afgekeurd', 'open', 'pending', 'rejected'].includes(value)) return 'danger';
  return 'neutral';
}

export function Project360Drawer({ project, open, onClose, onMessage }: Props) {
  const navigate = useNavigate();
  const { setProject } = useProjectContext();
  const projectId = project?.id;

  const weldsQuery = useProjectWelds(projectId, { page: 1, limit: 12, sort: 'updated_at', direction: 'desc' });
  const inspectionsQuery = useProjectInspections(projectId, { page: 1, limit: 12, sort: 'updated_at', direction: 'desc' });

  const weldRows = (weldsQuery.data?.items || []) as Row[];
  const inspectionRows = (inspectionsQuery.data?.items || []) as Row[];

  return (
    <Drawer open={open} onClose={onClose} title="Project 360°">
      {project ? (
        <div className="detail-stack">
          <div className="detail-hero">
            <div>
              <h3>{text(project.name || project.omschrijving || project.projectnummer || project.id)}</h3>
              <div className="list-subtle">
                {text(project.client_name || project.opdrachtgever, 'Geen opdrachtgever')} · {text(project.projectnummer || project.id)}
              </div>
            </div>
            <Badge tone={tone(project.status)}>{text(project.status, 'Onbekend')}</Badge>
          </div>

          <div className="toolbar-cluster">
            <Button
              type="button"
              onClick={() => {
                const id = String(project.id);
                setProject({
                  id,
                  name: text(project.name || project.omschrijving || project.client_name, ''),
                  projectnummer: text(project.projectnummer, ''),
                });
                onMessage(`Projectscope actief: ${text(project.projectnummer || project.id)}`);
              }}
            >
              Gebruik dit project
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                onClose();
                navigate(`/projecten/${String(project.id)}/welds`);
              }}
            >
              Open lascontrole
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                onClose();
                navigate(`/projecten/${String(project.id)}/ce-dossier`);
              }}
            >
              Open CE dossier
            </Button>
          </div>

          <div className="card-grid cols-4">
            <Card><div className="metric-card"><span>Projectnummer</span><strong>{text(project.projectnummer || project.id)}</strong></div></Card>
            <Card><div className="metric-card"><span>Status</span><strong>{text(project.status, 'Onbekend')}</strong></div></Card>
            <Card><div className="metric-card"><span>Lassen</span><strong>{String(weldRows.length)}</strong></div></Card>
            <Card><div className="metric-card"><span>Inspecties</span><strong>{String(inspectionRows.length)}</strong></div></Card>
          </div>

          <div className="content-grid-2">
            <Card>
              <div className="section-title-row"><h3>Projectgegevens</h3></div>
              <div className="detail-grid">
                <div><span>Naam</span><strong>{text(project.name || project.omschrijving, '—')}</strong></div>
                <div><span>Opdrachtgever</span><strong>{text(project.client_name || project.opdrachtgever, '—')}</strong></div>
                <div><span>Executieklasse</span><strong>{text(project.execution_class || project.executieklasse, '—')}</strong></div>
                <div><span>Start</span><strong>{text(project.start_date, '—')}</strong></div>
                <div><span>Eind</span><strong>{text(project.end_date, '—')}</strong></div>
                <div><span>ID</span><strong>{text(project.id)}</strong></div>
              </div>
            </Card>

            <Card>
              <div className="section-title-row"><h3>Recente lassen</h3></div>
              {weldsQuery.isLoading ? <LoadingState label="Lassen laden..." /> : null}
              {!weldsQuery.isLoading && !weldRows.length ? (
                <EmptyState title="Geen lassen" description="Voor dit project zijn nog geen lassen zichtbaar via de huidige API." />
              ) : (
                <div className="list-stack compact-list">
                  {weldRows.map((row, index) => (
                    <div key={text(row.id, String(index))} className="list-row">
                      <div>
                        <strong>{text(row.weld_number || row.weld_no || row.id, `Las ${index + 1}`)}</strong>
                        <div className="list-subtle">{text(row.location, 'Locatie onbekend')}</div>
                      </div>
                      <Badge tone={tone(row.status)}>{text(row.status, 'Onbekend')}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card>
            <div className="section-title-row"><h3>Recente inspecties</h3></div>
            {inspectionsQuery.isLoading ? <LoadingState label="Inspecties laden..." /> : null}
            {!inspectionsQuery.isLoading && !inspectionRows.length ? (
              <EmptyState title="Geen inspecties" description="Voor dit project zijn nog geen inspecties zichtbaar via de huidige API." />
            ) : (
              <div className="list-stack compact-list">
                {inspectionRows.map((row, index) => (
                  <div key={text(row.id, String(index))} className="list-row">
                    <div>
                      <strong>{text(row.id, `Inspectie ${index + 1}`)}</strong>
                      <div className="list-subtle">{text(row.result || row.status, 'Open')}</div>
                    </div>
                    <Badge tone={tone(row.status || row.result)}>{text(row.status || row.result, 'Open')}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : null}
    </Drawer>
  );
}

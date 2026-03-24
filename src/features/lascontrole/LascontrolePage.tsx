import { ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProjectScopePicker } from '@/components/project-scope/ProjectScopePicker';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { LoadingState } from '@/components/feedback/LoadingState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useProjectContext } from '@/context/ProjectContext';
import { useWelds } from '@/hooks/useWelds';
import { useInspections } from '@/hooks/useInspections';
import { useDefects } from '@/hooks/useDefects';

type Row = Record<string, unknown>;

function rowsFrom<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function tone(status: unknown): 'success' | 'danger' | 'neutral' {
  const value = String(status || '').toLowerCase();
  if (['conform', 'gereed', 'goedgekeurd', 'approved', 'resolved', 'closed'].includes(value)) return 'success';
  if (['afgekeurd', 'open', 'defect', 'rejected', 'pending'].includes(value)) return 'danger';
  return 'neutral';
}

export function LascontrolePage() {
  const { projectId, hasProject, projectLabel } = useProjectContext();

  const weldsQuery = useWelds(
    {
      page: 1,
      limit: 100,
      sort: 'updated_at',
      direction: 'desc',
      project_id: projectId || undefined,
    },
    true,
  );

  const inspectionsQuery = useInspections(
    {
      page: 1,
      limit: 100,
      sort: 'updated_at',
      direction: 'desc',
      project_id: projectId || undefined,
    },
    true,
  );

  const defectsQuery = useDefects(
    {
      page: 1,
      limit: 100,
      sort: 'updated_at',
      direction: 'desc',
      project_id: projectId || undefined,
    },
    true,
  );

  const weldRows = rowsFrom<Row>(weldsQuery.data?.items as Row[] | undefined);
  const inspectionRows = rowsFrom<Row>(inspectionsQuery.data?.items as Row[] | undefined);
  const defectRows = rowsFrom<Row>(defectsQuery.data?.items as Row[] | undefined);

  const activeWelds = weldRows.filter((row) => !['gereed', 'conform', 'approved', 'resolved'].includes(String(row.status || '').toLowerCase())).length;
  const defectCount = defectRows.length;

  return (
    <div className="page-stack">
      <PageHeader
        title="Lascontrole"
        description="Project-scoped overzicht van lassen, inspecties en defecten op basis van de huidige live API."
      />

      {hasProject ? (
        <InlineMessage tone="success">{`Actief project: ${projectLabel}`}</InlineMessage>
      ) : (
        <InlineMessage tone="danger">
          Nog geen project geselecteerd. Kies hieronder een project om lassen, inspecties en defecten zichtbaar te maken.
        </InlineMessage>
      )}

      <ProjectScopePicker description="Lascontrole gebruikt de huidige API-contracten voor /welds, /inspections en /weld-defects." />

      <div className="card-grid cols-4">
        <Card>
          <div className="metric-card">
            <span>Open inspecties</span>
            <strong>{inspectionRows.length}</strong>
          </div>
        </Card>
        <Card>
          <div className="metric-card">
            <span>Actieve lassen</span>
            <strong>{activeWelds}</strong>
          </div>
        </Card>
        <Card>
          <div className="metric-card">
            <span>Lassen met defecten</span>
            <strong>{defectCount}</strong>
          </div>
        </Card>
        <Card>
          <div className="metric-card">
            <span>Totaal lassen</span>
            <strong>{weldRows.length}</strong>
          </div>
        </Card>
      </div>

      {weldsQuery.isLoading || inspectionsQuery.isLoading || defectsQuery.isLoading ? (
        <LoadingState label="Lascontrolegegevens laden..." />
      ) : null}

      <div className="content-grid-3">
        <Card>
          <div className="section-title-row">
            <h3><ShieldCheck size={18} /> Lassen</h3>
            <Badge tone="neutral">{String(weldRows.length)}</Badge>
          </div>
          {!weldRows.length ? (
            <EmptyState
              title="Geen lassen zichtbaar"
              description="Er zijn nog geen lassen gevonden voor het actieve project of de live API retourneert nog geen records."
            />
          ) : (
            <div className="list-stack compact-list">
              {weldRows.map((row, index) => (
                <div key={text(row.id, String(index))} className="list-row">
                  <div>
                    <strong>{text(row.weld_number || row.weld_no || row.id, `Las ${index + 1}`)}</strong>
                    <div className="list-subtle">
                      {text(row.location, 'Locatie onbekend')} · {text(row.welder_name || row.welders, 'Lasser onbekend')}
                    </div>
                  </div>
                  <Badge tone={tone(row.status)}>{text(row.status, 'Onbekend')}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="section-title-row">
            <h3>Inspecties</h3>
            <Badge tone="neutral">{String(inspectionRows.length)}</Badge>
          </div>
          {!inspectionRows.length ? (
            <EmptyState
              title="Geen inspecties zichtbaar"
              description="De live API retourneerde nog geen inspecties voor het actieve project."
            />
          ) : (
            <div className="list-stack compact-list">
              {inspectionRows.map((row, index) => (
                <div key={text(row.id, String(index))} className="list-row">
                  <div>
                    <strong>{text(row.id, `Inspectie ${index + 1}`)}</strong>
                    <div className="list-subtle">
                      {text(row.result || row.status, 'Resultaat onbekend')} · {text(row.inspector_name || row.inspector, 'Inspecteur onbekend')}
                    </div>
                  </div>
                  <Badge tone={tone(row.status || row.result)}>{text(row.status || row.result, 'Open')}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="section-title-row">
            <h3>Defecten</h3>
            <Badge tone="neutral">{String(defectRows.length)}</Badge>
          </div>
          {!defectRows.length ? (
            <EmptyState
              title="Geen defecten zichtbaar"
              description="De live API retourneerde nog geen defecten voor het actieve project."
            />
          ) : (
            <div className="list-stack compact-list">
              {defectRows.map((row, index) => (
                <div key={text(row.id, String(index))} className="list-row">
                  <div>
                    <strong>{text(row.code || row.id, `Defect ${index + 1}`)}</strong>
                    <div className="list-subtle">
                      {text(row.description || row.reason, 'Geen omschrijving')} · {text(row.weld_number || row.weld_id, 'Las onbekend')}
                    </div>
                  </div>
                  <Badge tone={tone(row.status)}>{text(row.status, 'Open')}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

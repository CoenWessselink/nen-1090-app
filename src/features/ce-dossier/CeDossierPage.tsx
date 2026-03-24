import { useMemo } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { LoadingState } from '@/components/feedback/LoadingState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ProjectScopePicker } from '@/components/project-scope/ProjectScopePicker';
import { useProjectContext } from '@/context/ProjectContext';
import { useCeDossier } from '@/hooks/useCompliance';

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export function CeDossierPage() {
  const { projectId, hasProject } = useProjectContext();
  const ceQuery = useCeDossier(projectId);

  const data = (ceQuery.data || {}) as Record<string, unknown>;
  const assemblies = useMemo(() => asArray(data.assemblies), [data]);
  const welds = useMemo(() => asArray(data.welds), [data]);
  const inspections = useMemo(() => asArray(data.inspections), [data]);
  const photos = useMemo(() => asArray(data.photos), [data]);
  const counts = (data.counts || {}) as Record<string, unknown>;

  return (
    <div className="page-stack">
      <PageHeader title="CE Dossier" description="Vereenvoudigd CE-overzicht op basis van de huidige live API (/api/v1/ce_export/{project_id})." />

      {!hasProject ? (
        <InlineMessage tone="danger">Selecteer eerst een project om het CE-overzicht te laden.</InlineMessage>
      ) : null}

      <ProjectScopePicker description="Deze versie gebruikt uitsluitend het live endpoint /api/v1/ce_export/{project_id}. Niet-beschikbare compliance- en exportjob-endpoints zijn uitgeschakeld." />

      <Card>
        <div className="toolbar-cluster">
          <Button type="button" variant="secondary" onClick={() => ceQuery.refetch()} disabled={!projectId || ceQuery.isFetching}>
            <RefreshCcw size={16} /> Herladen
          </Button>
        </div>
      </Card>

      {ceQuery.isLoading ? <LoadingState label="CE-overzicht laden..." /> : null}

      {ceQuery.isError ? (
        <InlineMessage tone="danger">
          <span className="inline-flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>Het live endpoint <strong>/api/v1/ce_export/&#123;project_id&#125;</strong> geeft momenteel een fout of bestaat niet op de live API.</span>
          </span>
        </InlineMessage>
      ) : null}

      {!ceQuery.isLoading && !ceQuery.isError ? (
        <>
          <div className="card-grid cols-4">
            <Card><div className="metric-card"><span>Dossier gereed</span><strong>{data.ready_for_export ? 'Ja' : 'Nee'}</strong></div></Card>
            <Card><div className="metric-card"><span>Assemblies</span><strong>{Number(counts.assemblies || assemblies.length || 0)}</strong></div></Card>
            <Card><div className="metric-card"><span>Lassen</span><strong>{Number(counts.welds || welds.length || 0)}</strong></div></Card>
            <Card><div className="metric-card"><span>Inspecties</span><strong>{Number(counts.inspections || inspections.length || 0)}</strong></div></Card>
          </div>

          <div className="content-grid-2">
            <Card>
              <div className="section-title-row"><h3>Project</h3></div>
              {data.project ? <pre className="code-block">{JSON.stringify(data.project, null, 2)}</pre> : <EmptyState title="Geen projectinformatie" description="De live API retourneerde geen project-object." />}
            </Card>
            <Card>
              <div className="section-title-row"><h3>Foto’s</h3></div>
              {photos.length ? <pre className="code-block">{JSON.stringify(photos, null, 2)}</pre> : <EmptyState title="Geen foto’s" description="Geen foto’s aanwezig in de live CE-exportresponse." />}
            </Card>
          </div>

          <div className="content-grid-2">
            <Card>
              <div className="section-title-row"><h3>Assemblies</h3></div>
              {assemblies.length ? <pre className="code-block">{JSON.stringify(assemblies, null, 2)}</pre> : <EmptyState title="Geen assemblies" description="Geen assemblies aanwezig in de live CE-exportresponse." />}
            </Card>
            <Card>
              <div className="section-title-row"><h3>Lassen</h3></div>
              {welds.length ? <pre className="code-block">{JSON.stringify(welds, null, 2)}</pre> : <EmptyState title="Geen lassen" description="Geen lassen aanwezig in de live CE-exportresponse." />}
            </Card>
          </div>

          <Card>
            <div className="section-title-row"><h3>Inspecties</h3></div>
            {inspections.length ? <pre className="code-block">{JSON.stringify(inspections, null, 2)}</pre> : <EmptyState title="Geen inspecties" description="Geen inspecties aanwezig in de live CE-exportresponse." />}
          </Card>
        </>
      ) : null}
    </div>
  );
}

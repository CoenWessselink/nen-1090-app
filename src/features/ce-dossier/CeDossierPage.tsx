import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ProjectScopePicker } from '@/components/project-scope/ProjectScopePicker';
import { useProjectContext } from '@/context/ProjectContext';
import { useCeDossier } from '@/hooks/useCompliance';

export function CeDossierPage() {
  const { projectId, hasProject } = useProjectContext();
  const ceQuery = useCeDossier(projectId);

  return (
    <div className="page-stack">
      <PageHeader title="CE Dossier" description="Vereenvoudigd CE-overzicht op basis van de huidige live API." />

      {!hasProject ? <InlineMessage tone="danger">Selecteer eerst een project om het CE-overzicht te laden.</InlineMessage> : null}

      <ProjectScopePicker description="Deze versie gebruikt uitsluitend het live endpoint /api/v1/ce_export/{project_id}." />

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
          <AlertTriangle size={16} /> Het live endpoint /api/v1/ce_export/{{project_id}} geeft momenteel een fout of bestaat niet op de live API.
        </InlineMessage>
      ) : null}

      {!ceQuery.isLoading && !ceQuery.isError ? (
        <Card>
          <pre className="code-block">{JSON.stringify(ceQuery.data || {}, null, 2)}</pre>
        </Card>
      ) : null}
    </div>
  );
}

export default CeDossierPage;

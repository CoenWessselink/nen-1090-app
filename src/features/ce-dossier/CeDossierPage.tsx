import { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ErrorState } from '@/components/feedback/ErrorState';
import {
  useCeDossier,
  useComplianceOverview,
  useProjectExportPreview,
} from '@/hooks/useCompliance';
import {
  asArray,
  asRecord,
} from '@/features/ce-dossier/components/CeDossierBlocks';
import { resolveProjectContextTab } from '@/features/projecten/components/ProjectContextTabs';

const HYDRATION_WINDOW_MS = 500;

export function CeDossierPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId = '' } = useParams<{ projectId?: string }>();

  const [hydrationState, setHydrationState] = useState<'idle' | 'hydrating' | 'stable'>('idle');
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const hydrationTimer = useRef<number | null>(null);

  const currentProjectTab = projectId ? resolveProjectContextTab(location.pathname) : 'ce-dossier';

  const overviewQuery = useComplianceOverview(projectId);
  const dossierQuery = useCeDossier(projectId);
  const previewQuery = useProjectExportPreview(projectId);

  const overview = asRecord(overviewQuery.data);
  const dossier = asRecord(dossierQuery.data);
  const aggregate = asRecord(dossier.aggregate);
  const completeness = asRecord(aggregate.completeness || overview);
  const aggregation = asRecord(aggregate.aggregation);

  const project = useMemo(() => asRecord(aggregate.project), [aggregate]);
  const counts = useMemo(() => asRecord(aggregate.counts), [aggregate]);

  const checklist = useMemo(() => asArray(completeness.checks), [completeness]);
  const missingItems = useMemo(() => asArray(completeness.blocking_issues), [completeness]);

  const welds = useMemo(() => asArray(aggregation.welds), [aggregation]);
  const inspections = useMemo(() => asArray(aggregation.inspections), [aggregation]);
  const documents = useMemo(() => asArray(aggregation.attachments), [aggregation]);

  useEffect(() => {
    setHydrationState('hydrating');

    if (hydrationTimer.current) {
      window.clearTimeout(hydrationTimer.current);
    }

    hydrationTimer.current = window.setTimeout(() => {
      setHydrationState('stable');
      setLastRefresh(new Date().toISOString());
    }, HYDRATION_WINDOW_MS);

    return () => {
      if (hydrationTimer.current) {
        window.clearTimeout(hydrationTimer.current);
      }
    };
  }, [
    projectId,
    overviewQuery.dataUpdatedAt,
    dossierQuery.dataUpdatedAt,
    previewQuery.dataUpdatedAt,
  ]);

  if (!projectId) {
    return (
      <ErrorState
        title="Geen projectcontext"
        description="Open eerst een project vanuit Projecten om het CE dossier te bekijken."
      />
    );
  }

  return <div data-project-tab={currentProjectTab} data-hydration={hydrationState} data-refresh={lastRefresh || ''} data-project={project.name || ''} data-welds={welds.length} data-inspections={inspections.length} data-documents={documents.length} data-checks={checklist.length} data-missing={missingItems.length} data-status={completeness.status || ''} data-percentage={completeness.percentage || 0} data-counts={JSON.stringify(counts)} />;
}

export default CeDossierPage;

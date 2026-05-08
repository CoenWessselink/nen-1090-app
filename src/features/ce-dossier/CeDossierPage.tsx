import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { ErrorState } from '@/components/feedback/ErrorState';
import {
  useCeDossier,
  useComplianceOverview,
} from '@/hooks/useCompliance';
import {
  asArray,
  asRecord,
} from '@/features/ce-dossier/components/CeDossierBlocks';
import { resolveProjectContextTab } from '@/features/projecten/components/ProjectContextTabs';

const HYDRATION_WINDOW_MS = 500;

export function CeDossierPage() {
  const location = useLocation();
  const { projectId = '' } = useParams<{ projectId?: string }>();

  const [hydrationState, setHydrationState] = useState<'idle' | 'hydrating' | 'stable'>('idle');
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const hydrationTimer = useRef<number | null>(null);

  const currentProjectTab = projectId
    ? resolveProjectContextTab(location.pathname)
    : 'ce-dossier';

  const overviewQuery = useComplianceOverview(projectId);
  const dossierQuery = useCeDossier(projectId);

  const overview = useMemo(
    () => asRecord(overviewQuery.data),
    [overviewQuery.data],
  );

  const dossier = useMemo(
    () => asRecord(dossierQuery.data),
    [dossierQuery.data],
  );

  const aggregate = useMemo(
    () => asRecord(dossier.aggregate),
    [dossier],
  );

  const completeness = useMemo(
    () => asRecord(aggregate.completeness || overview),
    [aggregate, overview],
  );

  const project = useMemo(
    () => asRecord(aggregate.project),
    [aggregate],
  );

  const collections = useMemo(
    () => ({
      welds: asArray(aggregate.welds),
      inspections: asArray(aggregate.inspections),
      documents: asArray(aggregate.attachments),
      checks: asArray(completeness.checks),
      missing: asArray(completeness.blocking_issues),
    }),
    [aggregate, completeness],
  );

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
  ]);

  if (!projectId) {
    return (
      <ErrorState
        title="Geen projectcontext"
        description="Open eerst een project vanuit Projecten om het CE dossier te bekijken."
      />
    );
  }

  if (overviewQuery.isError || dossierQuery.isError) {
    return (
      <ErrorState
        title="CE dossier tijdelijk niet beschikbaar"
        description="Het CE dossier kon tijdelijk niet geladen worden. Vernieuw de pagina of probeer het opnieuw."
      />
    );
  }

  return (
    <div
      data-project-tab={currentProjectTab}
      data-hydration={hydrationState}
      data-refresh={lastRefresh || ''}
      data-project={project.name || ''}
      data-welds={collections.welds.length}
      data-inspections={collections.inspections.length}
      data-documents={collections.documents.length}
      data-checks={collections.checks.length}
      data-missing={collections.missing.length}
      data-status={completeness.status || ''}
      data-percentage={completeness.percentage || 0}
    />
  );
}

export default CeDossierPage;

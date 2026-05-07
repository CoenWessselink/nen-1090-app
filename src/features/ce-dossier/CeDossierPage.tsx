import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  useCeDossier,
  useComplianceChecklist,
  useComplianceMissingItems,
  useComplianceOverview,
  useProjectExports,
} from '@/hooks/useCompliance';
import {
  asArray,
  asRecord,
} from '@/features/ce-dossier/components/CeDossierBlocks';
import {
  normalizeExportItems,
} from '@/features/ce-dossier/components/CeExportBlocks';
import { resolveProjectContextTab } from '@/features/projecten/components/ProjectContextTabs';

const CE_PAGE_WINDOW = 25;

export function CeDossierPage() {
  const location = useLocation();
  const { projectId = '' } = useParams<{ projectId?: string }>();

  const [ceSearch, setCeSearch] = useState('');
  const [hydrationState, setHydrationState] = useState<'idle' | 'hydrating' | 'stable'>('idle');
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  const currentProjectTab = projectId ? resolveProjectContextTab(location.pathname) : 'ce-dossier';

  const overviewQuery = useComplianceOverview(projectId);
  const missingItemsQuery = useComplianceMissingItems(projectId);
  const checklistQuery = useComplianceChecklist(projectId);
  const dossierQuery = useCeDossier(projectId);
  const exportsQuery = useProjectExports(projectId);

  const overview = asRecord(overviewQuery.data);
  const dossier = asRecord(dossierQuery.data);

  useEffect(() => {
    setHydrationState('hydrating');
  }, [projectId]);

  useEffect(() => {
    if (
      !overviewQuery.isLoading &&
      !missingItemsQuery.isLoading &&
      !checklistQuery.isLoading &&
      !dossierQuery.isLoading &&
      !exportsQuery.isLoading
    ) {
      setHydrationState('stable');
      setLastRefresh(new Date().toISOString());
    }
  }, [
    overviewQuery.isLoading,
    missingItemsQuery.isLoading,
    checklistQuery.isLoading,
    dossierQuery.isLoading,
    exportsQuery.isLoading,
  ]);

  const checklist = useMemo(() => {
    const explicit = asArray(asRecord(checklistQuery.data).items || asRecord(checklistQuery.data).checklist);
    return explicit.length ? explicit : asArray(dossier.checklist);
  }, [checklistQuery.data, dossier]);

  const missingItems = useMemo(() => {
    const explicit = asArray(asRecord(missingItemsQuery.data).items || asRecord(missingItemsQuery.data).missing_items);
    return explicit.length ? explicit : asArray(dossier.missing_items);
  }, [missingItemsQuery.data, dossier]);

  const exportItems = useMemo(() => normalizeExportItems(exportsQuery.data), [exportsQuery.data]);

  const normalizedCeSearch = ceSearch.trim().toLowerCase();

  const filteredChecklist = useMemo(
    () => checklist.filter((value) => !normalizedCeSearch || JSON.stringify(value).toLowerCase().includes(normalizedCeSearch)),
    [checklist, normalizedCeSearch],
  );

  const filteredMissingItems = useMemo(
    () => missingItems.filter((value) => !normalizedCeSearch || JSON.stringify(value).toLowerCase().includes(normalizedCeSearch)),
    [missingItems, normalizedCeSearch],
  );

  const filteredExportItems = useMemo(
    () => exportItems.filter((value) => !normalizedCeSearch || JSON.stringify(value).toLowerCase().includes(normalizedCeSearch)),
    [exportItems, normalizedCeSearch],
  );

  return (
    <div className="page-stack">
      <PageHeader
        title="CE dossier"
        description={`Hydration ${hydrationState} · Checklist ${filteredChecklist.length} · Missing ${filteredMissingItems.length} · Exports ${filteredExportItems.length}`}
      />
    </div>
  );
}

export default CeDossierPage;

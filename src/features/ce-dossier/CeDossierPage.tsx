import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { RefreshCcw } from 'lucide-react';
import { openDownloadUrl } from '@/utils/download';
import { buildCeDossierFilename, normalizeApiError } from '@/features/mobile/mobile-utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ErrorState } from '@/components/feedback/ErrorState';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { LoadingState } from '@/components/feedback/LoadingState';
import {
  useCeDossier,
  useComplianceChecklist,
  useComplianceMissingItems,
  useComplianceOverview,
  useCreateCeReport,
  useCreateExcelExport,
  useCreatePdfExport,
  useCreateZipExport,
  useDownloadProjectExport,
  useProjectExportManifest,
  useProjectExportPreview,
  useProjectExports,
  useRetryProjectExport,
} from '@/hooks/useCompliance';
import {
  CeChecklistCard,
  CeDataGroupsCard,
  CeDossierStructureCard,
  CeMissingItemsCard,
  CeStatusPanel,
  asArray,
  asRecord,
  asText,
} from '@/features/ce-dossier/components/CeDossierBlocks';
import {
  CeExportActionsCard,
  CeExportHistoryCard,
  CeExportManifestCard,
  normalizeExportItems,
  type CeExportKind,
} from '@/features/ce-dossier/components/CeExportBlocks';
import { CePdfLayoutCard } from '@/features/ce-dossier/components/CePdfBlocks';
import { resolveProjectContextTab } from '@/features/projecten/components/ProjectContextTabs';
import { ProjectTabShell } from '@/features/projecten/components/ProjectTabShell';
import { ProjectKpiActionCard } from '@/features/projecten/components/ProjectKpiActionCard';
import type { ExportJob } from '@/types/domain';

const CE_PAGE_WINDOW = 25;

export function CeDossierPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId = '' } = useParams<{ projectId?: string }>();
  const [message, setMessage] = useState<string | null>(null);
  const [selectedExportId, setSelectedExportId] = useState<string | number | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | number | null>(null);
  const [retryingId, setRetryingId] = useState<string | number | null>(null);
  const [ceSearch, setCeSearch] = useState('');
  const [checklistPage, setChecklistPage] = useState(1);
  const [missingItemsPage, setMissingItemsPage] = useState(1);
  const [exportsPage, setExportsPage] = useState(1);
  const currentProjectTab = projectId ? resolveProjectContextTab(location.pathname) : 'ce-dossier';

  const overviewQuery = useComplianceOverview(projectId);
  const missingItemsQuery = useComplianceMissingItems(projectId);
  const checklistQuery = useComplianceChecklist(projectId);
  const dossierQuery = useCeDossier(projectId);
  const exportsQuery = useProjectExports(projectId);
  const previewQuery = useProjectExportPreview(projectId);

  const createReport = useCreateCeReport(projectId);
  const createPdf = useCreatePdfExport(projectId);
  const createZip = useCreateZipExport(projectId);
  const createExcel = useCreateExcelExport(projectId);
  const downloadExport = useDownloadProjectExport(projectId);
  const retryExport = useRetryProjectExport(projectId);

  const overview = asRecord(overviewQuery.data);
  const dossier = asRecord(dossierQuery.data);
  const project = useMemo(() => asRecord(dossier.project), [dossier]);
  const counts = useMemo(() => asRecord(dossier.counts || overview.counts), [dossier, overview]);

  const checklist = useMemo(() => {
    const explicit = asArray(asRecord(checklistQuery.data).items || asRecord(checklistQuery.data).checklist);
    return explicit.length ? explicit : asArray(dossier.checklist);
  }, [checklistQuery.data, dossier]);

  const missingItems = useMemo(() => {
    const explicit = asArray(asRecord(missingItemsQuery.data).items || asRecord(missingItemsQuery.data).missing_items);
    return explicit.length ? explicit : asArray(dossier.missing_items);
  }, [missingItemsQuery.data, dossier]);

  const assemblies = useMemo(() => asArray(dossier.assemblies), [dossier]);
  const welds = useMemo(() => asArray(dossier.welds), [dossier]);
  const inspections = useMemo(() => asArray(dossier.inspections), [dossier]);
  const documents = useMemo(() => asArray(dossier.documents), [dossier]);
  const photos = useMemo(() => asArray(dossier.photos), [dossier]);

  const preview = useMemo(
    () =>
      asArray(asRecord(previewQuery.data).preview).map((item) => ({
        label: asText((item as Record<string, unknown>).label, 'Onderdeel'),
        value: asText((item as Record<string, unknown>).value, '—'),
      })),
    [previewQuery.data],
  );

  const exportItems = useMemo(() => normalizeExportItems(exportsQuery.data), [exportsQuery.data]);

  const normalizedCeSearch = ceSearch.trim().toLowerCase();
  const filterBySearch = (value: unknown) =>
    !normalizedCeSearch || JSON.stringify(value).toLowerCase().includes(normalizedCeSearch);

  const filteredChecklist = useMemo(() => checklist.filter(filterBySearch), [checklist, normalizedCeSearch]);
  const filteredMissingItems = useMemo(() => missingItems.filter(filterBySearch), [missingItems, normalizedCeSearch]);
  const filteredExportItems = useMemo(() => exportItems.filter(filterBySearch), [exportItems, normalizedCeSearch]);

  const paginatedChecklist = useMemo(() => {
    const start = (checklistPage - 1) * CE_PAGE_WINDOW;
    return filteredChecklist.slice(start, start + CE_PAGE_WINDOW);
  }, [checklistPage, filteredChecklist]);

  const paginatedMissingItems = useMemo(() => {
    const start = (missingItemsPage - 1) * CE_PAGE_WINDOW;
    return filteredMissingItems.slice(start, start + CE_PAGE_WINDOW);
  }, [filteredMissingItems, missingItemsPage]);

  const paginatedExportItems = useMemo(() => {
    const start = (exportsPage - 1) * CE_PAGE_WINDOW;
    return filteredExportItems.slice(start, start + CE_PAGE_WINDOW);
  }, [exportsPage, filteredExportItems]);

  const selectedExport = useMemo(
    () => paginatedExportItems.find((item) => String(item.id) === String(selectedExportId)) || null,
    [paginatedExportItems, selectedExportId],
  );

  const manifestQuery = useProjectExportManifest(projectId, selectedExport?.id);
  const manifest = useMemo(() => {
    const remote = asArray(asRecord(manifestQuery.data).manifest);
    if (remote.length) return remote;
    return [];
  }, [manifestQuery.data]);

  return <div className="page-stack"><PageHeader title="CE dossier" description={`Checklist ${paginatedChecklist.length}/${filteredChecklist.length} · Missing ${paginatedMissingItems.length}/${filteredMissingItems.length} · Exports ${paginatedExportItems.length}/${filteredExportItems.length}`} /></div>;
}

export default CeDossierPage;

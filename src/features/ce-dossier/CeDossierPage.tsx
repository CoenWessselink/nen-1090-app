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

export function CeDossierPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId = '' } = useParams<{ projectId?: string }>();
  const [message, setMessage] = useState<string | null>(null);
  const [selectedExportId, setSelectedExportId] = useState<string | number | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | number | null>(null);
  const [retryingId, setRetryingId] = useState<string | number | null>(null);
  const [ceSearch, setCeSearch] = useState('');
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

  const selectedExport = useMemo(
    () => exportItems.find((item) => String(item.id) === String(selectedExportId)) || null,
    [exportItems, selectedExportId],
  );
  const manifestQuery = useProjectExportManifest(projectId, selectedExport?.id);
  const manifest = useMemo(() => {
    const remote = asArray(asRecord(manifestQuery.data).manifest);
    if (remote.length) return remote;
    return [];
  }, [manifestQuery.data]);

  if (!projectId) {
    return (
      <ErrorState
        title="Geen projectcontext"
        description="Open eerst een project vanuit Projecten om het CE dossier te bekijken."
      />
    );
  }

  const isLoading =
    overviewQuery.isLoading ||
    missingItemsQuery.isLoading ||
    checklistQuery.isLoading ||
    dossierQuery.isLoading;

  const isError =
    overviewQuery.isError ||
    missingItemsQuery.isError ||
    checklistQuery.isError ||
    dossierQuery.isError;

  const routeFromSection = (section: string) => {
    if (section === 'assemblies') return `/projecten/${projectId}/assemblies`;
    if (section === 'welds' || section === 'lassen') return `/projecten/${projectId}/lassen`;
    if (section === 'inspections' || section === 'checklist' || section === 'lascontrole') return `/projecten/${projectId}/lassen`;
    if (section === 'documents' || section === 'photos') return `/projecten/${projectId}/documenten`;
    if (section === 'project') return `/projecten/${projectId}/overzicht`;
    return `/projecten/${projectId}/ce-dossier`;
  };

  const openSection = (section: string) => navigate(routeFromSection(section));

  const runExport = async (kind: CeExportKind) => {
    try {
      const payload =
        kind === 'ce'
          ? await createReport.mutateAsync()
          : kind === 'pdf'
            ? await createPdf.mutateAsync()
            : kind === 'zip'
              ? await createZip.mutateAsync()
              : await createExcel.mutateAsync();

      const source = asRecord(payload);
      const downloadUrl = asText(source.download_url);
      if (kind === 'pdf' && downloadUrl) {
        await openDownloadUrl(
          downloadUrl,
          buildCeDossierFilename({
            name: project.name,
            omschrijving: project.omschrijving,
            projectnummer: project.projectnummer,
            code: project.code,
            id: projectId,
          }),
        );
      }
      setMessage(asText(source.message, `${kind.toUpperCase()} export uitgevoerd.`));
      exportsQuery.refetch();
    } catch (error) {
      setMessage(normalizeApiError(error, 'Export starten mislukt.'));
    }
  };

  const handleDownload = async (item: ExportJob) => {
    try {
      setDownloadingId(String(item.id || ''));
      if (item.download_url) {
        await openDownloadUrl(
          String(item.download_url),
          buildCeDossierFilename({
            name: project.name,
            omschrijving: project.omschrijving,
            projectnummer: project.projectnummer,
            code: project.code,
            id: projectId,
          }),
        );
      } else {
        const payload = await downloadExport.mutateAsync(item.id);
        const source = asRecord(payload);
        const downloadUrl = asText(source.download_url);
        if (!downloadUrl) throw new Error('Voor deze export is nog geen download beschikbaar.');
        await openDownloadUrl(
          downloadUrl,
          buildCeDossierFilename({
            name: project.name,
            omschrijving: project.omschrijving,
            projectnummer: project.projectnummer,
            code: project.code,
            id: projectId,
          }),
        );
      }
      setMessage('Download geopend in een nieuw venster.');
    } catch (error) {
      setMessage(normalizeApiError(error, 'Download openen mislukt.'));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRetry = async (item: ExportJob) => {
    try {
      setRetryingId(String(item.id || ''));
      const payload = await retryExport.mutateAsync(item.id);
      setMessage(asText(asRecord(payload).message, 'Export opnieuw aangeboden.'));
      exportsQuery.refetch();
    } catch (error) {
      setMessage(normalizeApiError(error, 'Export opnieuw aanbieden mislukt.'));
    } finally {
      setRetryingId(null);
    }
  };

  const approvedInspections = inspections.filter((item) => {
    const status = String((item as Record<string, unknown>).status || (item as Record<string, unknown>).result || '').toLowerCase();
    return ['approved', 'goedgekeurd', 'conform', 'gereed'].includes(status);
  }).length;

  const checklistStats = useMemo(
    () => ({
      total: checklist.length,
      completed: checklist.filter((item) => Boolean((item as Record<string, unknown>).ok) || Boolean((item as Record<string, unknown>).completed)).length,
    }),
    [checklist],
  );

  return (
    <div className="page-stack">
      <ProjectTabShell
        projectId={projectId}
        currentTab={currentProjectTab}
        onBack={() => navigate('/projecten')}
        onCreateProject={() => navigate('/projecten?actie=nieuw')}
        onEditProject={() => navigate(`/projecten?project=${projectId}&actie=wijzig`)}
        onCreateAssembly={() => navigate(`/projecten/${projectId}/assemblies?actie=nieuw`)}
        onCreateWeld={() => navigate(`/projecten/${projectId}/lassen?actie=nieuw`)}
        onExportSelectionPdf={() => runExport('pdf')}
        exportSelectionLabel="PDF export"
      >
        <PageHeader
          title="CE dossier"
          description="Werk de compliance-keten af, stuur exports aan en controleer of alle verplichte onderdelen aanwezig zijn."
        />

        {message ? <InlineMessage tone="neutral">{message}</InlineMessage> : null}

        <Card>
          <div className="toolbar-cluster" style={{ justifyContent: 'space-between' }}>
            <Input
              value={ceSearch}
              onChange={(event) => setCeSearch(event.target.value)}
              placeholder="Zoek in checklist, ontbrekende onderdelen en exports"
            />
            <Button variant="secondary" onClick={() => setCeSearch('')}>
              Wis filter
            </Button>
          </div>
        </Card>

        {isLoading ? <LoadingState label="CE dossier laden..." /> : null}
        {isError ? (
          <ErrorState
            title="CE dossier niet geladen"
            description="Controleer de canonieke CE endpoints. Zonder geldige CE-response wordt geen fallback-dossier meer samengesteld."
          />
        ) : null}

        {!isLoading && !isError ? (
          <>
            <div className="project-tab-kpi-grid">
              <ProjectKpiActionCard label="Checklist gereed" value={`${checklistStats.completed}/${checklistStats.total}`} meta="Open lassen en geïntegreerde controle" onClick={() => openSection('checklist')} />
              <ProjectKpiActionCard label="Ontbrekende onderdelen" value={filteredMissingItems.length} meta="Open documenten en ontbrekende onderdelen" onClick={() => openSection('documents')} />
              <ProjectKpiActionCard label="Inspecties akkoord" value={`${approvedInspections}/${inspections.length || 0}`} meta="Open lassen en inspecties" onClick={() => openSection('inspections')} />
              <ProjectKpiActionCard label="Exports" value={filteredExportItems.length} meta="Open exporthistorie of manifest" onClick={() => setSelectedExportId(filteredExportItems[0]?.id || null)} />
            </div>

            <CeStatusPanel
              project={project}
              status={asText(overview.status || dossier.status, 'In behandeling')}
              score={Number(overview.score || dossier.score || 0)}
              readyForExport={Boolean(overview.ready_for_export ?? dossier.ready_for_export)}
              source={asText(dossier.source, 'live-ce-api')}
              missingCount={filteredMissingItems.length}
              onOpenScore={() => openSection('checklist')}
              onOpenMissing={() => openSection('documents')}
              onOpenStatus={() => openSection('inspections')}
              onOpenSource={() => openSection('project')}
            />

            <div className="content-grid-2">
              <CeMissingItemsCard missingItems={filteredMissingItems} onSelect={() => openSection('documents')} />
              <CeChecklistCard checklist={filteredChecklist} onSelect={() => openSection('checklist')} />
            </div>

            <div className="content-grid-2">
              <CeDossierStructureCard counts={counts} assemblies={assemblies} welds={welds} inspections={inspections} documents={documents} photos={photos} onSelectSection={openSection} />
              <CeDataGroupsCard assemblies={assemblies} welds={welds} inspections={inspections} documents={documents} onSelectSection={openSection as (section: 'assemblies' | 'welds' | 'inspections' | 'documents') => void} />
            </div>

            <div className="content-grid-2">
              <CeExportActionsCard
                pending={{ ce: createReport.isPending, pdf: createPdf.isPending, zip: createZip.isPending, excel: createExcel.isPending }}
                onExport={runExport}
                preview={preview}
              />
              <CeExportManifestCard manifest={manifest} exportItem={selectedExport} onSelectSection={openSection} />
            </div>

            <CeExportHistoryCard
              items={filteredExportItems}
              selectedExportId={selectedExportId}
              onSelect={(item) => setSelectedExportId(item.id)}
              onDownload={handleDownload}
              onRetry={handleRetry}
              downloadingId={downloadingId}
              retryingId={retryingId}
            />

            <CePdfLayoutCard
              project={project}
              status={asText(overview.status || dossier.status, 'In behandeling')}
              score={Number(overview.score || dossier.score || 0)}
              counts={counts}
              checklist={checklist}
              missingItems={missingItems}
              assemblies={assemblies}
              welds={welds}
              inspections={inspections}
              documents={documents}
              photos={photos}
              onPrint={() => runExport('pdf')}
            />

            <div className="toolbar-cluster" style={{ justifyContent: 'space-between' }}>
              <Button variant="secondary" onClick={() => navigate(`/projecten/${projectId}/documenten`)}>
                Ga naar documenten
              </Button>
              <Button variant="secondary" onClick={() => navigate(`/projecten/${projectId}/lassen`)}>
                Ga naar lassen
              </Button>
              <Button variant="secondary" onClick={() => navigate(`/projecten/${projectId}/historie`)}>
                <RefreshCcw size={16} /> Audit / historie
              </Button>
            </div>
          </>
        ) : null}
      </ProjectTabShell>
    </div>
  );
}

export default CeDossierPage;

import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Download, RefreshCcw, FileArchive, FileSpreadsheet, FileText } from 'lucide-react';
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
import type { ExportJob } from '@/types/domain';
import { ProjectContextTabs, resolveProjectContextTab } from '@/features/projecten/components/ProjectContextTabs';
import { ProjectTabShell } from '@/features/projecten/components/ProjectTabShell';

type LocalExportRecord = ExportJob & { local_only?: boolean };

function makeLocalExport(kind: CeExportKind, payload: unknown): LocalExportRecord {
  const source = asRecord(payload);
  return {
    id: String(source.id || source.export_id || `local-${kind}-${Date.now()}`),
    type: kind,
    export_type: kind,
    status: String(source.status || (source.unsupported ? 'voorbereid' : 'aangemaakt')),
    message: String(source.message || (source.unsupported ? 'Geen live endpoint gevonden; exportvoorbereiding is lokaal vastgelegd.' : 'Export gestart.')),
    created_at: new Date().toISOString(),
    manifest: {
      section: 'project',
      included: true,
    },
    local_only: true,
  };
}

export function CeDossierPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId = '' } = useParams<{ projectId?: string }>();
  const [message, setMessage] = useState<string | null>(null);
  const [localExports, setLocalExports] = useState<LocalExportRecord[]>([]);
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
    const fromChecklist = asArray<Record<string, unknown>>(checklistQuery.data);
    return fromChecklist.length ? fromChecklist : asArray<Record<string, unknown>>(dossier.checklist);
  }, [checklistQuery.data, dossier]);
  const missingItems = useMemo(() => {
    const fromMissing = asArray<Record<string, unknown>>(missingItemsQuery.data);
    return fromMissing.length ? fromMissing : asArray<Record<string, unknown>>(dossier.missing_items);
  }, [missingItemsQuery.data, dossier]);
  const assemblies = useMemo(() => asArray<Record<string, unknown>>(dossier.assemblies), [dossier]);
  const welds = useMemo(() => asArray<Record<string, unknown>>(dossier.welds), [dossier]);
  const inspections = useMemo(() => asArray<Record<string, unknown>>(dossier.inspections), [dossier]);
  const documents = useMemo(() => asArray<Record<string, unknown>>(dossier.documents), [dossier]);
  const photos = useMemo(() => asArray<Record<string, unknown>>(dossier.photos), [dossier]);
  const preview = useMemo(() => asArray<Record<string, unknown>>(previewQuery.data?.preview).map((item) => ({
    label: asText(item.label, 'Onderdeel'),
    value: asText(item.value, '—'),
  })), [previewQuery.data]);

  const exportItems = useMemo(() => {
    const live = normalizeExportItems(exportsQuery.data);
    const map = new Map<string, ExportJob>();
    [...localExports, ...live].forEach((item, index) => {
      const key = String(item.id || `${item.type || item.export_type || 'export'}-${index}`);
      map.set(key, item);
    });
    return Array.from(map.values()).sort((a, b) => new Date(String(b.created_at || 0)).getTime() - new Date(String(a.created_at || 0)).getTime());
  }, [exportsQuery.data, localExports]);

  const normalizedCeSearch = ceSearch.trim().toLowerCase();

  const filteredChecklist = useMemo(() => checklist.filter((item) => {
    if (!normalizedCeSearch) return true;
    return JSON.stringify(item).toLowerCase().includes(normalizedCeSearch);
  }), [checklist, normalizedCeSearch]);

  const filteredMissingItems = useMemo(() => missingItems.filter((item) => {
    if (!normalizedCeSearch) return true;
    return JSON.stringify(item).toLowerCase().includes(normalizedCeSearch);
  }), [missingItems, normalizedCeSearch]);

  const filteredExportItems = useMemo(() => exportItems.filter((item) => {
    if (!normalizedCeSearch) return true;
    return JSON.stringify(item).toLowerCase().includes(normalizedCeSearch);
  }), [exportItems, normalizedCeSearch]);

  const ceKpis = [
    { label: 'Ontbrekend', value: filteredMissingItems.length },
    { label: 'Checklist', value: filteredChecklist.length },
    { label: 'Exports', value: filteredExportItems.length },
    { label: 'Dekkingsgraad', value: `${Math.max(0, Math.round(Number(overview.score || dossier.score || 0)))}%` },
  ];

  const selectedExport = useMemo(() => exportItems.find((item) => String(item.id) === String(selectedExportId)) || null, [exportItems, selectedExportId]);
  const manifestQuery = useProjectExportManifest(projectId, selectedExport?.id);
  const manifest = useMemo(() => {
    const remote = asArray<Record<string, unknown>>(manifestQuery.data?.manifest);
    if (remote.length) return remote;
    if (!selectedExport) return [];
    return [
      { section: 'project', included: true, count: 1 },
      { section: 'assemblies', included: Number(counts.assemblies || assemblies.length || 0) > 0, count: Number(counts.assemblies || assemblies.length || 0) },
      { section: 'welds', included: Number(counts.welds || welds.length || 0) > 0, count: Number(counts.welds || welds.length || 0) },
      { section: 'inspections', included: Number(counts.inspections || inspections.length || 0) > 0, count: Number(counts.inspections || inspections.length || 0) },
      { section: 'documents', included: Number(counts.documents || documents.length || 0) > 0, count: Number(counts.documents || documents.length || 0) },
      { section: 'photos', included: Number(counts.photos || photos.length || 0) > 0, count: Number(counts.photos || photos.length || 0) },
      { section: 'checklist', included: checklist.length > 0, count: checklist.length },
    ];
  }, [manifestQuery.data, selectedExport, counts, assemblies.length, welds.length, inspections.length, documents.length, photos.length, checklist.length]);

  if (!projectId) {
    return <ErrorState title="Geen projectcontext" description="Open eerst een project vanuit Projecten om het CE dossier te bekijken." />;
  }

  const isLoading = overviewQuery.isLoading || missingItemsQuery.isLoading || checklistQuery.isLoading || dossierQuery.isLoading;
  const isError = overviewQuery.isError || missingItemsQuery.isError || checklistQuery.isError || dossierQuery.isError;

  const handleExport = async (kind: CeExportKind) => {
    try {
      const payload = kind === 'ce'
        ? await createReport.mutateAsync()
        : kind === 'pdf'
          ? await createPdf.mutateAsync()
          : kind === 'zip'
            ? await createZip.mutateAsync()
            : await createExcel.mutateAsync();
      const record = makeLocalExport(kind, payload);
      setLocalExports((current) => [record, ...current]);
      setSelectedExportId(record.id);
      setMessage(`${kind.toUpperCase()} export gestart of voorbereid.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Export starten mislukt.');
    }
  };

  const handleDownload = async (item: ExportJob) => {
    const rowId = String(item.id || '');
    try {
      setDownloadingId(rowId);
      if (item.download_url) {
        window.open(String(item.download_url), '_blank', 'noopener,noreferrer');
        setMessage('Download geopend in een nieuw venster.');
        return;
      }
      const payload = await downloadExport.mutateAsync(item.id);
      const source = asRecord(payload);
      if (source.download_url) {
        window.open(String(source.download_url), '_blank', 'noopener,noreferrer');
        setMessage('Download geopend in een nieuw venster.');
      } else {
        setMessage('Voor deze export is nog geen directe download beschikbaar.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Download openen mislukt.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRetry = async (item: ExportJob) => {
    const rowId = String(item.id || '');
    try {
      setRetryingId(rowId);
      const payload = await retryExport.mutateAsync(item.id);
      const record = makeLocalExport(String(item.type || item.export_type || 'ce') as CeExportKind, payload);
      setLocalExports((current) => [record, ...current]);
      setSelectedExportId(record.id);
      setMessage('Export opnieuw gestart of lokaal opnieuw voorbereid.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Export opnieuw starten mislukt.');
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader title="CE Dossier" description="Projectgebonden compliance-overzicht, ontbrekende onderdelen en exportacties.">
        <Button variant="secondary" onClick={() => navigate(`/projecten/${projectId}/overzicht`)}>Terug naar Project 360</Button>
        <Button onClick={() => handleExport('pdf')}><Download size={16} /> Snelle PDF-export</Button>
      </PageHeader>

      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}

      <ProjectTabShell
        projectId={projectId}
        currentTab={currentProjectTab}
        onCreateProject={() => navigate('/projecten?intent=create-project')}
        onCreateAssembly={() => navigate(`/projecten/${projectId}/overzicht?intent=create-assembly`)}
        onCreateWeld={() => navigate(`/projecten/${projectId}/overzicht?intent=create-weld`)}
        filters={<Input value={ceSearch} onChange={(event) => setCeSearch(event.target.value)} placeholder="Filter op ontbrekende onderdelen, checklist of exports" />}
        kpis={ceKpis.map((item) => (
          <Card key={item.label} className="project-kpi-card">
            <div className="stat-card">
              <div className="stat-label">{item.label}</div>
              <div className="stat-value">{item.value}</div>
              <div className="stat-meta">CE dossier KPI binnen dezelfde vaste projectstructuur.</div>
            </div>
          </Card>
        ))}
      >
        {isLoading ? <LoadingState label="CE dossier laden..." /> : null}
        {isError ? <ErrorState title="CE dossier niet geladen" description="De CE/compliance-data voor dit project kon niet worden opgehaald." /> : null}

        {!isLoading && !isError ? (
          <>
            <CeStatusPanel
              project={project}
              status={asText(overview.status || dossier.status, 'In behandeling')}
              score={Number(overview.score || dossier.score || 0)}
              readyForExport={Boolean(overview.ready_for_export ?? dossier.ready_for_export)}
              source={asText(dossier.source, 'live-api')}
              missingCount={missingItems.length}
            />

            <div className="content-grid-2">
              <CeMissingItemsCard missingItems={filteredMissingItems} />
              <CeChecklistCard checklist={filteredChecklist} />
            </div>

            <div className="content-grid-2">
              <CeDossierStructureCard
                counts={counts}
                assemblies={assemblies}
                welds={welds}
                inspections={inspections}
                documents={documents}
                photos={photos}
              />
              <CeDataGroupsCard
                assemblies={assemblies}
                welds={welds}
                inspections={inspections}
                documents={documents}
              />
            </div>

            <div className="content-grid-2">
              <CeExportActionsCard
                pending={{
                  ce: createReport.isPending,
                  pdf: createPdf.isPending,
                  zip: createZip.isPending,
                  excel: createExcel.isPending,
                }}
                onExport={handleExport}
                preview={preview}
              />
              <CeExportManifestCard manifest={manifest} exportItem={selectedExport} />
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
              onPrint={() => window.print()}
            />

            <div className="toolbar-cluster" style={{ justifyContent: 'space-between' }}>
              <Button variant="secondary" onClick={() => navigate(`/projecten/${projectId}/documenten`)}>Ga naar documenten</Button>
              <Button variant="secondary" onClick={() => navigate(`/projecten/${projectId}/lascontrole`)}>Ga naar lascontrole</Button>
              <Button variant="secondary" onClick={() => navigate(`/projecten/${projectId}/historie`)}><RefreshCcw size={16} /> Audit / historie</Button>
            </div>
          </>
        ) : null}
      </ProjectTabShell>
    </div>
  );
}

export default CeDossierPage;

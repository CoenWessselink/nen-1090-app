import { useMemo, useState } from 'react';
import { Modal } from '@/components/overlays/Modal';
import { ProjectForm } from '@/features/projecten/components/ProjectForm';
import { useUpdateProject } from '@/hooks/useProjects';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { openDownloadUrl } from '@/utils/download';
import { buildCeDossierFilename } from '@/features/mobile/mobile-utils';
import { RefreshCcw } from 'lucide-react';
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
import { resolveProjectContextTab } from '@/features/projecten/components/ProjectContextTabs';
import { ProjectTabShell } from '@/features/projecten/components/ProjectTabShell';
import { ProjectKpiActionCard } from '@/features/projecten/components/ProjectKpiActionCard';
import { downloadCsv, downloadJson, downloadText, openPrintWindow } from '@/utils/export';

type LocalExportRecord = ExportJob & { local_only?: boolean };

function makeLocalExport(kind: CeExportKind, payload: unknown): LocalExportRecord {
  const source = asRecord(payload);
  return {
    id: String(source.id || source.export_id || `local-${kind}-${Date.now()}`),
    type: kind,
    export_type: kind,
    status: String(source.status || (source.unsupported ? 'lokaal gereed' : 'aangemaakt')),
    message: String(
      source.message ||
        (source.unsupported
          ? 'Live endpoint ontbreekt; lokale exportfallback uitgevoerd.'
          : 'Export gestart.'),
    ),
    created_at: new Date().toISOString(),
    manifest: { section: 'project', included: true },
    local_only: true,
    download_url: source.download_url ? String(source.download_url) : undefined,
  };
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'project'
  );
}

function buildDossierHtml({
  project,
  status,
  score,
  checklist,
  missingItems,
  assemblies,
  welds,
  inspections,
  documents,
}: {
  project: Record<string, unknown>;
  status: string;
  score: number;
  checklist: Record<string, unknown>[];
  missingItems: Record<string, unknown>[];
  assemblies: Record<string, unknown>[];
  welds: Record<string, unknown>[];
  inspections: Record<string, unknown>[];
  documents: Record<string, unknown>[];
}) {
  const projectName = asText(
    project.name || project.omschrijving || project.projectnummer,
    'Onbekend project',
  );
  const customer = asText(project.client_name || project.opdrachtgever, 'Geen opdrachtgever');
  const executionClass = asText(
    project.execution_class || project.executieklasse,
    'Niet opgegeven',
  );

  const rows = (items: Record<string, unknown>[], title: string, fields: string[]) => `
    <div class="block">
      <h3>${title}</h3>
      <table>
        <thead><tr>${fields.map((field) => `<th>${field}</th>`).join('')}</tr></thead>
        <tbody>
          ${
            items.length
              ? items
                  .map(
                    (item) =>
                      `<tr>${fields
                        .map((field) => `<td>${asText(item[field], '—')}</td>`)
                        .join('')}</tr>`,
                  )
                  .join('')
              : `<tr><td colspan="${fields.length}">Geen records</td></tr>`
          }
        </tbody>
      </table>
    </div>`;

  return `
    <h1>CE dossier – ${projectName}</h1>
    <div class="muted">Opdrachtgever: ${customer} · Executieklasse: ${executionClass} · Status: ${status} · Score: ${score}%</div>
    <div class="block">
      <h2>Checklist</h2>
      ${
        checklist
          .map(
            (item) =>
              `<div class="row"><div><strong>${asText(item.label || item.name, 'Checklistregel')}</strong><div>${asText(item.detail || item.description, '')}</div></div><span class="badge">${Boolean(item.ok) || Boolean(item.completed) ? 'Gereed' : 'Open'}</span></div>`,
          )
          .join('') || '<div>Geen checklistregels</div>'
      }
    </div>
    <div class="block">
      <h2>Ontbrekende onderdelen</h2>
      ${
        missingItems
          .map(
            (item) =>
              `<div class="row"><div><strong>${asText(item.label || item.name, 'Actie')}</strong><div>${asText(item.detail || item.description || item.reason, '')}</div></div><span class="badge">Actie nodig</span></div>`,
          )
          .join('') || '<div>Geen ontbrekende onderdelen</div>'
      }
    </div>
    ${rows(assemblies, 'Assemblies', ['code', 'name', 'status'])}
    ${rows(welds, 'Lassen', ['weld_number', 'status', 'execution_class'])}
    ${rows(inspections, 'Inspecties', ['status', 'method', 'remarks'])}
    ${rows(documents, 'Documenten', ['title', 'filename', 'status'])}
  `;
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
  const [selectedCeItem, setSelectedCeItem] = useState<Record<string, unknown> | null>(null);
  const [selectedCeSection, setSelectedCeSection] = useState<string>('checklist');
  const currentProjectTab = projectId ? resolveProjectContextTab(location.pathname) : 'ce-dossier';

  const overviewQuery = useComplianceOverview(projectId);
  const missingItemsQuery = useComplianceMissingItems(projectId);
  const checklistQuery = useComplianceChecklist(projectId);
  const dossierQuery = useCeDossier(projectId);
  const exportsQuery = useProjectExports(projectId);
  const previewQuery = useProjectExportPreview(projectId);

  const createReport = useCreateCeReport(projectId);
  const updateProject = useUpdateProject();
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
    const fromChecklist = asArray(checklistQuery.data);
    return fromChecklist.length ? fromChecklist : asArray(dossier.checklist);
  }, [checklistQuery.data, dossier]);

  const missingItems = useMemo(() => {
    const fromMissing = asArray(missingItemsQuery.data);
    return fromMissing.length ? fromMissing : asArray(dossier.missing_items);
  }, [missingItemsQuery.data, dossier]);

  const assemblies = useMemo(() => asArray(dossier.assemblies), [dossier]);
  const welds = useMemo(() => asArray(dossier.welds), [dossier]);
  const inspections = useMemo(() => asArray(dossier.inspections), [dossier]);
  const documents = useMemo(() => asArray(dossier.documents), [dossier]);
  const photos = useMemo(() => asArray(dossier.photos), [dossier]);

  const preview = useMemo(
    () =>
      asArray(previewQuery.data?.preview).map((item) => ({
        label: asText((item as Record<string, unknown>).label, 'Onderdeel'),
        value: asText((item as Record<string, unknown>).value, '—'),
      })),
    [previewQuery.data],
  );

  const exportItems = useMemo(() => {
    const live = normalizeExportItems(exportsQuery.data);
    const map = new Map<string, ExportJob>();

    [...localExports, ...live].forEach((item, index) => {
      const key = String(item.id || `${item.type || item.export_type || 'export'}-${index}`);
      map.set(key, item);
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(String(b.created_at || 0)).getTime() - new Date(String(a.created_at || 0)).getTime(),
    );
  }, [exportsQuery.data, localExports]);

  const normalizedCeSearch = ceSearch.trim().toLowerCase();

  const filteredChecklist = useMemo(
    () =>
      checklist.filter(
        (item) =>
          !normalizedCeSearch || JSON.stringify(item).toLowerCase().includes(normalizedCeSearch),
      ),
    [checklist, normalizedCeSearch],
  );

  const filteredMissingItems = useMemo(
    () =>
      missingItems.filter(
        (item) =>
          !normalizedCeSearch || JSON.stringify(item).toLowerCase().includes(normalizedCeSearch),
      ),
    [missingItems, normalizedCeSearch],
  );

  const filteredExportItems = useMemo(
    () =>
      exportItems.filter(
        (item) =>
          !normalizedCeSearch || JSON.stringify(item).toLowerCase().includes(normalizedCeSearch),
      ),
    [exportItems, normalizedCeSearch],
  );

  const selectedExport = useMemo(
    () => exportItems.find((item) => String(item.id) === String(selectedExportId)) || null,
    [exportItems, selectedExportId],
  );

  const manifestQuery = useProjectExportManifest(projectId, selectedExport?.id);

  const manifest = useMemo(() => {
    const remote = asArray(manifestQuery.data?.manifest);
    if (remote.length) return remote;
    if (!selectedExport) return [];

    return [
      { section: 'project', included: true, count: 1 },
      {
        section: 'assemblies',
        included: Number(counts.assemblies || assemblies.length || 0) > 0,
        count: Number(counts.assemblies || assemblies.length || 0),
      },
      {
        section: 'welds',
        included: Number(counts.welds || welds.length || 0) > 0,
        count: Number(counts.welds || welds.length || 0),
      },
      {
        section: 'inspections',
        included: Number(counts.inspections || inspections.length || 0) > 0,
        count: Number(counts.inspections || inspections.length || 0),
      },
      {
        section: 'documents',
        included: Number(counts.documents || documents.length || 0) > 0,
        count: Number(counts.documents || documents.length || 0),
      },
      {
        section: 'photos',
        included: Number(counts.photos || photos.length || 0) > 0,
        count: Number(counts.photos || photos.length || 0),
      },
      { section: 'checklist', included: checklist.length > 0, count: checklist.length },
    ];
  }, [
    manifestQuery.data,
    selectedExport,
    counts,
    assemblies.length,
    welds.length,
    inspections.length,
    documents.length,
    photos.length,
    checklist.length,
  ]);

  const projectLabel = asText(
    project.name || project.omschrijving || project.projectnummer,
    `project-${projectId}`,
  );
  const exportSlug = slugify(projectLabel);

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
    if (section === 'inspections' || section === 'checklist' || section === 'lascontrole') {
      return `/projecten/${projectId}/lassen`;
    }
    if (section === 'documents' || section === 'photos') return `/projecten/${projectId}/documenten`;
    if (section === 'project') return `/projecten/${projectId}/overzicht`;
    return `/projecten/${projectId}/ce-dossier`;
  };

  const openSection = (section: string) => navigate(routeFromSection(section));

  const runLocalExport = (kind: CeExportKind) => {
    const score = Number(overview.score || dossier.score || 0);
    const status = asText(overview.status || dossier.status, 'In behandeling');
    const html = buildDossierHtml({
      project,
      status,
      score,
      checklist,
      missingItems,
      assemblies,
      welds,
      inspections,
      documents,
    });

    if (kind === 'pdf') {
      const opened = openPrintWindow(`CE dossier ${projectLabel}`, html);
      if (!opened) {
        throw new Error('Printvenster kon niet worden geopend. Controleer of pop-ups zijn toegestaan.');
      }
      return { unsupported: true, message: 'PDF-export lokaal geopend via printvenster.' };
    }

    if (kind === 'ce') {
      downloadText(`ce-rapport-${exportSlug}.html`, html, 'text/html;charset=utf-8;');
      return { unsupported: true, message: 'CE-rapport lokaal gedownload als HTML-bestand.' };
    }

    if (kind === 'excel') {
      downloadCsv(`ce-dossier-${exportSlug}.csv`, [
        ...checklist.map((item) => ({
          categorie: 'checklist',
          titel: asText(item.label || item.name),
          status: Boolean(item.ok) || Boolean(item.completed) ? 'gereed' : 'open',
          detail: asText(item.detail || item.description),
        })),
        ...missingItems.map((item) => ({
          categorie: 'ontbrekend',
          titel: asText(item.label || item.name),
          status: 'actie nodig',
          detail: asText(item.detail || item.description || item.reason),
        })),
      ]);
      return { unsupported: true, message: 'Excel-export lokaal gedownload als CSV-bestand.' };
    }

    downloadJson(`ce-dossier-${exportSlug}-pakket.json`, {
      exported_at: new Date().toISOString(),
      project,
      counts,
      checklist,
      missingItems,
      assemblies,
      welds,
      inspections,
      documents,
      photos,
    });

    return { unsupported: true, message: 'ZIP-export lokaal voorbereid als JSON-pakket.' };
  };

  const handleExport = async (kind: CeExportKind) => {
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
      let effectivePayload: unknown = payload;

      if (!source.download_url && !source.status) {
        effectivePayload = runLocalExport(kind);
      } else if (source.download_url) {
        await openDownloadUrl(String(source.download_url), buildCeDossierFilename(project ? { name: project.name, omschrijving: project.omschrijving, projectnummer: project.projectnummer, code: project.code, id: projectId } : { id: projectId }));
      } else if (String(source.status || '').toLowerCase().includes('queued')) {
        setMessage(`${kind.toUpperCase()} export in wachtrij geplaatst.`);
      } else {
        effectivePayload = runLocalExport(kind);
      }

      const record = makeLocalExport(kind, effectivePayload);
      setLocalExports((current) => [record, ...current]);
      setSelectedExportId(record.id);
      setMessage(record.message || `${kind.toUpperCase()} export gestart.`);
    } catch (error) {
      try {
        const localPayload = runLocalExport(kind);
        const record = makeLocalExport(kind, localPayload);
        setLocalExports((current) => [record, ...current]);
        setSelectedExportId(record.id);
        setMessage(record.message || `${kind.toUpperCase()} export lokaal uitgevoerd.`);
      } catch {
        setMessage(error instanceof Error ? error.message : 'Export starten mislukt.');
      }
    }
  };

  const handleDownload = async (item: ExportJob) => {
    const rowId = String(item.id || '');

    try {
      setDownloadingId(rowId);

      if (item.download_url) {
        await openDownloadUrl(String(item.download_url), `export-${item.id}.pdf`);
        setMessage('Download geopend in een nieuw venster.');
        return;
      }

      if ((item as LocalExportRecord).local_only) {
        handleExport(String(item.type || item.export_type || 'pdf').toLowerCase() as CeExportKind);
        return;
      }

      const payload = await downloadExport.mutateAsync(item.id);
      const source = asRecord(payload);

      if (source.download_url) {
        await openDownloadUrl(String(source.download_url), buildCeDossierFilename(project ? { name: project.name, omschrijving: project.omschrijving, projectnummer: project.projectnummer, code: project.code, id: projectId } : { id: projectId }));
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
      const source = asRecord(payload);

      if (source.unsupported || (item as LocalExportRecord).local_only) {
        const nextKind = String(item.type || item.export_type || 'pdf').toLowerCase() as CeExportKind;
        await handleExport(nextKind);
        return;
      }

      setMessage(asText(source.message, 'Export opnieuw aangeboden.'));
      exportsQuery.refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Export opnieuw aanbieden mislukt.');
    } finally {
      setRetryingId(null);
    }
  };

  const approvedInspections = inspections.filter((item) => {
    const status = String(
      (item as Record<string, unknown>).status || (item as Record<string, unknown>).result || '',
    ).toLowerCase();
    return ['approved', 'goedgekeurd', 'conform', 'gereed'].includes(status);
  }).length;


  const resolveCeItemSection = (item: Record<string, unknown> | null | undefined) => {
    const explicit = String(item?.section || item?.key || '').toLowerCase();
    const label = String(item?.label || item?.name || '').toLowerCase();
    if (['project', 'projectbasis', 'projectgegevens'].includes(explicit) || label.includes('project')) return 'project';
    if (explicit.includes('exc') || label.includes('exc') || label.includes('template')) return 'template';
    if (explicit.includes('wps') || label.includes('wps')) return 'wps';
    if (explicit.includes('welder') || label.includes('lasser')) return 'welders';
    if (explicit.includes('document') || explicit.includes('photo') || label.includes('document') || label.includes('foto')) return 'documents';
    if (explicit.includes('inspection') || explicit.includes('inspect') || label.includes('inspect')) return 'inspections';
    if (explicit.includes('weld') || explicit.includes('las')) return 'welds';
    return 'project';
  };

  const openCeItem = (item: Record<string, unknown>, fallbackSection: string) => {
    setSelectedCeItem(item);
    setSelectedCeSection(resolveCeItemSection(item) || fallbackSection);
  };

  const ceItemTitle = selectedCeItem ? asText(selectedCeItem.label || selectedCeItem.name, 'CE actie') : 'CE actie';
  const ceItemDetail = selectedCeItem ? asText(selectedCeItem.detail || selectedCeItem.description || selectedCeItem.reason, '') : '';

  const saveProjectFromCe = async (values: Parameters<Parameters<typeof ProjectForm>[0]['onSubmit']>[0]) => {
    await updateProject.mutateAsync({ id: projectId, payload: values });
    await Promise.all([overviewQuery.refetch(), missingItemsQuery.refetch(), checklistQuery.refetch(), dossierQuery.refetch()]);
    setMessage('Projectgegevens bijgewerkt vanuit het CE dossier.');
    setSelectedCeItem(null);
  };

  const checklistStats = useMemo(
    () => ({
      total: checklist.length,
      completed: checklist.filter(
        (item) =>
          Boolean((item as Record<string, unknown>).ok) ||
          Boolean((item as Record<string, unknown>).completed),
      ).length,
    }),
    [checklist],
  );

  return (
    <div className="page-stack ce-dossier-page">
      <ProjectTabShell
        projectId={projectId}
        currentTab={currentProjectTab}
        onBack={() => navigate('/projecten')}
        onCreateProject={() => navigate('/projecten?actie=nieuw')}
        onEditProject={() => navigate(`/projecten?project=${projectId}&actie=wijzig`)}
        onCreateAssembly={() => navigate(`/projecten/${projectId}/assemblies?actie=nieuw`)}
        onCreateWeld={() => navigate(`/projecten/${projectId}/lassen?actie=nieuw`)}
        onExportSelectionPdf={() => handleExport('pdf')}
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
            description="Controleer de CE- en projectendpoints. Zonder projectdata kan het dossier niet worden opgebouwd."
          />
        ) : null}

        {!isLoading && !isError ? (
          <>
            <div className="project-tab-kpi-grid">
              <ProjectKpiActionCard
                label="Checklist gereed"
                value={`${checklistStats.completed}/${checklistStats.total}`}
                meta="Open lassen en geïntegreerde controle"
                onClick={() => openSection('checklist')}
              />
              <ProjectKpiActionCard
                label="Ontbrekende onderdelen"
                value={filteredMissingItems.length}
                meta="Open documenten en ontbrekende onderdelen"
                onClick={() => openSection('documents')}
              />
              <ProjectKpiActionCard
                label="Inspecties akkoord"
                value={`${approvedInspections}/${inspections.length || 0}`}
                meta="Open lassen en inspecties"
                onClick={() => openSection('inspections')}
              />
              <ProjectKpiActionCard
                label="Exports"
                value={filteredExportItems.length}
                meta="Open exporthistorie of manifest"
                onClick={() => setSelectedExportId(filteredExportItems[0]?.id || null)}
              />
            </div>

            <div id="ce-status-panel">
              <CeStatusPanel
                project={project}
                status={asText(overview.status || dossier.status, 'In behandeling')}
                score={Number(overview.score || dossier.score || 0)}
                readyForExport={Boolean(overview.ready_for_export ?? dossier.ready_for_export)}
                source={asText(dossier.source, 'live-api')}
                missingCount={filteredMissingItems.length}
                onOpenScore={() => openSection('checklist')}
                onOpenMissing={() => openSection('documents')}
                onOpenStatus={() => openSection('inspections')}
                onOpenSource={() => openSection('project')}
              />
            </div>

            <div className="content-grid-2">
              <div id="ce-missing-items-card">
                <CeMissingItemsCard
                  missingItems={filteredMissingItems}
                  onSelect={(item) => openCeItem(item, 'documents')}
                />
              </div>
              <div id="ce-checklist-card">
                <CeChecklistCard
                  checklist={filteredChecklist}
                  onSelect={(item) => openCeItem(item, 'checklist')}
                />
              </div>
            </div>

            <div className="content-grid-2">
              <CeDossierStructureCard
                counts={counts}
                assemblies={assemblies}
                welds={welds}
                inspections={inspections}
                documents={documents}
                photos={photos}
                onSelectSection={openSection}
              />
              <CeDataGroupsCard
                assemblies={assemblies}
                welds={welds}
                inspections={inspections}
                documents={documents}
                onSelectSection={
                  openSection as (section: 'assemblies' | 'welds' | 'inspections' | 'documents') => void
                }
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
              <CeExportManifestCard
                manifest={manifest}
                exportItem={selectedExport}
                onSelectSection={openSection}
              />
            </div>

            <div id="ce-export-history-card">
              <CeExportHistoryCard
                items={filteredExportItems}
                selectedExportId={selectedExportId}
                onSelect={(item) => setSelectedExportId(item.id)}
                onDownload={handleDownload}
                onRetry={handleRetry}
                downloadingId={downloadingId}
                retryingId={retryingId}
              />
            </div>

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
              onPrint={() =>
                openPrintWindow(
                  `CE dossier ${projectLabel}`,
                  buildDossierHtml({
                    project,
                    status: asText(overview.status || dossier.status, 'In behandeling'),
                    score: Number(overview.score || dossier.score || 0),
                    checklist,
                    missingItems,
                    assemblies,
                    welds,
                    inspections,
                    documents,
                  }),
                )
              }
            />


            <Modal open={Boolean(selectedCeItem)} onClose={() => setSelectedCeItem(null)} title={ceItemTitle} size="large">
              <div className="detail-stack">
                <InlineMessage tone="neutral">{ceItemDetail || 'Open deze CE-regel om direct de gekoppelde bron te herstellen of aan te vullen.'}</InlineMessage>
                <Card>
                  <div className="section-title-row">
                    <h3>Huidige status</h3>
                    <Button variant="secondary" onClick={() => openSection(selectedCeSection)}>Open volledige pagina</Button>
                  </div>
                  <div className="list-stack compact-list">
                    <div className="list-row"><div><strong>Doel</strong><div className="list-subtle">{ceItemTitle}</div></div></div>
                    <div className="list-row"><div><strong>Waarom vereist</strong><div className="list-subtle">{ceItemDetail || 'Deze regel beïnvloedt CE-compleetheid, projectstatus en exportvrijgave.'}</div></div></div>
                    <div className="list-row"><div><strong>Gekoppelde flow</strong><div className="list-subtle">{selectedCeSection}</div></div></div>
                  </div>
                </Card>

                {selectedCeSection === 'project' ? (
                  <ProjectForm
                    initial={project as never}
                    onSubmit={saveProjectFromCe}
                    isSubmitting={updateProject.isPending}
                    submitLabel="Project bijwerken"
                  />
                ) : null}

                {selectedCeSection !== 'project' ? (
                  <Card>
                    <div className="section-title-row"><h3>Directe acties</h3></div>
                    <div className="toolbar-cluster" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                      <Button type="button" onClick={() => { setSelectedCeItem(null); openSection(selectedCeSection); }}>Open gekoppelde module</Button>
                      <Button type="button" variant="secondary" onClick={() => { setSelectedCeItem(null); navigate(`/projecten/${projectId}/overzicht`); }}>Project 360</Button>
                      <Button type="button" variant="secondary" onClick={() => { setSelectedCeItem(null); navigate(`/projecten/${projectId}/documenten`); }}>Documenten</Button>
                      <Button type="button" variant="secondary" onClick={() => { setSelectedCeItem(null); navigate(`/projecten/${projectId}/lassen`); }}>Lassen en inspecties</Button>
                    </div>
                  </Card>
                ) : null}
              </div>
            </Modal>

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

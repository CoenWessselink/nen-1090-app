import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCcw } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ProjectScopePicker } from '@/components/project-scope/ProjectScopePicker';
import { useProjectContext } from '@/context/ProjectContext';
import {
  useCeDossier,
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
  CeExportKind,
  CeExportManifestCard,
  normalizeExportItems,
} from '@/features/ce-dossier/components/CeExportBlocks';
import { downloadCsv } from '@/utils/export';
import type { ExportJob } from '@/types/domain';
import {
  CeDossierContentsCard,
  CePdfLayoutCard,
} from '@/features/ce-dossier/components/CePdfBlocks';

function downloadTextFile(filename: string, content: string, mime = 'application/json;charset=utf-8;') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}



function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPdfHtml(payload: {
  projectId: string | number;
  project: Record<string, unknown>;
  status: string;
  score: number;
  counts: Record<string, unknown>;
  checklist: Record<string, unknown>[];
  missingItems: Record<string, unknown>[];
  assemblies: Record<string, unknown>[];
  welds: Record<string, unknown>[];
  inspections: Record<string, unknown>[];
  documents: Record<string, unknown>[];
  photos: Record<string, unknown>[];
}) {
  const projectName = asText(payload.project.name || payload.project.omschrijving || payload.project.projectnummer, 'Onbekend project');
  const clientName = asText(payload.project.client_name || payload.project.opdrachtgever, 'Geen opdrachtgever');
  const executionClass = asText(payload.project.execution_class || payload.project.executieklasse, 'Niet opgegeven');

  const checklistRows = payload.checklist
    .map((item, index) => {
      const label = escapeHtml(asText(item.label || item.name, 'Checklist ' + String(index + 1)));
      const detail = escapeHtml(asText(item.detail || item.description, ''));
      const state = Boolean(item.ok) || Boolean(item.completed) ? 'Gereed' : 'Open';
      return '<tr><td>' + String(index + 1) + '</td><td>' + label + '</td><td>' + detail + '</td><td>' + state + '</td></tr>';
    })
    .join('');

  const missingRows = payload.missingItems
    .map((item, index) => {
      const label = escapeHtml(asText(item.label || item.name, 'Punt ' + String(index + 1)));
      const detail = escapeHtml(asText(item.detail || item.reason || item.description, ''));
      return '<li><strong>' + label + '</strong><br/><span>' + detail + '</span></li>';
    })
    .join('');

  const mapRows = (items: Record<string, unknown>[], label: string) =>
    items
      .slice(0, 20)
      .map((item, index) => {
        const title = escapeHtml(
          asText(
            item.title || item.name || item.code || item.weld_number || item.weld_no || item.filename || item.uploaded_filename || item.method,
            label + ' ' + String(index + 1),
          ),
        );
        const state = escapeHtml(asText(item.status || item.result || item.location || item.type, '—'));
        return '<tr><td>' + String(index + 1) + '</td><td>' + title + '</td><td>' + state + '</td></tr>';
      })
      .join('');

  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8" />
<title>CE dossier ${escapeHtml(projectName)}</title>
<style>
  body { font-family: Arial, sans-serif; color:#1f2937; margin:0; }
  .page { padding:32px; }
  h1,h2,h3 { margin:0 0 12px; }
  .hero { border:2px solid #d1d5db; border-radius:16px; padding:24px; margin-bottom:24px; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:16px 0 24px; }
  .panel { border:1px solid #e5e7eb; border-radius:12px; padding:16px; }
  .muted { color:#6b7280; font-size:12px; }
  table { width:100%; border-collapse:collapse; margin-top:12px; }
  th, td { border:1px solid #e5e7eb; padding:8px; text-align:left; font-size:12px; vertical-align:top; }
  th { background:#f9fafb; }
  ul { padding-left:18px; }
  .section { margin-top:28px; page-break-inside:avoid; }
  .badge { display:inline-block; border:1px solid #d1d5db; border-radius:999px; padding:4px 10px; font-size:12px; margin-right:8px; }
  @media print { .page { padding:16px; } }
</style>
</head>
<body>
  <div class="page">
    <div class="hero">
      <div class="muted">CWS NEN-1090 · CE dossier · project ${escapeHtml(String(payload.projectId))}</div>
      <h1>${escapeHtml(projectName)}</h1>
      <div>${escapeHtml(clientName)} · EXC ${escapeHtml(executionClass)}</div>
      <div style="margin-top:12px">
        <span class="badge">Status: ${escapeHtml(payload.status)}</span>
        <span class="badge">Score: ${escapeHtml(String(payload.score))}%</span>
        <span class="badge">Assemblies: ${escapeHtml(String(Number(payload.counts.assemblies || payload.assemblies.length || 0)))}</span>
        <span class="badge">Lassen: ${escapeHtml(String(Number(payload.counts.welds || payload.welds.length || 0)))}</span>
      </div>
      <div class="muted" style="margin-top:8px">Gegenereerd op ${escapeHtml(new Date().toLocaleString('nl-NL'))}</div>
    </div>

    <div class="grid">
      <div class="panel">
        <h3>Checklist</h3>
        <table><thead><tr><th>#</th><th>Onderdeel</th><th>Toelichting</th><th>Status</th></tr></thead><tbody>${checklistRows || '<tr><td colspan="4">Nog geen checklistregels.</td></tr>'}</tbody></table>
      </div>
      <div class="panel">
        <h3>Open acties</h3>
        ${missingRows ? '<ul>' + missingRows + '</ul>' : '<p>Geen open acties.</p>'}
      </div>
    </div>

    <div class="section">
      <h2>Assemblies</h2>
      <table><thead><tr><th>#</th><th>Assembly</th><th>Status</th></tr></thead><tbody>${mapRows(payload.assemblies, 'Assembly') || '<tr><td colspan="3">Geen assemblies.</td></tr>'}</tbody></table>
    </div>
    <div class="section">
      <h2>Lassen</h2>
      <table><thead><tr><th>#</th><th>Las</th><th>Status / locatie</th></tr></thead><tbody>${mapRows(payload.welds, 'Las') || '<tr><td colspan="3">Geen lassen.</td></tr>'}</tbody></table>
    </div>
    <div class="section">
      <h2>Inspecties</h2>
      <table><thead><tr><th>#</th><th>Inspectie</th><th>Resultaat</th></tr></thead><tbody>${mapRows(payload.inspections, 'Inspectie') || '<tr><td colspan="3">Geen inspecties.</td></tr>'}</tbody></table>
    </div>
    <div class="section">
      <h2>Documenten</h2>
      <table><thead><tr><th>#</th><th>Document</th><th>Type / status</th></tr></thead><tbody>${mapRows(payload.documents, 'Document') || '<tr><td colspan="3">Geen documenten.</td></tr>'}</tbody></table>
    </div>
    <div class="section">
      <h2>Fotobijlagen</h2>
      <table><thead><tr><th>#</th><th>Foto</th><th>Type / status</th></tr></thead><tbody>${mapRows(payload.photos, 'Foto') || "<tr><td colspan=\"3\">Geen foto's.</td></tr>"}</tbody></table>
    </div>
  </div>
</body>
</html>`;
}

function createLocalExportJob(kind: CeExportKind, projectId: string | number, score: number): ExportJob {
  return {
    id: `local-${kind}-${Date.now()}`,
    type: kind,
    status: 'lokaal voorbereid',
    created_at: new Date().toISOString(),
    project_id: String(projectId),
    message: `Live API ondersteunt ${kind.toUpperCase()} export nog niet; lokale exportset is voorbereid.`,
    manifest: { local: true, kind, score },
  };
}

export function CeDossierPage() {
  const { projectId, hasProject } = useProjectContext();
  const queryClient = useQueryClient();
  const [localExports, setLocalExports] = useState<ExportJob[]>([]);
  const [selectedExport, setSelectedExport] = useState<ExportJob | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | number | null>(null);
  const [retryingId, setRetryingId] = useState<string | number | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const ceQuery = useCeDossier(projectId);
  const exportsQuery = useProjectExports(projectId);
  const exportPreviewQuery = useProjectExportPreview(projectId);
  const exportManifestQuery = useProjectExportManifest(projectId, selectedExport?.id);
  const exportCe = useCreateCeReport(String(projectId || ''));
  const exportZip = useCreateZipExport(String(projectId || ''));
  const exportPdf = useCreatePdfExport(String(projectId || ''));
  const exportExcel = useCreateExcelExport(String(projectId || ''));
  const downloadExport = useDownloadProjectExport(String(projectId || ''));
  const retryExport = useRetryProjectExport(String(projectId || ''));

  const data = asRecord(ceQuery.data);
  const project = asRecord(data.project);
  const assemblies = asArray<Record<string, unknown>>(data.assemblies);
  const welds = asArray<Record<string, unknown>>(data.welds);
  const inspections = asArray<Record<string, unknown>>(data.inspections);
  const documents = asArray<Record<string, unknown>>(data.documents);
  const photos = asArray<Record<string, unknown>>(data.photos);
  const checklist = asArray<Record<string, unknown>>(data.checklist);
  const missingItems = asArray<Record<string, unknown>>(data.missing_items);
  const counts = asRecord(data.counts);
  const status = asText(data.status, 'in behandeling');
  const score = Number(data.score || 0);
  const source = asText(data.source, 'assembled-live-api');
  const exportPreview = asArray<Record<string, unknown>>(asRecord(exportPreviewQuery.data).preview).map((item) => ({
    label: asText(item.label, 'Onderdeel'),
    value: asText(item.value, '—'),
  }));

  const liveExports = useMemo(() => normalizeExportItems(exportsQuery.data), [exportsQuery.data]);
  const exportItems = useMemo(() => {
    const merged = [...localExports, ...liveExports];
    return merged.sort((left, right) => String(right.created_at || '').localeCompare(String(left.created_at || '')));
  }, [liveExports, localExports]);
  const manifest = useMemo(() => asArray<Record<string, unknown>>(asRecord(exportManifestQuery.data).manifest), [exportManifestQuery.data]);

  const pending = {
    ce: exportCe.isPending,
    zip: exportZip.isPending,
    pdf: exportPdf.isPending,
    excel: exportExcel.isPending,
  };

  const invalidateExportQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ['project-exports', projectId] });
    await queryClient.invalidateQueries({ queryKey: ['project-export-preview', projectId] });
  };

  const appendLocalExport = (kind: CeExportKind) => {
    if (!projectId) return;
    const next = createLocalExportJob(kind, projectId, score);
    setLocalExports((current) => [next, ...current]);
    setSelectedExport(next);
    setExportMessage(`${kind.toUpperCase()} export is lokaal voorbereid omdat de live API deze route nog niet teruggeeft.`);
  };

  const handleExport = async (kind: CeExportKind) => {
    if (!projectId) return;
    setExportMessage(null);

    const mutation = kind === 'ce' ? exportCe : kind === 'zip' ? exportZip : kind === 'pdf' ? exportPdf : exportExcel;
    const result = (await mutation.mutateAsync()) as Record<string, unknown> | undefined;
    await invalidateExportQueries();

    if (result && (result.id || result.export_id)) {
      const job: ExportJob = {
        ...(result as ExportJob),
        id: String(result.id || result.export_id),
        type: String(result.type || result.export_type || kind),
        created_at: String(result.created_at || new Date().toISOString()),
        status: String(result.status || 'aangemaakt'),
      };
      setSelectedExport(job);
      setExportMessage(`${String(job.type || kind).toUpperCase()} export gestart.`);
      return;
    }

    appendLocalExport(kind);
  };

  const buildSnapshot = () => ({
    generated_at: new Date().toISOString(),
    project_id: String(projectId || ''),
    project,
    status,
    score,
    source,
    counts,
    checklist,
    missing_items: missingItems,
    assemblies,
    welds,
    inspections,
    documents,
    photos,
  });

  const handlePrintPdf = () => {
    if (!projectId) return;
    const html = buildPdfHtml({
      projectId,
      project,
      status,
      score,
      counts,
      checklist,
      missingItems,
      assemblies,
      welds,
      inspections,
      documents,
      photos,
    });
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900');
    if (!printWindow) {
      setExportMessage('Popup geblokkeerd. Sta popups toe om het printbare PDF dossier te openen.');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  const handleDownload = async (item: ExportJob) => {
    const rowId = String(item.id || '');
    const kind = String(item.type || item.export_type || item.bundle_type || 'ce').toLowerCase() as CeExportKind;

    if (!rowId) return;
    setDownloadingId(rowId);
    setExportMessage(null);

    try {
      const localItem = rowId.startsWith('local-');
      if (localItem) {
        const snapshot = buildSnapshot();
        if (kind === 'excel') {
          downloadCsv(`ce-export-${String(projectId)}.csv`, [
            { label: 'Project', value: asText(project.name || project.omschrijving || project.projectnummer, '—') },
            { label: 'Status', value: status },
            { label: 'Score', value: score },
            { label: 'Assemblies', value: Number(counts.assemblies || assemblies.length || 0) },
            { label: 'Lassen', value: Number(counts.welds || welds.length || 0) },
            { label: 'Inspecties', value: Number(counts.inspections || inspections.length || 0) },
            { label: 'Documenten', value: Number(counts.documents || documents.length || 0) },
          ]);
          setExportMessage('Lokale Excel exportset gedownload.');
        } else if (kind === 'pdf') {
          downloadTextFile(`ce-dossier-${String(projectId)}.html`, buildPdfHtml({
            projectId,
            project,
            status,
            score,
            counts,
            checklist,
            missingItems,
            assemblies,
            welds,
            inspections,
            documents,
            photos,
          }), 'text/html;charset=utf-8;');
          setExportMessage('Printbare HTML/PDF-layout gedownload. Open het bestand in de browser en kies Afdrukken > Opslaan als PDF.');
        } else {
          downloadTextFile(`ce-export-${kind}-${String(projectId)}.json`, JSON.stringify(snapshot, null, 2));
          setExportMessage(`Lokale ${kind.toUpperCase()} exportset gedownload.`);
        }
        return;
      }

      const blob = await downloadExport.mutateAsync(rowId);
      const url = URL.createObjectURL(blob as Blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `project-export-${rowId}`;
      anchor.click();
      URL.revokeObjectURL(url);
      setExportMessage('Exportbestand gedownload.');
    } catch {
      setExportMessage('Download niet beschikbaar via live API. Gebruik voorlopig de lokale exportset of controleer backend export-download.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRetry = async (item: ExportJob) => {
    const rowId = String(item.id || '');
    if (!rowId) return;
    if (rowId.startsWith('local-')) {
      setExportMessage('Lokale exportsets hoeven niet opnieuw gestart te worden; start simpelweg een nieuwe exportactie.');
      return;
    }

    setRetryingId(rowId);
    setExportMessage(null);
    try {
      await retryExport.mutateAsync(rowId);
      await invalidateExportQueries();
      setExportMessage('Export opnieuw gestart.');
    } catch {
      setExportMessage('Opnieuw starten wordt nog niet ondersteund door de live API voor deze export.');
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        title="CE Dossier"
        description="CE PRO blok D: print/PDF-layout, dossieropbouw en exportafwerking zijn nu toegevoegd binnen de projectcontext."
      />

      {!hasProject ? <InlineMessage tone="danger">Selecteer eerst een project om het CE-overzicht te laden.</InlineMessage> : null}

      <ProjectScopePicker description="Blok D voegt print/PDF-layout, dossieropbouw en exportafwerking toe aan het CE-dossier." />

      <Card>
        <div className="toolbar-cluster" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="list-subtle">Bron: {source}</div>
          <Button type="button" variant="secondary" onClick={() => ceQuery.refetch()} disabled={!projectId || ceQuery.isFetching}>
            <RefreshCcw size={16} /> Herladen
          </Button>
        </div>
      </Card>

      {exportMessage ? <InlineMessage tone="neutral">{exportMessage}</InlineMessage> : null}
      {ceQuery.isLoading ? <LoadingState label="CE-overzicht laden..." /> : null}
      {ceQuery.isError ? <InlineMessage tone="danger">De CE-dossierdata kon niet worden opgebouwd uit de live projectdata.</InlineMessage> : null}

      {!ceQuery.isLoading && !ceQuery.isError ? (
        <>
          <CeStatusPanel
            project={project}
            status={status}
            score={score}
            readyForExport={Boolean(data.ready_for_export)}
            source={source}
            missingCount={missingItems.length}
          />

          <div className="content-grid-2">
            <CeDossierStructureCard
              counts={counts}
              assemblies={assemblies}
              welds={welds}
              inspections={inspections}
              documents={documents}
              photos={photos}
            />
            <CeChecklistCard checklist={checklist} />
          </div>

          <div className="content-grid-2">
            <CeMissingItemsCard missingItems={missingItems} />
            <CeDataGroupsCard
              assemblies={assemblies}
              welds={welds}
              inspections={inspections}
              documents={documents}
            />
          </div>

          <div className="content-grid-2">
            <CePdfLayoutCard
              project={project}
              status={status}
              score={score}
              counts={counts}
              checklist={checklist}
              missingItems={missingItems}
              assemblies={assemblies}
              welds={welds}
              inspections={inspections}
              documents={documents}
              photos={photos}
              onPrint={handlePrintPdf}
            />
            <CeDossierContentsCard
              assemblies={assemblies}
              welds={welds}
              inspections={inspections}
              documents={documents}
              photos={photos}
            />
          </div>

          <div className="content-grid-2">
            <CeExportActionsCard pending={pending} onExport={handleExport} preview={exportPreview} />
            <CeExportManifestCard manifest={manifest} exportItem={selectedExport} />
          </div>

          <CeExportHistoryCard
            items={exportItems}
            selectedExportId={selectedExport?.id || null}
            onSelect={(item) => setSelectedExport(item)}
            onDownload={handleDownload}
            onRetry={handleRetry}
            downloadingId={downloadingId}
            retryingId={retryingId}
          />
        </>
      ) : null}
    </div>
  );
}

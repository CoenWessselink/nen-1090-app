import { useMemo, useState } from 'react';
import { Download, Eye, FileText, Pencil, RefreshCcw, Trash2, Upload } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/overlays/Modal';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { UploadDropzone } from '@/components/upload/UploadDropzone';
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog';
import { UploadProgress } from '@/components/upload/UploadProgress';
import { ProjectScopePicker } from '@/components/project-scope/ProjectScopePicker';
import { useProjectContext } from '@/context/ProjectContext';
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
  useProjectExports,
  useRetryProjectExport,
} from '@/hooks/useCompliance';
import {
  useCreateProjectDocument,
  useDeleteDocument,
  useDocumentVersions,
  useDownloadDocument,
  useProjectDocuments,
  useUpdateDocument,
} from '@/hooks/useDocuments';
import { ExportCenterDrawer } from '@/features/ce-dossier/components/ExportCenterDrawer';
import type { CeDocument, ExportJob } from '@/types/domain';
import { formatDate } from '@/utils/format';

type UploadQueueItem = {
  id: string;
  name: string;
  progress: number;
  status: 'uploading' | 'done' | 'failed';
};

function tone(status?: string) {
  const value = String(status || '').toLowerCase();
  if (['ready', 'gereed', 'conform', 'done', 'success', 'completed', 'actief', 'beschikbaar'].includes(value)) return 'success' as const;
  if (['open', 'error', 'missing', 'afgekeurd', 'failed', 'mislukt'].includes(value)) return 'danger' as const;
  return 'warning' as const;
}

function toArray(payload: unknown, fallback?: string) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const source = payload as Record<string, unknown>;
  const candidate = source.items || source.data || source.results || (fallback ? source[fallback] : undefined);
  return Array.isArray(candidate) ? candidate : [];
}

function createObjectDownload(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 250);
}

export function CeDossierPage() {
  const { projectId, hasProject, projectLabel } = useProjectContext();
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [activeDocument, setActiveDocument] = useState<CeDocument | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CeDocument | null>(null);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [exportDrawerOpen, setExportDrawerOpen] = useState(false);

  const complianceQuery = useComplianceOverview(projectId);
  const ceDossierQuery = useCeDossier(projectId);
  const checklistQuery = useComplianceChecklist(projectId);
  const missingItemsQuery = useComplianceMissingItems(projectId);
  const documentsQuery = useProjectDocuments(projectId, search ? { search } : undefined);
  const versionsQuery = useDocumentVersions(activeDocument?.id);
  const exportsQuery = useProjectExports(projectId);
  const createDocument = useCreateProjectDocument(projectId);
  const updateDocument = useUpdateDocument();
  const deleteDocument = useDeleteDocument();
  const downloadDocument = useDownloadDocument();
  const exportCe = useCreateCeReport(projectId || '');
  const exportZip = useCreateZipExport(projectId || '');
  const exportPdf = useCreatePdfExport(projectId || '');
  const exportExcel = useCreateExcelExport(projectId || '');
  const downloadExport = useDownloadProjectExport(projectId || '');
  const retryExport = useRetryProjectExport(projectId || '');

  const checklistItems = useMemo(() => toArray(checklistQuery.data, 'checklist'), [checklistQuery.data]);
  const missingItems = useMemo(() => toArray(missingItemsQuery.data, 'missing_items'), [missingItemsQuery.data]);
  const ceDossierSections = useMemo(() => toArray(ceDossierQuery.data, 'sections'), [ceDossierQuery.data]);
  const documents = documentsQuery.data?.items || [];
  const exportItems = exportsQuery.data?.items || [];
  const versionItems = versionsQuery.data?.items || [];

  async function handleFiles(files: File[]) {
    if (!projectId || !files.length) return;

    for (const file of files) {
      const queueId = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setUploadQueue((current) => [{ id: queueId, name: file.name, progress: 10, status: 'uploading' }, ...current]);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('project_id', projectId);
        setUploadQueue((current) => current.map((item) => item.id === queueId ? { ...item, progress: 55 } : item));
        await createDocument.mutateAsync(formData);
        setUploadQueue((current) => current.map((item) => item.id === queueId ? { ...item, progress: 100, status: 'done' } : item));
      } catch {
        setUploadQueue((current) => current.map((item) => item.id === queueId ? { ...item, progress: 100, status: 'failed' } : item));
      }
    }

    setMessage(`${files.length} document${files.length === 1 ? '' : 'en'} verwerkt voor project ${projectId}.`);
  }

  async function runExport(kind: 'ce' | 'zip' | 'pdf' | 'excel') {
    if (!projectId) return;
    if (kind === 'ce') await exportCe.mutateAsync();
    if (kind === 'zip') await exportZip.mutateAsync();
    if (kind === 'pdf') await exportPdf.mutateAsync();
    if (kind === 'excel') await exportExcel.mutateAsync();
    await exportsQuery.refetch();
    setMessage(`${kind.toUpperCase()} export gestart.`);
  }

  return (
    <div className="page-stack">
      <PageHeader title="CE Dossier" description="Project-scoped dossiermodule met compliance, missing items, documentbeheer, versies en exporthistorie." />
      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}
      {!hasProject ? <InlineMessage tone="danger">Selecteer eerst een projectscope om compliance, documenten en exports te laden.</InlineMessage> : null}

      <ProjectScopePicker description="CE-dossier, documenten en exports werken volledig project-scoped op basis van het actieve project." />

      <Card>
        <div className="two-column-grid">
          <Input value={projectLabel} disabled placeholder="Actief project" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoek in projectdocumenten" disabled={!hasProject} />
        </div>
        <div className="toolbar-cluster" style={{ marginTop: 16 }}>
          <Button type="button" onClick={() => setExportDrawerOpen(true)} disabled={!projectId}>
            <Download size={16} /> Exportcentrum
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void complianceQuery.refetch();
              void checklistQuery.refetch();
              void missingItemsQuery.refetch();
              void documentsQuery.refetch();
              void exportsQuery.refetch();
              void ceDossierQuery.refetch();
              setMessage('CE dossier opnieuw geladen.');
            }}
            disabled={!hasProject}
          >
            <RefreshCcw size={16} /> Herladen
          </Button>
        </div>
      </Card>

      <div className="content-grid-2">
        <Card>
          <div className="section-title-row"><h3>Dossierstatus</h3></div>
          {complianceQuery.isLoading ? <LoadingState label="Compliance laden..." /> : null}
          {complianceQuery.isError ? <ErrorState title="Compliance niet geladen" description="Controleer /projects/{project_id}/compliance." /> : null}
          {!complianceQuery.isLoading && !complianceQuery.isError ? (
            <>
              <div className="progress-shell"><div className="progress-bar" style={{ width: `${Math.min(Number(complianceQuery.data?.score || 0), 100)}%` }} /></div>
              <div className="detail-grid">
                <div><span>Dossier score</span><strong>{Number(complianceQuery.data?.score || 0)}%</strong></div>
                <div><span>Missende items</span><strong>{missingItems.length}</strong></div>
                <div><span>Documenten</span><strong>{documents.length}</strong></div>
                <div><span>Exports</span><strong>{exportItems.length}</strong></div>
                <div><span>Checks gereed</span><strong>{Number((complianceQuery.data as Record<string, unknown> | undefined)?.validation_summary && ((complianceQuery.data as Record<string, unknown>).validation_summary as Record<string, unknown>).completed_checks || 0)}</strong></div>
              </div>
            </>
          ) : null}
        </Card>

        <Card>
          <div className="section-title-row"><h3>CE dossierstructuur</h3></div>
          {ceDossierQuery.isLoading ? <LoadingState label="CE dossier laden..." /> : null}
          {ceDossierQuery.isError ? <ErrorState title="CE dossier niet geladen" description="Controleer /projects/{project_id}/ce-dossier." /> : null}
          {!ceDossierQuery.isLoading && !ceDossierSections.length ? (
            <EmptyState title="Nog geen dossiersecties" description="De backend retourneerde nog geen dossierstructuur voor dit project." />
          ) : null}
          <div className="list-stack compact-list">
            {ceDossierSections.map((section, index) => {
              const row = section as Record<string, unknown>;
              return (
                <div key={`${String(row.id || row.name || index)}`} className="list-row">
                  <div>
                    <strong>{String(row.label || row.name || `Sectie ${index + 1}`)}</strong>
                    <div className="list-subtle">{String(row.description || row.type || '')}</div>
                  </div>
                  <Badge tone={row.completed ? 'success' : 'warning'}>{row.completed ? 'Gereed' : 'Open'}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="content-grid-2">
        <Card>
          <div className="section-title-row"><h3>Checklist</h3></div>
          {checklistQuery.isLoading ? <LoadingState label="Checklist laden..." /> : null}
          {!checklistQuery.isLoading && !checklistItems.length ? <EmptyState title="Geen checklist-items" description="De backend gaf nog geen checklist terug voor dit project." /> : null}
          <div className="list-stack compact-list">
            {checklistItems.map((item, index) => {
              const row = item as Record<string, unknown>;
              return <div key={index} className="list-row"><div><strong>{String(row.label || row.name || `Checklist item ${index + 1}`)}</strong><div className="list-subtle">{String(row.description || '')}</div></div><Badge tone={row.completed ? 'success' : 'warning'}>{row.completed ? 'Gereed' : 'Open'}</Badge></div>;
            })}
          </div>
        </Card>

        <Card>
          <div className="section-title-row"><h3>Missende items</h3></div>
          {missingItemsQuery.isLoading ? <LoadingState label="Missende items laden..." /> : null}
          {!missingItemsQuery.isLoading && !missingItems.length ? <EmptyState title="Geen missende items" description="Er zijn geen open missing items volgens de backend." /> : null}
          <div className="list-stack compact-list">
            {missingItems.map((item, index) => {
              const row = item as Record<string, unknown>;
              const severity = String(row.severity || 'danger').toLowerCase();
              const badgeTone = severity === 'warning' ? 'warning' : 'danger';
              return <div key={index} className="list-row"><div><strong>{String(row.label || row.name || `Missing item ${index + 1}`)}</strong><div className="list-subtle">{String(row.reason || row.description || '')}</div></div><Badge tone={badgeTone}>{severity === 'warning' ? 'Waarschuwing' : 'Blokkerend'}</Badge></div>;
            })}
          </div>
        </Card>
      </div>

      <Card>
        <div className="section-title-row"><h3><FileText size={18} /> Documentbeheer</h3></div>
        <UploadDropzone multiple disabled={!projectId || createDocument.isPending} onFiles={(files) => { void handleFiles(files); }} />
        <div className="list-subtle" style={{ marginTop: 12 }}>Multi-upload is actief. Certificaten, rapporten, foto's en PDF's worden per project naar de bestaande backend doorgestuurd.</div>
        {uploadQueue.length ? (
          <div className="upload-progress-list" style={{ marginTop: 16 }}>
            {uploadQueue.map((item) => (
              <div key={item.id} className="upload-progress-row">
                <div className="upload-progress-header">
                  <strong>{item.name}</strong>
                  <Badge tone={item.status === 'done' ? 'success' : item.status === 'failed' ? 'danger' : 'warning'}>
                    {item.status === 'done' ? 'Verwerkt' : item.status === 'failed' ? 'Mislukt' : 'Uploaden'}
                  </Badge>
                </div>
                <UploadProgress progress={item.progress} />
              </div>
            ))}
          </div>
        ) : null}

        <div className="list-stack" style={{ marginTop: 16 }}>
          {documentsQuery.isLoading ? <LoadingState label="Documenten laden..." /> : null}
          {documentsQuery.isError ? <ErrorState title="Documenten niet geladen" description="Controleer /projects/{project_id}/documents." /> : null}
          {!documentsQuery.isLoading && !documents.length ? <EmptyState title="Geen documenten" description="Upload een document voor dit project." /> : null}
          {documents.map((document) => (
            <div key={String(document.id)} className="list-row">
              <div>
                <strong>{document.title || document.type || document.id}</strong>
                <div className="list-subtle">Versie {document.version || '1.0'} · {document.type || 'Document'} · {formatDate(document.uploaded_at)}</div>
              </div>
              <div className="toolbar-cluster">
                <Badge tone={tone(document.status)}>{document.status || 'Actief'}</Badge>
                <button className="icon-button" type="button" onClick={() => setActiveDocument(document)} aria-label="Document detail en preview"><Eye size={16} /></button>
                <button className="icon-button" type="button" onClick={() => setActiveDocument(document)} aria-label="Metadata bewerken"><Pencil size={16} /></button>
                <button
                  className="icon-button"
                  type="button"
                  onClick={async () => {
                    if (document.download_url) {
                      window.open(String(document.download_url), '_blank', 'noopener,noreferrer');
                      return;
                    }
                    const blob = await downloadDocument.mutateAsync(document.id);
                    if (blob) createObjectDownload(blob, `${document.title || document.id}.bin`);
                  }}
                  aria-label="Download document"
                >
                  <Download size={16} />
                </button>
                <button className="icon-button" type="button" onClick={() => setPendingDelete(document)} aria-label="Verwijderen"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="section-title-row"><h3>Exporthistorie</h3></div>
        {exportsQuery.isLoading ? <LoadingState label="Exporthistorie laden..." /> : null}
        {!exportsQuery.isLoading && !exportItems.length ? <EmptyState title="Nog geen exports" description="Start een export om historie te tonen." /> : null}
        <div className="list-stack compact-list">
          {(exportItems as ExportJob[]).map((item) => (
            <div key={String(item.id)} className="list-row">
              <div>
                <strong>{String(item.export_type || item.type || item.id)}</strong>
                <div className="list-subtle">{formatDate(item.created_at)}{item.bundle_type ? ` · ${String(item.bundle_type).toUpperCase()}` : ''}</div>
              </div>
              <div className="toolbar-cluster">
                <Badge tone={tone(item.status)}>{item.status || 'Aangemaakt'}</Badge>
                {item.retry_count ? <Badge tone="warning">Retries {String(item.retry_count)}</Badge> : null}
                {item.error_code ? <Badge tone="danger">{String(item.error_code)}</Badge> : null}
                {item.download_url ? (
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={async () => {
                      const blob = await downloadExport.mutateAsync(item.id);
                      const extension = String(item.bundle_type || 'bin').toLowerCase() === 'excel' ? 'xlsx' : String(item.bundle_type || 'bin').toLowerCase() === 'pdf' ? 'pdf' : 'zip';
                      if (blob) createObjectDownload(blob, `export-${String(item.id)}.${extension}`);
                    }}
                  >
                    <Download size={16} /> Download
                  </button>
                ) : null}
                {!item.download_url && (item.status === 'failed' || item.status === 'mislukt') ? (
                  <button className="btn btn-secondary" type="button" onClick={async () => { await retryExport.mutateAsync(item.id); await exportsQuery.refetch(); setMessage('Export opnieuw gestart.'); }}>
                    <RefreshCcw size={16} /> Opnieuw
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={!!activeDocument} onClose={() => setActiveDocument(null)} title="Document metadata" size="large">
        {activeDocument ? (
          <div className="detail-stack">
            <div className="two-column-grid">
              <Input defaultValue={String(activeDocument.title || '')} placeholder="Titel" onBlur={(event) => updateDocument.mutate({ documentId: activeDocument.id, payload: { title: event.target.value, type: activeDocument.type, status: activeDocument.status } })} />
              <Input defaultValue={String(activeDocument.type || '')} placeholder="Type" onBlur={(event) => updateDocument.mutate({ documentId: activeDocument.id, payload: { title: activeDocument.title, type: event.target.value, status: activeDocument.status } })} />
            </div>
            <div className="list-row"><div><strong>Status</strong><div className="list-subtle">Wijzig metadata door uit het veld te klikken.</div></div><Badge tone={tone(activeDocument.status)}>{activeDocument.status || 'Actief'}</Badge></div>
            <div className="preview-panel">
              <div className="section-title-row"><h3>Preview / download</h3></div>
              {activeDocument.download_url ? (
                <>
                  <iframe title="Document preview" src={String(activeDocument.download_url)} className="preview-frame" />
                  <div className="toolbar-cluster">
                    <a className="btn btn-primary" href={String(activeDocument.download_url)} target="_blank" rel="noreferrer"><Download size={16} /> Download</a>
                  </div>
                </>
              ) : (
                <EmptyState title="Geen preview-url" description="De backend heeft nog geen download_url voor dit document geretourneerd." />
              )}
            </div>
            <Card>
              <div className="section-title-row"><h3>Versielijst</h3></div>
              {versionsQuery.isLoading ? <LoadingState label="Versies laden..." /> : null}
              {!versionsQuery.isLoading && !versionItems.length ? <EmptyState title="Geen versies" description="De backend retourneerde geen versies voor dit document." /> : null}
              <div className="list-stack compact-list">
                {versionItems.map((version) => (
                  <div key={String(version.id)} className="list-row"><div><strong>{version.title || version.id}</strong><div className="list-subtle">Versie {version.version || '1.0'}</div></div><Badge tone={tone(version.status)}>{version.status || 'Actief'}</Badge></div>
                ))}
              </div>
            </Card>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Document verwijderen"
        description="Dit document wordt verwijderd uit het CE dossier van dit project."
        danger
        confirmLabel="Verwijderen"
        onConfirm={async () => {
          if (!pendingDelete) return;
          await deleteDocument.mutateAsync(pendingDelete.id);
          setMessage('Document verwijderd.');
          setPendingDelete(null);
        }}
        onClose={() => setPendingDelete(null)}
      />

      <ExportCenterDrawer
        open={exportDrawerOpen}
        onClose={() => setExportDrawerOpen(false)}
        onExport={(kind) => {
          void runExport(kind);
          setExportDrawerOpen(false);
        }}
        pending={{
          ce: exportCe.isPending,
          zip: exportZip.isPending,
          pdf: exportPdf.isPending,
          excel: exportExcel.isPending,
        }}
      />
    </div>
  );
}

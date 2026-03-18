import { useMemo, useState } from 'react';
import { CheckCircle2, Download, FileText, Pencil, Plus, SearchCheck, ShieldCheck, Trash2, Wrench } from 'lucide-react';
import { Drawer } from '@/components/overlays/Drawer';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/overlays/Modal';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { UploadDropzone } from '@/components/upload/UploadDropzone';
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog';
import { useAssemblies, useCreateAssembly, useDeleteAssembly, useUpdateAssembly } from '@/hooks/useAssemblies';
import { useComplianceChecklist, useComplianceMissingItems, useComplianceOverview, useCreateCeReport, useCreateExcelExport, useCreatePdfExport, useCreateZipExport, useProjectExports } from '@/hooks/useCompliance';
import { useCreateProjectDocument, useDeleteDocument, useDocumentVersions, useProjectDocuments, useUpdateDocument } from '@/hooks/useDocuments';
import { useProjectInspections, useProjectWelds } from '@/hooks/useProjects';
import { formatDate } from '@/utils/format';
import type { Assembly, CeDocument, ExportJob, Inspection, Project, Weld } from '@/types/domain';
import { AssemblyForm } from '@/features/projecten/components/AssemblyForm';

function tone(status?: string) {
  const value = String(status || '').toLowerCase();
  if (['vrijgegeven', 'conform', 'gereed', 'goedgekeurd', 'approved', 'resolved'].includes(value)) return 'success' as const;
  if (['afgekeurd', 'open', 'blokkerend', 'rejected'].includes(value)) return 'danger' as const;
  return 'warning' as const;
}

function pickArray(payload: unknown, fallbackKey?: string) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const source = payload as Record<string, unknown>;
  const direct = source.items || source.data || source.results || (fallbackKey ? source[fallbackKey] : undefined);
  return Array.isArray(direct) ? direct : [];
}

export function Project360Drawer({ project, open, onClose, onMessage }: { project: Project | null; open: boolean; onClose: () => void; onMessage: (message: string) => void }) {
  const [tab, setTab] = useState('samenvatting');
  const [subSearch, setSubSearch] = useState('');
  const [assemblyModal, setAssemblyModal] = useState<{ mode: 'create' | 'edit'; item?: Assembly } | null>(null);
  const [documentModal, setDocumentModal] = useState<CeDocument | null>(null);
  const [pendingDeleteAssembly, setPendingDeleteAssembly] = useState<Assembly | null>(null);
  const [pendingDeleteDocument, setPendingDeleteDocument] = useState<CeDocument | null>(null);
  const projectId = project?.id;

  const assembliesQuery = useAssemblies(String(projectId || ''));
  const weldsQuery = useProjectWelds(projectId, { limit: 10, search: subSearch || undefined, sort: 'weld_number' });
  const inspectionsQuery = useProjectInspections(projectId, { limit: 10, search: subSearch || undefined, sort: 'due_date' });
  const documentsQuery = useProjectDocuments(String(projectId || ''));
  const documentVersionsQuery = useDocumentVersions(documentModal?.id);
  const complianceQuery = useComplianceOverview(projectId);
  const missingItemsQuery = useComplianceMissingItems(projectId);
  const checklistQuery = useComplianceChecklist(projectId);
  const exportsQuery = useProjectExports(projectId);

  const createAssembly = useCreateAssembly(String(projectId || ''));
  const updateAssembly = useUpdateAssembly(String(projectId || ''));
  const deleteAssembly = useDeleteAssembly(String(projectId || ''));
  const createDocument = useCreateProjectDocument(String(projectId || ''));
  const updateDocument = useUpdateDocument();
  const deleteDocument = useDeleteDocument();
  const exportCe = useCreateCeReport(String(projectId || ''));
  const exportZip = useCreateZipExport(String(projectId || ''));
  const exportPdf = useCreatePdfExport(String(projectId || ''));
  const exportExcel = useCreateExcelExport(String(projectId || ''));

  const assemblies = assembliesQuery.data?.items || [];
  const welds = useMemo(() => weldsQuery.data?.items || [], [weldsQuery.data]);
  const inspections = useMemo(() => inspectionsQuery.data?.items || [], [inspectionsQuery.data]);
  const documents = documentsQuery.data?.items || [];
  const missingItems = useMemo(() => pickArray(missingItemsQuery.data, 'missing_items'), [missingItemsQuery.data]);
  const checklistItems = useMemo(() => pickArray(checklistQuery.data, 'checklist'), [checklistQuery.data]);
  const exportItems = (exportsQuery.data?.items || []) as ExportJob[];

  const summaryCards = [
    { label: 'Assemblies', value: assembliesQuery.data?.total ?? assemblies.length },
    { label: 'Welds', value: weldsQuery.data?.total ?? welds.length },
    { label: 'Inspecties', value: inspectionsQuery.data?.total ?? inspections.length },
    { label: 'Documenten', value: documents.length },
    { label: 'Missende items', value: missingItems.length },
  ];

  return (
    <Drawer open={open} onClose={onClose} title="Project 360°">
      {project ? (
        <div className="detail-stack">
          <div className="detail-hero">
            <div>
              <h3>{project.name || project.omschrijving || project.projectnummer}</h3>
              <div className="list-subtle">{project.client_name || project.opdrachtgever || '—'} · {project.execution_class || project.executieklasse || '—'}</div>
            </div>
            <Badge tone={tone(String(project.status || ''))}>{String(project.status || 'Onbekend')}</Badge>
          </div>

          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'samenvatting', label: 'Samenvatting' },
              { value: 'assemblies', label: 'Assemblies' },
              { value: 'welds', label: 'Welds' },
              { value: 'inspections', label: 'Inspecties' },
              { value: 'documenten', label: 'Documenten' },
              { value: 'compliance', label: 'Compliance' },
              { value: 'exports', label: 'Exports' },
            ]}
          />

          {['welds', 'inspections'].includes(tab) ? (
            <Card>
              <Input value={subSearch} onChange={(event) => setSubSearch(event.target.value)} placeholder="Zoek binnen projectdetail" />
            </Card>
          ) : null}

          {tab === 'samenvatting' ? (
            <>
              <div className="content-grid-2">
                {summaryCards.map((item) => <Card key={item.label}><div className="metric-card"><span>{item.label}</span><strong>{item.value}</strong></div></Card>)}
              </div>
              <div className="detail-grid">
                <div><span>Projectnummer</span><strong>{String(project.projectnummer || project.id)}</strong></div>
                <div><span>Startdatum</span><strong>{formatDate(project.start_date)}</strong></div>
                <div><span>Einddatum</span><strong>{formatDate(project.end_date)}</strong></div>
                <div><span>Opdrachtgever</span><strong>{String(project.client_name || project.opdrachtgever || '—')}</strong></div>
              </div>
            </>
          ) : null}

          {tab === 'assemblies' ? (
            <Card>
              <div className="section-title-row">
                <h3><Wrench size={18} /> Assemblies</h3>
                <Button onClick={() => setAssemblyModal({ mode: 'create' })}><Plus size={16} /> Nieuwe assembly</Button>
              </div>
              {assembliesQuery.isLoading ? <LoadingState label="Assemblies laden..." /> : null}
              {assembliesQuery.isError ? <ErrorState title="Assemblies niet geladen" description="Controleer de project-scoped assemblies endpoints in de backend." /> : null}
              {!assembliesQuery.isLoading && !assembliesQuery.isError && !assemblies.length ? <EmptyState title="Nog geen assemblies" description="Voeg een assembly toe binnen dit project." /> : null}
              <div className="list-stack">
                {assemblies.map((assembly) => (
                  <div key={String(assembly.id)} className="list-row">
                    <div>
                      <strong>{assembly.code || assembly.name || assembly.id}</strong>
                      <div className="list-subtle">{assembly.name || 'Naam ontbreekt'}</div>
                    </div>
                    <div className="toolbar-cluster">
                      <Badge tone={tone(assembly.status)}>{assembly.status || 'Open'}</Badge>
                      <button className="icon-button" type="button" onClick={() => setAssemblyModal({ mode: 'edit', item: assembly })} aria-label="Assembly bewerken"><Pencil size={16} /></button>
                      <button className="icon-button" type="button" onClick={() => setPendingDeleteAssembly(assembly)} aria-label="Assembly verwijderen"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {tab === 'welds' ? (
            <Card>
              <div className="section-title-row"><h3><ShieldCheck size={18} /> Welds</h3><Badge tone="neutral">{weldsQuery.data?.total ?? welds.length}</Badge></div>
              {weldsQuery.isLoading ? <LoadingState label="Welds laden..." /> : null}
              {weldsQuery.isError ? <ErrorState title="Welds niet geladen" description="Controleer GET /projects/{project_id}/welds in de backend." /> : null}
              {!weldsQuery.isLoading && !welds.length ? <EmptyState title="Geen welds" description="Nog geen welds gevonden binnen dit project." /> : null}
              <div className="list-stack compact-list">
                {welds.map((item: Weld) => (
                  <div key={String(item.id)} className="list-row">
                    <div>
                      <strong>{item.weld_number || item.id}</strong>
                      <div className="list-subtle">{item.welder_name || 'Lasser onbekend'} · {item.location || 'Locatie onbekend'}</div>
                    </div>
                    <Badge tone={tone(item.status)}>{item.status || 'Open'}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {tab === 'inspections' ? (
            <Card>
              <div className="section-title-row"><h3><SearchCheck size={18} /> Inspecties</h3><Badge tone="neutral">{inspectionsQuery.data?.total ?? inspections.length}</Badge></div>
              {inspectionsQuery.isLoading ? <LoadingState label="Inspecties laden..." /> : null}
              {inspectionsQuery.isError ? <ErrorState title="Inspecties niet geladen" description="Controleer GET /projects/{project_id}/inspections in de backend." /> : null}
              {!inspectionsQuery.isLoading && !inspections.length ? <EmptyState title="Geen inspecties" description="Nog geen inspecties gekoppeld aan dit project." /> : null}
              <div className="list-stack compact-list">
                {inspections.map((item: Inspection) => (
                  <div key={String(item.id)} className="list-row">
                    <div>
                      <strong>Inspectie {String(item.id)}</strong>
                      <div className="list-subtle">Weld {String(item.weld_id || '—')} · {formatDate(item.due_date)}</div>
                    </div>
                    <div className="toolbar-cluster">
                      <Badge tone={tone(item.result)}>{item.result || 'Pending'}</Badge>
                      <Badge tone={tone(item.status)}>{item.status || 'Open'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {tab === 'documenten' ? (
            <Card>
              <div className="section-title-row">
                <h3><FileText size={18} /> Projectdocumenten</h3>
              </div>
              <UploadDropzone
                multiple={false}
                disabled={createDocument.isPending}
                onFiles={async (files) => {
                  const file = files[0];
                  if (!file || !projectId) return;
                  const formData = new FormData();
                  formData.append('file', file);
                  formData.append('project_id', String(projectId));
                  await createDocument.mutateAsync(formData);
                  onMessage(`Document ${file.name} geüpload.`);
                }}
              />
              <div className="list-stack" style={{ marginTop: 16 }}>
                {documentsQuery.isLoading ? <LoadingState label="Documenten laden..." /> : null}
                {documentsQuery.isError ? <ErrorState title="Documenten niet geladen" description="Controleer de documenten-endpoints voor dit project." /> : null}
                {!documentsQuery.isLoading && !documents.length ? <EmptyState title="Geen documenten" description="Upload een eerste document voor dit project." /> : null}
                {documents.map((document) => (
                  <div key={String(document.id)} className="list-row">
                    <div>
                      <strong>{document.title || document.type || document.id}</strong>
                      <div className="list-subtle">Versie {document.version || '1.0'} · {document.type || 'Document'} · {formatDate(document.uploaded_at)}</div>
                    </div>
                    <div className="toolbar-cluster">
                      <Badge tone={tone(document.status)}>{document.status || 'Actief'}</Badge>
                      <button className="icon-button" type="button" onClick={() => setDocumentModal(document)} aria-label="Document bewerken"><Pencil size={16} /></button>
                      <button className="icon-button" type="button" onClick={() => setPendingDeleteDocument(document)} aria-label="Document verwijderen"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {tab === 'compliance' ? (
            <>
              <Card>
                <div className="section-title-row">
                  <h3><CheckCircle2 size={18} /> Compliance-overzicht</h3>
                </div>
                {complianceQuery.isLoading ? <LoadingState label="Compliance laden..." /> : null}
                {complianceQuery.isError ? <ErrorState title="Compliance niet geladen" description="Controleer /projects/{project_id}/compliance in de backend." /> : null}
                {!complianceQuery.isLoading && !complianceQuery.isError ? (
                  <>
                    <div className="progress-shell"><div className="progress-bar" style={{ width: `${Math.min(Number(complianceQuery.data?.score || 0), 100)}%` }} /></div>
                    <div className="detail-grid">
                      <div><span>Score</span><strong>{Number(complianceQuery.data?.score || 0)}%</strong></div>
                      <div><span>Missende items</span><strong>{missingItems.length}</strong></div>
                    </div>
                  </>
                ) : null}
              </Card>
              <div className="content-grid-2">
                <Card>
                  <div className="section-title-row"><h3>Checklist</h3></div>
                  <div className="list-stack compact-list">
                    {checklistItems.length ? checklistItems.map((item, index) => {
                      const row = item as Record<string, unknown>;
                      return <div key={index} className="list-row"><div><strong>{String(row.label || row.name || `Checklist item ${index + 1}`)}</strong><div className="list-subtle">{String(row.description || '')}</div></div><Badge tone={row.completed ? 'success' : 'warning'}>{row.completed ? 'Gereed' : 'Open'}</Badge></div>;
                    }) : <EmptyState title="Geen checklist-items" description="De backend retourneerde nog geen checklist." />}
                  </div>
                </Card>
                <Card>
                  <div className="section-title-row"><h3>Missende items</h3></div>
                  <div className="list-stack compact-list">
                    {missingItems.length ? missingItems.map((item, index) => {
                      const row = item as Record<string, unknown>;
                      return <div key={index} className="list-row"><div><strong>{String(row.label || row.name || `Ontbrekend item ${index + 1}`)}</strong><div className="list-subtle">{String(row.reason || row.description || '')}</div></div><Badge tone="danger">Open</Badge></div>;
                    }) : <EmptyState title="Geen missende items" description="Het dossier is volgens de backend compleet." />}
                  </div>
                </Card>
              </div>
            </>
          ) : null}

          {tab === 'exports' ? (
            <>
              <Card>
                <div className="section-title-row">
                  <h3><Download size={18} /> Exports</h3>
                </div>
                <div className="stack-actions">
                  <Button onClick={async () => { await exportCe.mutateAsync(); onMessage('CE-rapport export gestart.'); }} disabled={exportCe.isPending}>CE rapport</Button>
                  <Button variant="secondary" onClick={async () => { await exportZip.mutateAsync(); onMessage('ZIP export gestart.'); }} disabled={exportZip.isPending}>ZIP</Button>
                  <Button variant="secondary" onClick={async () => { await exportPdf.mutateAsync(); onMessage('PDF export gestart.'); }} disabled={exportPdf.isPending}>PDF</Button>
                  <Button variant="secondary" onClick={async () => { await exportExcel.mutateAsync(); onMessage('Excel export gestart.'); }} disabled={exportExcel.isPending}>Excel</Button>
                </div>
              </Card>
              <Card>
                <div className="section-title-row"><h3>Exporthistorie</h3></div>
                {exportsQuery.isLoading ? <LoadingState label="Exporthistorie laden..." /> : null}
                {!exportsQuery.isLoading && !exportItems.length ? <EmptyState title="Nog geen exports" description="Start een export om historie op te bouwen." /> : null}
                <div className="list-stack">
                  {exportItems.map((item) => (
                    <div key={String(item.id)} className="list-row">
                      <div><strong>{item.type || item.id}</strong><div className="list-subtle">{formatDate(item.created_at)}</div></div>
                      <Badge tone={tone(item.status)}>{item.status || 'Aangemaakt'}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : null}

          <Modal open={!!assemblyModal} onClose={() => setAssemblyModal(null)} title={assemblyModal?.mode === 'edit' ? 'Assembly bewerken' : 'Nieuwe assembly'} size="large">
            <AssemblyForm
              initial={assemblyModal?.item as Partial<Assembly>}
              isSubmitting={createAssembly.isPending || updateAssembly.isPending}
              onSubmit={async (values) => {
                if (assemblyModal?.mode === 'edit' && assemblyModal.item) {
                  await updateAssembly.mutateAsync({ assemblyId: assemblyModal.item.id, payload: values });
                  onMessage('Assembly bijgewerkt.');
                } else {
                  await createAssembly.mutateAsync(values);
                  onMessage('Assembly aangemaakt.');
                }
                setAssemblyModal(null);
              }}
            />
          </Modal>

          <Modal open={!!documentModal} onClose={() => setDocumentModal(null)} title="Document wijzigen" size="large">
            {documentModal ? (
              <div className="detail-stack">
                <Input value={String(documentModal.title || '')} onChange={(event) => setDocumentModal({ ...documentModal, title: event.target.value })} placeholder="Documenttitel" />
                <Input value={String(documentModal.type || '')} onChange={(event) => setDocumentModal({ ...documentModal, type: event.target.value })} placeholder="Documenttype" />
                <div className="stack-actions">
                  <Button onClick={async () => {
                    await updateDocument.mutateAsync({ documentId: documentModal.id, payload: { title: documentModal.title, type: documentModal.type } });
                    onMessage('Document bijgewerkt.');
                    setDocumentModal(null);
                  }} disabled={updateDocument.isPending}>Opslaan</Button>
                </div>
                <Card>
                  <div className="section-title-row"><h3>Versiehistorie</h3></div>
                  {documentVersionsQuery.isLoading ? <LoadingState label="Versies laden..." /> : null}
                  <pre className="code-block">{JSON.stringify(documentVersionsQuery.data || [], null, 2)}</pre>
                </Card>
              </div>
            ) : null}
          </Modal>

          <ConfirmDialog
            open={!!pendingDeleteAssembly}
            title="Assembly verwijderen"
            description="De assembly wordt verwijderd uit dit project."
            danger
            confirmLabel="Verwijderen"
            onConfirm={async () => {
              if (!pendingDeleteAssembly) return;
              await deleteAssembly.mutateAsync(pendingDeleteAssembly.id);
              onMessage('Assembly verwijderd.');
              setPendingDeleteAssembly(null);
            }}
            onClose={() => setPendingDeleteAssembly(null)}
          />

          <ConfirmDialog
            open={!!pendingDeleteDocument}
            title="Document verwijderen"
            description="Het document wordt verwijderd uit het projectdossier."
            danger
            confirmLabel="Verwijderen"
            onConfirm={async () => {
              if (!pendingDeleteDocument) return;
              await deleteDocument.mutateAsync(pendingDeleteDocument.id);
              onMessage('Document verwijderd.');
              setPendingDeleteDocument(null);
            }}
            onClose={() => setPendingDeleteDocument(null)}
          />
        </div>
      ) : null}
    </Drawer>
  );
}

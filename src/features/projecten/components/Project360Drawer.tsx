import { useMemo, useState } from 'react';
import { Boxes, CheckCircle2, Download, FileText, HardHat, History, Pencil, Plus, SearchCheck, ShieldCheck, Trash2, Wrench } from 'lucide-react';
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
import { useMaterials, useWelders, useWps } from '@/hooks/useSettings';
import { useProjectInspections, useProjectMaterials, useProjectSelectionMutation, useProjectWelders, useProjectWelds, useProjectWps, useProjectBulkMutation } from '@/hooks/useProjects';
import { useProjectAudit } from '@/hooks/useProjectAudit';
import { formatDate } from '@/utils/format';
import type { Assembly, AuditEntry, CeDocument, ExportJob, Inspection, Project, Weld } from '@/types/domain';
import { AssemblyForm } from '@/features/projecten/components/AssemblyForm';

function tone(status?: string) {
  const value = String(status || '').toLowerCase();
  if (['vrijgegeven', 'conform', 'gereed', 'goedgekeurd', 'approved', 'resolved', 'ok'].includes(value)) return 'success' as const;
  if (['afgekeurd', 'open', 'blokkerend', 'rejected', 'nok'].includes(value)) return 'danger' as const;
  return 'warning' as const;
}

function pickArray(payload: unknown, fallbackKey?: string) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const source = payload as Record<string, unknown>;
  const direct = source.items || source.data || source.results || (fallbackKey ? source[fallbackKey] : undefined);
  return Array.isArray(direct) ? direct : [];
}

function renderSimpleList(items: Record<string, unknown>[], emptyTitle: string, emptyDescription: string) {
  if (!items.length) return <EmptyState title={emptyTitle} description={emptyDescription} />;
  return (
    <div className="list-stack compact-list">
      {items.map((item, index) => (
        <div key={String(item.id || index)} className="list-row">
          <div>
            <strong>{String(item.code || item.name || item.title || item.id || `Record ${index + 1}`)}</strong>
            <div className="list-subtle">{String(item.title || item.name || item.description || '')}</div>
          </div>
          <Badge tone="success">Gekoppeld</Badge>
        </div>
      ))}
    </div>
  );
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
  const materialsQuery = useProjectMaterials(projectId);
  const wpsQuery = useProjectWps(projectId);
  const weldersQuery = useProjectWelders(projectId);
  const documentVersionsQuery = useDocumentVersions(documentModal?.id);
  const complianceQuery = useComplianceOverview(projectId);
  const missingItemsQuery = useComplianceMissingItems(projectId);
  const checklistQuery = useComplianceChecklist(projectId);
  const exportsQuery = useProjectExports(projectId);
  const auditQuery = useProjectAudit(projectId);

  const createAssembly = useCreateAssembly(String(projectId || ''));
  const updateAssembly = useUpdateAssembly(String(projectId || ''));
  const deleteAssembly = useDeleteAssembly(String(projectId || ''));
  const createDocument = useCreateProjectDocument(String(projectId || ''));
  const updateDocument = useUpdateDocument();
  const deleteDocument = useDeleteDocument();
  const bulkProjectAction = useProjectBulkMutation();
  const projectSelectionMutation = useProjectSelectionMutation();
  const masterMaterialsQuery = useMaterials();
  const masterWpsQuery = useWps();
  const masterWeldersQuery = useWelders();
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [selectedWpsId, setSelectedWpsId] = useState('');
  const [selectedWelderId, setSelectedWelderId] = useState('');
  const exportCe = useCreateCeReport(String(projectId || ''));
  const exportZip = useCreateZipExport(String(projectId || ''));
  const exportPdf = useCreatePdfExport(String(projectId || ''));
  const exportExcel = useCreateExcelExport(String(projectId || ''));

  const availableMaterials = useMemo(
    () => ((masterMaterialsQuery.data?.items || []) as Record<string, unknown>[]).filter((candidate) => !materials.some((item) => String(item.id) === String(candidate.id))),
    [masterMaterialsQuery.data, materials],
  );
  const availableWps = useMemo(
    () => ((masterWpsQuery.data?.items || []) as Record<string, unknown>[]).filter((candidate) => !wps.some((item) => String(item.id) === String(candidate.id))),
    [masterWpsQuery.data, wps],
  );
  const availableWelders = useMemo(
    () => ((masterWeldersQuery.data?.items || []) as Record<string, unknown>[]).filter((candidate) => !welders.some((item) => String(item.id) === String(candidate.id))),
    [masterWeldersQuery.data, welders],
  );

  const handleAddSelection = async (kind: 'material' | 'wps' | 'welder') => {
    if (!projectId) return;
    const refId = kind === 'material' ? selectedMaterialId : kind === 'wps' ? selectedWpsId : selectedWelderId;
    if (!refId) return;
    const action = kind === 'material' ? 'add-material' : kind === 'wps' ? 'add-wps' : 'add-welder';
    await projectSelectionMutation.mutateAsync({ action, projectId, refId });
    if (kind === 'material') setSelectedMaterialId('');
    if (kind === 'wps') setSelectedWpsId('');
    if (kind === 'welder') setSelectedWelderId('');
    onMessage(`${kind === 'material' ? 'Materiaal' : kind === 'wps' ? 'WPS' : 'Lasser'} gekoppeld aan project.`);
  };

  const handleRemoveSelection = async (kind: 'material' | 'wps' | 'welder', refId: string) => {
    if (!projectId || !refId) return;
    const action = kind === 'material' ? 'remove-material' : kind === 'wps' ? 'remove-wps' : 'remove-welder';
    await projectSelectionMutation.mutateAsync({ action, projectId, refId });
    onMessage(`${kind === 'material' ? 'Materiaal' : kind === 'wps' ? 'WPS' : 'Lasser'} verwijderd uit project.`);
  };

  const assemblies = assembliesQuery.data?.items || [];
  const welds = useMemo(() => weldsQuery.data?.items || [], [weldsQuery.data]);
  const inspections = useMemo(() => inspectionsQuery.data?.items || [], [inspectionsQuery.data]);
  const documents = documentsQuery.data?.items || [];
  const materials = useMemo(() => (materialsQuery.data?.items || []) as Record<string, unknown>[], [materialsQuery.data]);
  const wps = useMemo(() => (wpsQuery.data?.items || []) as Record<string, unknown>[], [wpsQuery.data]);
  const welders = useMemo(() => (weldersQuery.data?.items || []) as Record<string, unknown>[], [weldersQuery.data]);
  const missingItems = useMemo(() => pickArray(missingItemsQuery.data, 'missing_items'), [missingItemsQuery.data]);
  const checklistItems = useMemo(() => pickArray(checklistQuery.data, 'checklist'), [checklistQuery.data]);
  const exportItems = (exportsQuery.data?.items || []) as ExportJob[];
  const auditItems = (auditQuery.data?.items || []) as AuditEntry[];

  const summaryCards = [
    { label: 'Assemblies', value: assembliesQuery.data?.total ?? assemblies.length },
    { label: 'Welds', value: weldsQuery.data?.total ?? welds.length },
    { label: 'Inspecties', value: inspectionsQuery.data?.total ?? inspections.length },
    { label: 'Documenten', value: documents.length },
    { label: 'Missende items', value: missingItems.length },
  ];

  const tabs = [
    { value: 'samenvatting', label: 'Samenvatting' },
    { value: 'assemblies', label: 'Assemblies' },
    { value: 'welds', label: 'Welds / Lassen' },
    { value: 'inspections', label: 'Inspecties' },
    { value: 'documenten', label: 'Documenten' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'exports', label: 'Exports' },
    { value: 'materialen', label: 'Materialen' },
    { value: 'wps', label: 'WPS' },
    { value: 'lassers', label: 'Lassers' },
    { value: 'historie', label: 'Historie' },
  ];

  return (
    <Drawer open={open} onClose={onClose} title="Project 360°">
      {project ? (
        <div className="detail-stack">
          <div className="detail-hero">
            <div>
              <h3>{project.name || project.omschrijving || project.projectnummer}</h3>
              <div className="list-subtle">{project.client_name || project.opdrachtgever || '—'} · {project.execution_class || project.executieklasse || '—'} · {project.projectnummer || project.id}</div>
            </div>
            <Badge tone={tone(String(project.status || ''))}>{String(project.status || 'Onbekend')}</Badge>
          </div>

          <div className="toolbar-cluster">
            <Button variant="secondary" onClick={() => setAssemblyModal({ mode: 'create' })}><Plus size={16} /> Nieuw assembly</Button>
            <Button variant="secondary" onClick={() => setTab('welds')}><Plus size={16} /> Nieuwe las</Button>
            <Button variant="secondary" onClick={() => setTab('documenten')}><FileText size={16} /> Nieuw document</Button>
          </div>

          <Tabs value={tab} onChange={setTab} tabs={tabs} />

          <Card>
            <div className="section-title-row">
              <h3><SearchCheck size={18} /> Binnen project zoeken</h3>
            </div>
            <Input value={subSearch} onChange={(event) => setSubSearch(event.target.value)} placeholder="Zoek binnen projectdetail" />
          </Card>

          {tab === 'samenvatting' ? (
            <div className="content-grid-3">
              {summaryCards.map((card) => (
                <Card key={card.label}>
                  <div className="stat-card-value">{card.value}</div>
                  <div className="stat-card-label">{card.label}</div>
                </Card>
              ))}
              <Card>
                <div className="section-title-row"><h3>Projectheader</h3></div>
                <div className="detail-grid">
                  <div><span>Start</span><strong>{formatDate(project.start_date)}</strong></div>
                  <div><span>Eind</span><strong>{formatDate(project.end_date)}</strong></div>
                  <div><span>Status</span><strong>{String(project.status || '—')}</strong></div>
                  <div><span>Opdrachtgever</span><strong>{String(project.client_name || project.opdrachtgever || '—')}</strong></div>
                </div>
              </Card>
            </div>
          ) : null}

          {tab === 'assemblies' ? (
            <Card>
              <div className="section-title-row">
                <h3><Wrench size={18} /> Assemblies</h3>
                <Button onClick={() => setAssemblyModal({ mode: 'create' })}><Plus size={16} /> Nieuw assembly</Button>
              </div>
              {assembliesQuery.isLoading ? <LoadingState label="Assemblies laden..." /> : null}
              {assembliesQuery.isError ? <ErrorState title="Assemblies niet geladen" description="Controleer het assemblies-contract van de backend." /> : null}
              {!assembliesQuery.isLoading && !assemblies.length ? <EmptyState title="Geen assemblies" description="Voeg direct een assembly toe vanuit Project 360°." /> : null}
              <div className="list-stack compact-list">
                {assemblies.map((item) => (
                  <div key={String(item.id)} className="list-row">
                    <div><strong>{item.code || item.name || item.id}</strong><div className="list-subtle">{item.name || item.code || 'Assembly'}</div></div>
                    <div className="toolbar-cluster">
                      <Button variant="secondary" onClick={() => setAssemblyModal({ mode: 'edit', item })}><Pencil size={16} /> Bewerken</Button>
                      <Button variant="secondary" onClick={() => setPendingDeleteAssembly(item)}><Trash2 size={16} /> Verwijderen</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {tab === 'welds' ? (
            <Card>
              <div className="section-title-row"><h3><ShieldCheck size={18} /> Welds / Lassen</h3></div>
              {weldsQuery.isLoading ? <LoadingState label="Welds laden..." /> : null}
              {!weldsQuery.isLoading && !welds.length ? <EmptyState title="Geen lassen" description="De weld-first flow wordt in build 2 verder uitgewerkt; gekoppelde lassen zijn hier al zichtbaar." /> : null}
              <div className="list-stack compact-list">
                {welds.map((item: Weld) => (
                  <div key={String(item.id)} className="list-row">
                    <div><strong>{String(item.weld_number || item.id)}</strong><div className="list-subtle">{String(item.location || 'Locatie onbekend')} · {String(item.welder_name || item.welders || 'Lasser onbekend')}</div></div>
                    <Badge tone={tone(item.status)}>{String(item.status || 'Open')}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {tab === 'inspections' ? (
            <Card>
              <div className="section-title-row"><h3><CheckCircle2 size={18} /> Inspecties</h3></div>
              {inspectionsQuery.isLoading ? <LoadingState label="Inspecties laden..." /> : null}
              {!inspectionsQuery.isLoading && !inspections.length ? <EmptyState title="Geen inspecties" description="Inspecties worden getoond zodra er weld-inspecties beschikbaar zijn." /> : null}
              <div className="list-stack compact-list">
                {inspections.map((item: Inspection) => (
                  <div key={String(item.id)} className="list-row">
                    <div><strong>{String(item.id)}</strong><div className="list-subtle">Resultaat: {String(item.result || 'Pending')}</div></div>
                    <Badge tone={tone(item.status)}>{String(item.status || 'Open')}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {tab === 'documenten' ? (
            <>
              <Card>
                <div className="section-title-row"><h3><FileText size={18} /> Documenten</h3></div>
                <UploadDropzone
                  multiple
                  disabled={createDocument.isPending}
                  onFiles={async (files) => {
                    for (const file of files) {
                      const formData = new FormData();
                      formData.append('file', file);
                      formData.append('title', file.name);
                      await createDocument.mutateAsync(formData);
                    }
                    onMessage(`${files.length} document(en) toegevoegd aan project ${project.projectnummer || project.id}.`);
                  }}
                />
              </Card>
              <Card>
                {documentsQuery.isLoading ? <LoadingState label="Documenten laden..." /> : null}
                {!documentsQuery.isLoading && !documents.length ? <EmptyState title="Geen documenten" description="Upload documenten direct in Project 360°." /> : null}
                <div className="list-stack compact-list">
                  {documents.map((item) => (
                    <div key={String(item.id)} className="list-row">
                      <div><strong>{item.title || item.id}</strong><div className="list-subtle">{item.type || 'Document'} · versie {item.version || '1.0'}</div></div>
                      <div className="toolbar-cluster">
                        <Button variant="secondary" onClick={() => setDocumentModal(item)}><Pencil size={16} /> Bewerken</Button>
                        <Button variant="secondary" onClick={() => setPendingDeleteDocument(item)}><Trash2 size={16} /> Verwijderen</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : null}

          {tab === 'compliance' ? (
            <div className="content-grid-2">
              <Card>
                <div className="section-title-row"><h3><ShieldCheck size={18} /> Compliance-overzicht</h3></div>
                {complianceQuery.isLoading ? <LoadingState label="Compliance laden..." /> : <pre className="code-block">{JSON.stringify(complianceQuery.data || {}, null, 2)}</pre>}
              </Card>
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
          ) : null}

          {tab === 'exports' ? (
            <>
              <Card>
                <div className="section-title-row"><h3><Download size={18} /> Exports</h3></div>
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
                <div className="list-stack compact-list">
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

          {tab === 'materialen' ? (
            <Card>
              <div className="section-title-row">
                <h3><Boxes size={18} /> Materialen</h3>
                <div className="toolbar-cluster">
                  <Button onClick={async () => { if (!projectId) return; await bulkProjectAction.mutateAsync({ action: 'materials', projectIds: [projectId] }); onMessage('Materiaalset toegevoegd aan project.'); }} disabled={bulkProjectAction.isPending}>Alles toevoegen</Button>
                </div>
              </div>
              <div className="toolbar-cluster">
                <select className="input" value={selectedMaterialId} onChange={(event) => setSelectedMaterialId(event.target.value)}>
                  <option value="">Selecteer materiaal</option>
                  {availableMaterials.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.code || item.title || item.id)}</option>)}
                </select>
                <Button variant="secondary" onClick={() => handleAddSelection('material')} disabled={!selectedMaterialId || projectSelectionMutation.isPending}>Koppelen</Button>
              </div>
              {materialsQuery.isLoading ? <LoadingState label="Materialen laden..." /> : null}
              {!materialsQuery.isLoading && !materials.length ? <EmptyState title="Geen materialen gekoppeld" description="Voeg losse materialen of in één klik de materiaalset toe vanuit instellingen." /> : null}
              <div className="list-stack compact-list">
                {materials.map((item, index) => {
                  const row = item as Record<string, unknown>;
                  return <div key={String(row.id || index)} className="list-row"><div><strong>{String(row.code || row.title || row.id || `Materiaal ${index + 1}`)}</strong><div className="list-subtle">{String(row.title || '')}</div></div><Button variant="secondary" onClick={() => handleRemoveSelection('material', String(row.id || ''))} disabled={projectSelectionMutation.isPending}><Trash2 size={16} /> Verwijderen</Button></div>;
                })}
              </div>
            </Card>
          ) : null}

          {tab === 'wps' ? (
            <Card>
              <div className="section-title-row">
                <h3><Wrench size={18} /> WPS</h3>
                <div className="toolbar-cluster">
                  <Button onClick={async () => { if (!projectId) return; await bulkProjectAction.mutateAsync({ action: 'wps', projectIds: [projectId] }); onMessage('WPS-set toegevoegd aan project.'); }} disabled={bulkProjectAction.isPending}>Alles toevoegen</Button>
                </div>
              </div>
              <div className="toolbar-cluster">
                <select className="input" value={selectedWpsId} onChange={(event) => setSelectedWpsId(event.target.value)}>
                  <option value="">Selecteer WPS</option>
                  {availableWps.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.code || item.title || item.id)}</option>)}
                </select>
                <Button variant="secondary" onClick={() => handleAddSelection('wps')} disabled={!selectedWpsId || projectSelectionMutation.isPending}>Koppelen</Button>
              </div>
              {wpsQuery.isLoading ? <LoadingState label="WPS laden..." /> : null}
              {!wpsQuery.isLoading && !wps.length ? <EmptyState title="Geen WPS gekoppeld" description="Voeg losse WPS of in één klik de WPS-set toe vanuit instellingen." /> : null}
              <div className="list-stack compact-list">
                {wps.map((item, index) => {
                  const row = item as Record<string, unknown>;
                  return <div key={String(row.id || index)} className="list-row"><div><strong>{String(row.code || row.title || row.id || `WPS ${index + 1}`)}</strong><div className="list-subtle">{String(row.title || '')}</div></div><Button variant="secondary" onClick={() => handleRemoveSelection('wps', String(row.id || ''))} disabled={projectSelectionMutation.isPending}><Trash2 size={16} /> Verwijderen</Button></div>;
                })}
              </div>
            </Card>
          ) : null}



          {tab === 'historie' ? (
            <Card>
              <div className="section-title-row">
                <h3><History size={18} /> Historie / audittrail</h3>
                <Badge tone="neutral">{auditQuery.data?.total || auditItems.length} regels</Badge>
              </div>
              {auditQuery.isLoading ? <LoadingState label="Audittrail laden..." /> : null}
              {auditQuery.isError ? <ErrorState title="Audittrail niet geladen" description="Controleer het project-auditcontract van de backend." /> : null}
              {!auditQuery.isLoading && !auditItems.length ? <EmptyState title="Geen auditregels" description="Voor dit project zijn nog geen auditregels gevonden." /> : null}
              <div className="list-stack compact-list">
                {auditItems.map((item) => (
                  <div key={String(item.id)} className="list-row">
                    <div>
                      <strong>{String(item.action || 'actie')}</strong>
                      <div className="list-subtle">{String(item.entity || 'record')} · {formatDate(String(item.created_at || ''))}</div>
                      <div className="list-subtle">{JSON.stringify(item.meta || {})}</div>
                    </div>
                    <Badge tone="neutral">{String(item.user_id || 'systeem')}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}


          {tab === 'lassers' ? (
            <Card>
              <div className="section-title-row">
                <h3><HardHat size={18} /> Lassers</h3>
                <div className="toolbar-cluster">
                  <Button onClick={async () => { if (!projectId) return; await bulkProjectAction.mutateAsync({ action: 'welders', projectIds: [projectId] }); onMessage('Lasserset toegevoegd aan project.'); }} disabled={bulkProjectAction.isPending}>Alles toevoegen</Button>
                </div>
              </div>
              <div className="toolbar-cluster">
                <select className="input" value={selectedWelderId} onChange={(event) => setSelectedWelderId(event.target.value)}>
                  <option value="">Selecteer lasser</option>
                  {availableWelders.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.code || item.name || item.id)}</option>)}
                </select>
                <Button variant="secondary" onClick={() => handleAddSelection('welder')} disabled={!selectedWelderId || projectSelectionMutation.isPending}>Koppelen</Button>
              </div>
              {weldersQuery.isLoading ? <LoadingState label="Lassers laden..." /> : null}
              {!weldersQuery.isLoading && !welders.length ? <EmptyState title="Geen lassers gekoppeld" description="Voeg losse lassers of in één klik de lasserset toe vanuit instellingen." /> : null}
              <div className="list-stack compact-list">
                {welders.map((item, index) => {
                  const row = item as Record<string, unknown>;
                  return <div key={String(row.id || index)} className="list-row"><div><strong>{String(row.code || row.name || row.id || `Lasser ${index + 1}`)}</strong><div className="list-subtle">{String(row.name || '')}</div></div><Button variant="secondary" onClick={() => handleRemoveSelection('welder', String(row.id || ''))} disabled={projectSelectionMutation.isPending}><Trash2 size={16} /> Verwijderen</Button></div>;
                })}
              </div>
            </Card>
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

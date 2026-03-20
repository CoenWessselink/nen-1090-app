import { useMemo, useState } from 'react';
import { CheckCheck, Eye, Paperclip, Pencil, Plus, ShieldAlert, ShieldCheck, Trash2, UploadCloud, Wrench } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type ColumnDef } from '@/components/datatable/DataTable';
import { DataTableToolbar } from '@/components/datatable/DataTableToolbar';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { Modal } from '@/components/overlays/Modal';
import { Input } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';
import { Drawer } from '@/components/overlays/Drawer';
import { UploadDropzone } from '@/components/upload/UploadDropzone';
import { Select } from '@/components/ui/Select';
import { ProjectScopePicker } from '@/components/project-scope/ProjectScopePicker';
import { useUiStore } from '@/app/store/ui-store';
import { useApproveInspection, useCreateInspection, useDeleteInspection, useInspectionResults, useInspections, useSaveInspectionResult, useUpdateInspection, useUploadInspectionAttachment } from '@/hooks/useInspections';
import { useCreateDefect, useDefects, useDeleteDefect, useReopenDefect, useResolveDefect, useUpdateDefect } from '@/hooks/useDefects';
import { useBulkApproveWelds, useConformWeld, useCreateWeld, useUpdateWeld, useUploadWeldAttachment, useWeldAttachments, useWeldCompliance, useWeldDefects, useWeldInspections, useWelds } from '@/hooks/useWelds';
import { useInspectionTemplates } from '@/hooks/useSettings';
import { resetWeldToNorm } from '@/api/welds';
import { WeldForm } from '@/features/lascontrole/components/WeldForm';
import { InspectionForm } from '@/features/lascontrole/components/InspectionForm';
import { DefectForm } from '@/features/lascontrole/components/DefectForm';
import type { CeDocument, Defect, Inspection, Weld } from '@/types/domain';
import type { WeldFormValues } from '@/types/forms';
import { formatDate } from '@/utils/format';
import { useProjectContext } from '@/context/ProjectContext';

function tone(value?: string) {
  const status = String(value || '').toLowerCase();
  if (['goedgekeurd', 'approved', 'accepted', 'resolved', 'conform'].includes(status)) return 'success' as const;
  if (['afgekeurd', 'rejected', 'open', 'repair-required'].includes(status)) return 'danger' as const;
  return 'warning' as const;
}

function isoLabel(value?: string) {
  const normalized = String(value || '').toUpperCase();
  if (!normalized) return '—';
  return `ISO 5817 ${normalized}`;
}

export function LascontrolePage() {
  const pushNotification = useUiStore((state) => state.pushNotification);
  const globalSearch = useUiStore((state) => state.globalSearch);
  const { projectId, hasProject } = useProjectContext();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [tab, setTab] = useState('welds');
  const [quickFilter, setQuickFilter] = useState<'all' | 'with-defects' | 'conform' | 'open'>('all');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState('inspection_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [weldModalMode, setWeldModalMode] = useState<'create' | 'edit'>('create');
  const [weldModal, setWeldModal] = useState(false);
  const [inspectionModal, setInspectionModal] = useState<{ mode: 'create' | 'edit'; item?: Inspection } | null>(null);
  const [defectModal, setDefectModal] = useState<{ mode: 'create' | 'edit'; item?: Defect } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeWeld, setActiveWeld] = useState<Weld | null>(null);
  const [selectedWeldIds, setSelectedWeldIds] = useState<string[]>([]);
  const limit = 10;

  const mergedSearch = [search, globalSearch].filter(Boolean).join(' ').trim();
  const sharedParams = {
    page,
    limit,
    search: mergedSearch || undefined,
    sort: sortKey,
    direction: sortDirection,
    status: status !== 'all' ? status : undefined,
    project_id: projectId || undefined,
  };

  const weldsQuery = useWelds(sharedParams);
  const inspectionsQuery = useInspections(sharedParams);
  const defectsQuery = useDefects(sharedParams);
  const inspectionTemplates = useInspectionTemplates(Boolean(projectId || true));
  const createWeld = useCreateWeld();
  const updateWeld = useUpdateWeld(activeWeld?.project_id || projectId || '');
  const conformWeld = useConformWeld(activeWeld?.project_id || projectId || '');
  const bulkApproveWelds = useBulkApproveWelds(projectId || '');
  const createInspection = useCreateInspection(projectId || activeWeld?.project_id || '');
  const updateInspection = useUpdateInspection();
  const deleteInspection = useDeleteInspection();
  const saveInspectionResult = useSaveInspectionResult();
  const approveInspection = useApproveInspection();
  const uploadInspectionAttachment = useUploadInspectionAttachment();
  const createDefect = useCreateDefect(projectId || activeWeld?.project_id || '');
  const updateDefect = useUpdateDefect();
  const resolveDefect = useResolveDefect();
  const reopenDefect = useReopenDefect();
  const deleteDefect = useDeleteDefect();
  const queryClient = useQueryClient();
  const resetToNorm = useMutation({
    mutationFn: ({ projectId: currentProjectId, weldId }: { projectId: string | number; weldId: string | number }) => resetWeldToNorm(currentProjectId, weldId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['welds'] }),
  });

  const weldWorkflowInspections = useWeldInspections(activeWeld?.project_id || projectId, activeWeld?.id);
  const weldWorkflowDefects = useWeldDefects(activeWeld?.project_id || projectId, activeWeld?.id);
  const weldWorkflowAttachments = useWeldAttachments(activeWeld?.project_id || projectId, activeWeld?.id);
  const weldWorkflowCompliance = useWeldCompliance(activeWeld?.project_id || projectId, activeWeld?.id);
  const uploadWeldAttachment = useUploadWeldAttachment(activeWeld?.project_id || projectId || '', activeWeld?.id || '');
  const inspectionResultsQuery = useInspectionResults(inspectionModal?.item?.id);

  const weldRows = useMemo(() => weldsQuery.data?.items || [], [weldsQuery.data]);
  const filteredWeldRows = useMemo(() => {
    if (quickFilter === 'with-defects') return weldRows.filter((item) => Number(item.defect_count || 0) > 0);
    if (quickFilter === 'conform') return weldRows.filter((item) => String(item.status || '').toLowerCase() === 'conform');
    if (quickFilter === 'open') return weldRows.filter((item) => ['open', 'pending', 'in-controle'].includes(String(item.status || '').toLowerCase()));
    return weldRows;
  }, [quickFilter, weldRows]);
  const inspectionRows = useMemo(() => inspectionsQuery.data?.items || [], [inspectionsQuery.data]);
  const defectRows = useMemo(() => defectsQuery.data?.items || [], [defectsQuery.data]);
  const weldOptions = useMemo(
    () => weldRows.map((row) => ({ id: String(row.id), label: `${row.weld_number || row.id} · ${row.location || 'Onbekende locatie'}` })),
    [weldRows],
  );
  const templateOptions = useMemo(() => inspectionTemplates.data?.items || [], [inspectionTemplates.data]);
  const activeWeldProjectId = String(activeWeld?.project_id || projectId || '');
  const activeWeldId = activeWeld?.id ? String(activeWeld.id) : '';

  const complianceCards = useMemo(() => {
    if (weldWorkflowCompliance.data) {
      const checklist = Array.isArray(weldWorkflowCompliance.data.checklist) ? weldWorkflowCompliance.data.checklist : [];
      const missing = Array.isArray(weldWorkflowCompliance.data.missing_items) ? weldWorkflowCompliance.data.missing_items : [];
      return [
        { label: 'Compliancescore', value: `${Number(weldWorkflowCompliance.data.score || 0)}%` },
        { label: 'Checklistpunten', value: String(checklist.length) },
        { label: 'Ontbrekend', value: String(missing.length) },
      ];
    }
    return [
      { label: 'Inspecties', value: String(weldWorkflowInspections.data?.items?.length || 0) },
      { label: 'Defecten', value: String(weldWorkflowDefects.data?.items?.length || 0) },
      { label: 'Bijlagen', value: String(weldWorkflowAttachments.data?.items?.length || 0) },
    ];
  }, [weldWorkflowAttachments.data, weldWorkflowCompliance.data, weldWorkflowDefects.data, weldWorkflowInspections.data]);

  const weldColumns: ColumnDef<Weld>[] = [
    { key: 'weld_number', header: 'Lasnummer', sortable: true, cell: (row) => <strong>{row.weld_number || row.id}</strong> },
    { key: 'project_name', header: 'Project', sortable: true, cell: (row) => row.project_name || '—', hiddenByDefault: !hasProject },
    { key: 'welder_name', header: 'Lasser', sortable: true, cell: (row) => row.welder_name || '—' },
    { key: 'process', header: 'Proces', sortable: true, cell: (row) => row.process || '—' },
    { key: 'location', header: 'Locatie', sortable: true, cell: (row) => row.location || '—' },
    { key: 'inspection_date', header: 'Datum', sortable: true, cell: (row) => formatDate(row.inspection_date) },
    { key: 'status', header: 'Status', sortable: true, cell: (row) => <Badge tone={tone(row.status)}>{row.status || 'Open'}</Badge> },
    { key: 'actions', header: 'Acties', cell: (row) => <div className="row-actions"><button className="icon-button" type="button" onClick={() => setActiveWeld(row)} aria-label="Details"><Eye size={16} /></button><button className="icon-button" type="button" onClick={() => { setActiveWeld(row); setWeldModalMode('edit'); setWeldModal(true); }} aria-label="Bewerken"><Pencil size={16} /></button><button className="icon-button" type="button" onClick={async () => { const copy = await createWeld.mutateAsync({ project_id: String(row.project_id || projectId || ''), weld_number: `${String(row.weld_number || row.id)}-kopie`, assembly_id: String(row.assembly_id || ''), wps_id: String(row.wps_id || ''), welder_name: String(row.welder_name || ''), process: String(row.process || ''), location: String(row.location || ''), status: String(row.status || 'concept') }); setMessage(`Las ${row.weld_number || row.id} gekopieerd als ${copy.weld_number || copy.id}.`); }} aria-label="Kopiëren"><Plus size={16} /></button></div> },
  ];

  const inspectionColumns: ColumnDef<Inspection>[] = [
    { key: 'id', header: 'Inspectie', sortable: true, cell: (row) => <strong>{String(row.id)}</strong> },
    { key: 'weld_id', header: 'Las', sortable: true, cell: (row) => String(row.weld_id || '—') },
    { key: 'inspector', header: 'Inspecteur', sortable: true, cell: (row) => String(row.inspector || '—') },
    { key: 'due_date', header: 'Planning', sortable: true, cell: (row) => formatDate(row.due_date) },
    { key: 'result', header: 'Resultaat', sortable: true, cell: (row) => row.result || '—' },
    { key: 'status', header: 'Status', sortable: true, cell: (row) => <Badge tone={tone(row.status)}>{row.status || 'Open'}</Badge> },
    { key: 'actions', header: 'Acties', cell: (row) => <div className="row-actions"><button className="icon-button" type="button" onClick={() => setInspectionModal({ mode: 'edit', item: row })}><Pencil size={16} /></button><button className="icon-button" type="button" onClick={async () => { await approveInspection.mutateAsync(row.id); setMessage(`Inspectie ${row.id} goedgekeurd.`); }}><CheckCheck size={16} /></button><button className="icon-button" type="button" onClick={async () => { await deleteInspection.mutateAsync(row.id); setMessage(`Inspectie ${row.id} verwijderd.`); }}><Trash2 size={16} /></button></div> },
  ];

  const defectColumns: ColumnDef<Defect>[] = [
    { key: 'id', header: 'Defect', sortable: true, cell: (row) => <strong>{String(row.id)}</strong> },
    { key: 'weld_id', header: 'Las', sortable: true, cell: (row) => String(row.weld_id || '—') },
    { key: 'defect_type', header: 'Type', sortable: true, cell: (row) => String(row.defect_type || '—') },
    { key: 'severity', header: 'ISO 5817', sortable: true, cell: (row) => isoLabel(row.severity) },
    { key: 'status', header: 'Status', sortable: true, cell: (row) => <Badge tone={tone(row.status)}>{row.status || 'Open'}</Badge> },
    { key: 'actions', header: 'Acties', cell: (row) => <div className="row-actions"><button className="icon-button" type="button" onClick={() => setDefectModal({ mode: 'edit', item: row })}><Pencil size={16} /></button><button className="icon-button" type="button" onClick={async () => { await resolveDefect.mutateAsync(row.id); setMessage(`Defect ${row.id} opgelost.`); }}><ShieldCheck size={16} /></button><button className="icon-button" type="button" onClick={async () => { await reopenDefect.mutateAsync(row.id); setMessage(`Defect ${row.id} heropend.`); }}><ShieldAlert size={16} /></button><button className="icon-button" type="button" onClick={async () => { await deleteDefect.mutateAsync(row.id); setMessage(`Defect ${row.id} verwijderd.`); }}><Trash2 size={16} /></button></div> },
  ];

  const totalForActiveTab = tab === 'welds'
    ? (weldsQuery.data?.total ?? weldRows.length)
    : tab === 'inspections'
      ? (inspectionsQuery.data?.total ?? inspectionRows.length)
      : (defectsQuery.data?.total ?? defectRows.length);

  const activeWeldFormInitial: Partial<WeldFormValues> | undefined = activeWeld ? {
    project_id: String(activeWeld.project_id || ''),
    weld_number: String(activeWeld.weld_number || ''),
    wps_id: String(activeWeld.wps_id || ''),
    welder_name: String(activeWeld.welder_name || ''),
    process: String(activeWeld.process || '135'),
    location: String(activeWeld.location || ''),
    status: String(activeWeld.status || 'open'),
  } : undefined;

  return (
    <div className="page-stack">
      <PageHeader title="Lascontrole" description="Fase 2: weld-first met inspecties, defecten, audit-acties en Weld 360° voor directe afhandeling per las." />
      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}
      <InlineMessage tone={hasProject ? 'danger' : 'success'}>{hasProject ? 'Projectscope actief. Je ziet nu projectgebonden lascontrole.' : 'Geen projectscope gekozen. Lascontrole draait nu weld-first over alle lassen binnen de tenant.'}</InlineMessage>

      <Card>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
          <div style={{ gridColumn: '1 / -1' }}><ProjectScopePicker description="Lascontrole gebruikt bij voorkeur een projectscope, maar de weld-lijst blijft tenant-breed beschikbaar voor snelle opvolging." /></div>
          <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Zoek op las, project, WPS, lasser of defect" />
          <Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="all">Alle statussen</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="resolved">Resolved</option>
            <option value="conform">Conform</option>
          </Select>
          <Select value={sortKey} onChange={(event) => { setSortKey(event.target.value); setPage(1); }}>
            <option value="inspection_date">Sorteer op datum</option>
            <option value="status">Sorteer op status</option>
            <option value="weld_number">Sorteer op lasnummer</option>
            <option value="due_date">Sorteer op planning</option>
          </Select>
          <Select value={sortDirection} onChange={(event) => setSortDirection(event.target.value as 'asc' | 'desc')}>
            <option value="desc">Nieuwste eerst</option>
            <option value="asc">Oudste eerst</option>
          </Select>
        </div>
      </Card>

      <div className="card-grid cols-3">
        <Card><div className="metric-card"><span>Open inspecties</span><strong>{inspectionRows.filter((item) => String(item.status || '').toLowerCase() !== 'approved').length}</strong></div></Card>
        <Card><div className="metric-card"><span>Actieve lassen</span><strong>{weldRows.length}</strong></div></Card>
        <Card><div className="metric-card"><span>Lassen met defecten</span><strong>{weldRows.filter((item) => Number(item.defect_count || 0) > 0).length}</strong></div></Card>
      </div>

      <Card>
        <Tabs value={tab} onChange={(next) => { setTab(next); setPage(1); }} tabs={[{ value: 'welds', label: 'Lassen' }, { value: 'inspections', label: 'Inspecties' }, { value: 'defects', label: 'Defecten' }]} />
      </Card>

      {tab === 'welds' ? (
        <Card>
          <DataTableToolbar
            left={<div className="stack-actions"><span className="badge badge-neutral">Dubbelklik opent Weld 360°</span><button type="button" className={`badge ${quickFilter === 'all' ? 'badge-success' : 'badge-neutral'}`} onClick={() => setQuickFilter('all')}>Alle lassen</button><button type="button" className={`badge ${quickFilter === 'open' ? 'badge-warning' : 'badge-neutral'}`} onClick={() => setQuickFilter('open')}>Open</button><button type="button" className={`badge ${quickFilter === 'with-defects' ? 'badge-danger' : 'badge-neutral'}`} onClick={() => setQuickFilter('with-defects')}>Met defecten</button><button type="button" className={`badge ${quickFilter === 'conform' ? 'badge-success' : 'badge-neutral'}`} onClick={() => setQuickFilter('conform')}>Conform</button></div>}
            center={<span className="badge badge-warning">{filteredWeldRows.filter((item) => Number(item.defect_count || 0) > 0).length} met defecten</span>}
            right={<div className="stack-actions"><Button variant="secondary" disabled={!selectedWeldIds.length || !projectId || bulkApproveWelds.isPending} onClick={async () => { if (!projectId || !selectedWeldIds.length) return; const count = selectedWeldIds.length; await bulkApproveWelds.mutateAsync(selectedWeldIds); setSelectedWeldIds([]); setMessage(`${count} lassen in 1 klik geaccordeerd.`); }}><CheckCheck size={16} /> Alles accorderen</Button><Button onClick={() => { setWeldModalMode('create'); setWeldModal(true); }}><Plus size={16} /> Nieuwe las</Button></div>}
          />
          {weldsQuery.isLoading ? <LoadingState label="Lassen laden..." /> : null}
          {weldsQuery.isError ? <ErrorState title="Lassen niet geladen" description="Controleer GET /projects/{project_id}/welds of de globale /welds fallback endpoint in de backend." /> : null}
          {!weldsQuery.isLoading && !weldsQuery.isError ? <DataTable columns={weldColumns} rows={filteredWeldRows} rowKey={(row) => String(row.id)} empty={<EmptyState title="Geen lassen" description="Maak een las aan of verfijn het filter." />} selectable={Boolean(projectId)} selectedRowKeys={selectedWeldIds} onToggleRow={(key) => setSelectedWeldIds((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])} onToggleAll={() => setSelectedWeldIds((current) => current.length === filteredWeldRows.length ? [] : filteredWeldRows.map((row) => String(row.id)))} onRowDoubleClick={(row) => setActiveWeld(row)} page={page} pageSize={limit} total={tab === 'welds' ? filteredWeldRows.length : totalForActiveTab} onPageChange={setPage} /> : null}
        </Card>
      ) : null}

      {tab === 'inspections' ? (
        <Card>
          <DataTableToolbar left={<span className="badge badge-neutral">Inspectieresultaten, template-keuze en approvals</span>} right={<Button onClick={() => setInspectionModal({ mode: 'create' })}><Plus size={16} /> Nieuwe inspectie</Button>} />
          {inspectionsQuery.isLoading ? <LoadingState label="Inspecties laden..." /> : null}
          {inspectionsQuery.isError ? <ErrorState title="Inspecties niet geladen" description="Controleer GET /projects/{project_id}/inspections of /inspections." /> : null}
          {!inspectionsQuery.isLoading && !inspectionsQuery.isError ? <DataTable columns={inspectionColumns} rows={inspectionRows} rowKey={(row) => String(row.id)} empty={<EmptyState title="Geen inspecties" description="Maak een inspectie aan binnen het gekozen project." />} onRowDoubleClick={(row) => setInspectionModal({ mode: 'edit', item: row })} page={page} pageSize={limit} total={totalForActiveTab} onPageChange={setPage} /> : null}
        </Card>
      ) : null}

      {tab === 'defects' ? (
        <Card>
          <DataTableToolbar left={<span className="badge badge-neutral">ISO 5817 terminologie + herstelstatus</span>} right={<Button onClick={() => setDefectModal({ mode: 'create' })}><Plus size={16} /> Nieuw defect</Button>} />
          {defectsQuery.isLoading ? <LoadingState label="Defecten laden..." /> : null}
          {defectsQuery.isError ? <ErrorState title="Defecten niet geladen" description="Controleer GET /projects/{project_id}/defects of /weld-defects." /> : null}
          {!defectsQuery.isLoading && !defectsQuery.isError ? <DataTable columns={defectColumns} rows={defectRows} rowKey={(row) => String(row.id)} empty={<EmptyState title="Geen defecten" description="Maak een defect aan binnen het gekozen project." />} onRowDoubleClick={(row) => setDefectModal({ mode: 'edit', item: row })} page={page} pageSize={limit} total={totalForActiveTab} onPageChange={setPage} /> : null}
        </Card>
      ) : null}

      <Modal open={weldModal} onClose={() => setWeldModal(false)} title={weldModalMode === 'edit' ? 'Las bewerken' : 'Nieuwe las'} size="large">
        <WeldForm
          initial={weldModalMode === 'edit' ? activeWeldFormInitial : undefined}
          defaultProjectId={String(projectId || activeWeld?.project_id || '')}
          submitLabel={weldModalMode === 'edit' ? 'Las bijwerken' : 'Las opslaan'}
          isSubmitting={createWeld.isPending || updateWeld.isPending}
          onSubmit={async (values) => {
            if (weldModalMode === 'edit' && activeWeld) {
              await updateWeld.mutateAsync({ weldId: activeWeld.id, payload: values });
              setMessage(`Las ${activeWeld.weld_number || activeWeld.id} bijgewerkt.`);
              setActiveWeld({ ...activeWeld, ...values } as Weld);
            } else {
              await createWeld.mutateAsync(values);
              setMessage('Las opgeslagen via dropdown-first popupflow.');
              pushNotification({ title: 'Las opgeslagen', description: 'Nieuwe las is opgeslagen via de bestaande backend.', tone: 'success' });
            }
            setWeldModal(false);
          }}
        />
      </Modal>

      <Modal open={!!inspectionModal} onClose={() => setInspectionModal(null)} title={inspectionModal?.mode === 'edit' ? 'Inspectie bewerken' : 'Nieuwe inspectie'} size="large">
        <InspectionForm
          initial={inspectionModal?.item ? ({ ...inspectionModal.item, weld_id: inspectionModal.item.weld_id ? String(inspectionModal.item.weld_id) : '' } as Partial<Record<string, unknown>>) : undefined}
          weldOptions={weldOptions}
          templateOptions={templateOptions}
          defaultWeldId={activeWeldId}
          isSubmitting={createInspection.isPending || updateInspection.isPending}
          onSubmit={async (values) => {
            const selectedTemplate = templateOptions.find((item) => String(item.id) === String(values.template_id || '')) as Record<string, unknown> | undefined;
            const templateItems = Array.isArray(selectedTemplate?.items_json) ? selectedTemplate?.items_json : [];
            const resultPayload = {
              result: values.result,
              notes: values.notes,
              iso5817_level: 'C',
              template_id: values.template_id || null,
              checklist_count: templateItems.length,
            };
            if (inspectionModal?.mode === 'edit' && inspectionModal.item) {
              await updateInspection.mutateAsync({ inspectionId: inspectionModal.item.id, payload: values });
              await saveInspectionResult.mutateAsync({ inspectionId: inspectionModal.item.id, payload: resultPayload });
              setMessage(`Inspectie ${inspectionModal.item.id} bijgewerkt.`);
            } else {
              await createInspection.mutateAsync({ weldId: values.weld_id, payload: values });
              setMessage('Inspectie aangemaakt.');
            }
            setInspectionModal(null);
          }}
        />
        {inspectionModal?.item ? (
          <div className="detail-stack" style={{ marginTop: 16 }}>
            <Card>
              <div className="section-title-row"><h3>Huidig resultaat</h3></div>
              {inspectionResultsQuery.isLoading ? <LoadingState label="Resultaat laden..." /> : <pre className="code-block">{JSON.stringify(inspectionResultsQuery.data || {}, null, 2)}</pre>}
            </Card>
            <UploadDropzone
              multiple={false}
              disabled={uploadInspectionAttachment.isPending}
              onFiles={async (files) => {
                const file = files[0];
                if (!file || !inspectionModal.item) return;
                const formData = new FormData();
                formData.append('file', file);
                await uploadInspectionAttachment.mutateAsync({ inspectionId: inspectionModal.item.id, formData });
                setMessage(`Bijlage ${file.name} toegevoegd aan inspectie ${inspectionModal.item.id}.`);
              }}
            />
          </div>
        ) : null}
      </Modal>

      <Modal open={!!defectModal} onClose={() => setDefectModal(null)} title={defectModal?.mode === 'edit' ? 'Defect bewerken' : 'Nieuw defect'} size="large">
        <DefectForm
          initial={defectModal?.item ? { ...defectModal.item, weld_id: defectModal.item.weld_id ? String(defectModal.item.weld_id) : '' } : undefined}
          weldOptions={weldOptions}
          defaultWeldId={activeWeldId}
          isSubmitting={createDefect.isPending || updateDefect.isPending}
          onSubmit={async (values) => {
            if (defectModal?.mode === 'edit' && defectModal.item) {
              await updateDefect.mutateAsync({ defectId: defectModal.item.id, payload: values });
              setMessage(`Defect ${defectModal.item.id} bijgewerkt.`);
            } else {
              await createDefect.mutateAsync({ weldId: values.weld_id, payload: values });
              setMessage('Defect aangemaakt.');
            }
            setDefectModal(null);
          }}
        />
      </Modal>

      <Drawer open={!!activeWeld} onClose={() => setActiveWeld(null)} title="Weld 360°">
        {activeWeld ? (
          <div className="detail-stack">
            <div className="detail-hero"><div><h3>{activeWeld.weld_number || activeWeld.id}</h3><div className="list-subtle">{activeWeld.welder_name || 'Lasser onbekend'} · {activeWeld.location || 'Locatie onbekend'}</div></div><Badge tone={tone(activeWeld.status)}>{activeWeld.status || 'Open'}</Badge></div>
            <div className="kpi-strip">
              {complianceCards.map((item) => <div key={item.label} className="kpi-card"><span>{item.label}</span><strong>{item.value}</strong></div>)}
            </div>
            <div className="detail-grid">
              <div><span>Proces</span><strong>{activeWeld.process || '—'}</strong></div>
              <div><span>WPS</span><strong>{activeWeld.wps_id || '—'}</strong></div>
              <div><span>Inspecteur</span><strong>{activeWeld.inspector_name || '—'}</strong></div>
              <div><span>Datum</span><strong>{formatDate(activeWeld.inspection_date)}</strong></div>
            </div>
            <div className="stack-actions">
              <Button variant="secondary" onClick={() => { setWeldModalMode('edit'); setWeldModal(true); }}><Pencil size={16} /> Las wijzigen</Button>
              <Button variant="secondary" disabled={!activeWeldProjectId || conformWeld.isPending} onClick={async () => { await conformWeld.mutateAsync(activeWeld.id); setMessage(`Las ${activeWeld.weld_number || activeWeld.id} conform gezet.`); setActiveWeld({ ...activeWeld, status: 'conform' }); }}><CheckCheck size={16} /> Conform</Button>
              <Button variant="secondary" onClick={async () => {
                await resetToNorm.mutateAsync({ projectId: activeWeld.project_id || projectId, weldId: activeWeld.id });
                setMessage(`Las ${activeWeld.weld_number || activeWeld.id} terug naar norm gezet.`);
                setActiveWeld({ ...activeWeld, status: 'open' });
              }}><Wrench size={16} /> Reset to norm</Button>
              <Button onClick={() => setInspectionModal({ mode: 'create' })}><Plus size={16} /> Inspectie toevoegen</Button>
              <Button variant="secondary" onClick={() => setDefectModal({ mode: 'create' })}><Plus size={16} /> Defect toevoegen</Button>
            </div>
            <div className="content-grid-2">
              <Card>
                <div className="section-title-row"><h3><ShieldCheck size={18} /> Inspecties</h3></div>
                {weldWorkflowInspections.isLoading ? <LoadingState label="Inspecties laden..." /> : null}
                {!weldWorkflowInspections.isLoading && !(weldWorkflowInspections.data?.items || []).length ? <EmptyState title="Geen inspecties" description="Nog geen inspecties gekoppeld aan deze las." /> : null}
                <div className="list-stack compact-list">
                  {(weldWorkflowInspections.data?.items || []).map((item) => <div key={String(item.id)} className="list-row" onDoubleClick={() => setInspectionModal({ mode: 'edit', item })}><div><strong>{String(item.id)}</strong><div className="list-subtle">{item.result || 'Pending'} · {formatDate(item.due_date)}</div></div><Badge tone={tone(item.status)}>{item.status || 'Open'}</Badge></div>)}
                </div>
              </Card>
              <Card>
                <div className="section-title-row"><h3><ShieldAlert size={18} /> Defecten</h3></div>
                {weldWorkflowDefects.isLoading ? <LoadingState label="Defecten laden..." /> : null}
                {!weldWorkflowDefects.isLoading && !(weldWorkflowDefects.data?.items || []).length ? <EmptyState title="Geen defecten" description="Geen open defecten op deze las." /> : null}
                <div className="list-stack compact-list">
                  {(weldWorkflowDefects.data?.items || []).map((item) => <div key={String(item.id)} className="list-row" onDoubleClick={() => setDefectModal({ mode: 'edit', item })}><div><strong>{String(item.id)}</strong><div className="list-subtle">{isoLabel(item.severity)} · {String(item.defect_type || 'Onbekend type')}</div></div><Badge tone={tone(item.status)}>{item.status || 'Open'}</Badge></div>)}
                </div>
              </Card>
            </div>
            <Card>
              <div className="section-title-row"><h3><Paperclip size={18} /> Bijlagen</h3></div>
              {weldWorkflowAttachments.isLoading ? <LoadingState label="Bijlagen laden..." /> : null}
              {!weldWorkflowAttachments.isLoading && !(weldWorkflowAttachments.data?.items || []).length ? <EmptyState title="Geen bijlagen" description="Nog geen bijlagen gekoppeld aan deze las." /> : null}
              <div className="list-stack compact-list">
                {(weldWorkflowAttachments.data?.items || []).map((item: CeDocument) => <div key={String(item.id)} className="list-row"><div><strong>{item.title || item.id}</strong><div className="list-subtle">Versie {item.version || '1.0'} · {item.type || 'Bestand'}</div></div><Badge tone={tone(item.status)}>{item.status || 'Actief'}</Badge></div>)}
              </div>
              <UploadDropzone multiple={false} disabled={uploadWeldAttachment.isPending} onFiles={async (files) => { const file = files[0]; if (!file) return; const formData = new FormData(); formData.append('files', file); await uploadWeldAttachment.mutateAsync(formData); setMessage(`Bijlage ${file.name} toegevoegd aan las ${activeWeld.weld_number || activeWeld.id}.`); }} />
              <div className="list-subtle"><UploadCloud size={12} /> Foto's en documenten worden direct op de las opgeslagen voor audit en CE-dossier.</div>
            </Card>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

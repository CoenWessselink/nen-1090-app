import { useMemo, useState } from 'react';
import { CheckCheck, Eye, Paperclip, Pencil, Plus, ShieldAlert, ShieldCheck, Trash2, UploadCloud, Wrench } from 'lucide-react';
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
import { useUiStore } from '@/app/store/ui-store';
import { useApproveInspection, useCreateInspection, useDeleteInspection, useInspectionResults, useInspections, useSaveInspectionResult, useUpdateInspection, useUploadInspectionAttachment } from '@/hooks/useInspections';
import { useCreateDefect, useDefects, useDeleteDefect, useReopenDefect, useResolveDefect, useUpdateDefect } from '@/hooks/useDefects';
import { useCreateWeld, useWeldAttachments, useWeldDefects, useWeldInspections, useWelds } from '@/hooks/useWelds';
import { resetWeldToNorm } from '@/api/welds';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { WeldForm } from '@/features/lascontrole/components/WeldForm';
import { InspectionForm } from '@/features/lascontrole/components/InspectionForm';
import { DefectForm } from '@/features/lascontrole/components/DefectForm';
import type { CeDocument, Defect, Inspection, Weld } from '@/types/domain';
import { formatDate } from '@/utils/format';
import { Select } from '@/components/ui/Select';
import { ProjectScopePicker } from '@/components/project-scope/ProjectScopePicker';
import { useProjectContext } from '@/context/ProjectContext';

function tone(value?: string) {
  const status = String(value || '').toLowerCase();
  if (['goedgekeurd', 'approved', 'accepted', 'resolved', 'conform'].includes(status)) return 'success' as const;
  if (['afgekeurd', 'rejected', 'open', 'repair-required'].includes(status)) return 'danger' as const;
  return 'warning' as const;
}

export function LascontrolePage() {
  const pushNotification = useUiStore((state) => state.pushNotification);
  const globalSearch = useUiStore((state) => state.globalSearch);
  const { projectId, hasProject } = useProjectContext();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [tab, setTab] = useState('welds');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState('inspection_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [weldModal, setWeldModal] = useState(false);
  const [inspectionModal, setInspectionModal] = useState<{ mode: 'create' | 'edit'; item?: Inspection } | null>(null);
  const [defectModal, setDefectModal] = useState<{ mode: 'create' | 'edit'; item?: Defect } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeWeld, setActiveWeld] = useState<Weld | null>(null);
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
  const createWeld = useCreateWeld();
  const createInspection = useCreateInspection(projectId || '');
  const updateInspection = useUpdateInspection();
  const deleteInspection = useDeleteInspection();
  const saveInspectionResult = useSaveInspectionResult();
  const approveInspection = useApproveInspection();
  const uploadInspectionAttachment = useUploadInspectionAttachment();
  const createDefect = useCreateDefect(projectId || '');
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
  const inspectionResultsQuery = useInspectionResults(tab === 'inspections' && inspectionModal?.item ? inspectionModal.item.id : undefined);

  const weldRows = useMemo(() => weldsQuery.data?.items || [], [weldsQuery.data]);
  const inspectionRows = useMemo(() => inspectionsQuery.data?.items || [], [inspectionsQuery.data]);
  const defectRows = useMemo(() => defectsQuery.data?.items || [], [defectsQuery.data]);

  const weldColumns: ColumnDef<Weld>[] = [
    { key: 'weld_number', header: 'Lasnummer', sortable: true, cell: (row) => <strong>{row.weld_number || row.id}</strong> },
    { key: 'welder_name', header: 'Lasser', sortable: true, cell: (row) => row.welder_name || '—' },
    { key: 'process', header: 'Proces', sortable: true, cell: (row) => row.process || '—' },
    { key: 'location', header: 'Locatie', sortable: true, cell: (row) => row.location || '—' },
    { key: 'inspection_date', header: 'Datum', sortable: true, cell: (row) => formatDate(row.inspection_date) },
    { key: 'status', header: 'Status', sortable: true, cell: (row) => <Badge tone={tone(row.status)}>{row.status || 'Open'}</Badge> },
    { key: 'actions', header: 'Acties', cell: (row) => <div className="row-actions"><button className="icon-button" type="button" onClick={() => setActiveWeld(row)} aria-label="Details"><Eye size={16} /></button></div> },
  ];

  const inspectionColumns: ColumnDef<Inspection>[] = [
    { key: 'id', header: 'Inspectie', sortable: true, cell: (row) => <strong>{String(row.id)}</strong> },
    { key: 'weld_id', header: 'Weld', sortable: true, cell: (row) => String(row.weld_id || '—') },
    { key: 'due_date', header: 'Planning', sortable: true, cell: (row) => formatDate(row.due_date) },
    { key: 'result', header: 'Resultaat', sortable: true, cell: (row) => row.result || '—' },
    { key: 'status', header: 'Status', sortable: true, cell: (row) => <Badge tone={tone(row.status)}>{row.status || 'Open'}</Badge> },
    { key: 'actions', header: 'Acties', cell: (row) => <div className="row-actions"><button className="icon-button" type="button" onClick={() => setInspectionModal({ mode: 'edit', item: row })}><Pencil size={16} /></button><button className="icon-button" type="button" onClick={async () => { await approveInspection.mutateAsync(row.id); setMessage(`Inspectie ${row.id} goedgekeurd.`); }}><CheckCheck size={16} /></button><button className="icon-button" type="button" onClick={async () => { await deleteInspection.mutateAsync(row.id); setMessage(`Inspectie ${row.id} verwijderd.`); }}><Trash2 size={16} /></button></div> },
  ];

  const defectColumns: ColumnDef<Defect>[] = [
    { key: 'id', header: 'Defect', sortable: true, cell: (row) => <strong>{String(row.id)}</strong> },
    { key: 'weld_id', header: 'Weld', sortable: true, cell: (row) => String(row.weld_id || '—') },
    { key: 'severity', header: 'Ernst', sortable: true, cell: (row) => row.severity || '—' },
    { key: 'status', header: 'Status', sortable: true, cell: (row) => <Badge tone={tone(row.status)}>{row.status || 'Open'}</Badge> },
    { key: 'actions', header: 'Acties', cell: (row) => <div className="row-actions"><button className="icon-button" type="button" onClick={() => setDefectModal({ mode: 'edit', item: row })}><Pencil size={16} /></button><button className="icon-button" type="button" onClick={async () => { await resolveDefect.mutateAsync(row.id); setMessage(`Defect ${row.id} opgelost.`); }}><ShieldCheck size={16} /></button><button className="icon-button" type="button" onClick={async () => { await reopenDefect.mutateAsync(row.id); setMessage(`Defect ${row.id} heropend.`); }}><ShieldAlert size={16} /></button><button className="icon-button" type="button" onClick={async () => { await deleteDefect.mutateAsync(row.id); setMessage(`Defect ${row.id} verwijderd.`); }}><Trash2 size={16} /></button></div> },
  ];

  const totalForActiveTab = tab === 'welds' ? weldsQuery.data?.total ?? weldRows.length : tab === 'inspections' ? inspectionsQuery.data?.total ?? inspectionRows.length : defectsQuery.data?.total ?? defectRows.length;

  return (
    <div className="page-stack">
      <PageHeader title="Lascontrole" description="Fase 2: weld-, inspectie- en defectworkflow werkt nu op het enterprise list-contract met server-side page/limit/search/sort/status plus project-scoped detaildrawer." />
      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}
      {!hasProject ? <InlineMessage tone="danger">Selecteer eerst een projectscope om welds, inspecties en defecten te openen.</InlineMessage> : null}

      <Card>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
          <div style={{ gridColumn: '1 / -1' }}><ProjectScopePicker description="Lascontrole gebruikt altijd de actieve projectscope. Selecteer eerst een project en filter daarna op status of zoekterm." /></div>
          <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Zoek op las, inspectie of defect" disabled={!hasProject} />
          <Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} disabled={!hasProject}>
            <option value="all">Alle statussen</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="resolved">Resolved</option>
          </Select>
          <Select value={sortKey} onChange={(event) => { setSortKey(event.target.value); setPage(1); }}>
            <option value="inspection_date">Sorteer op datum</option>
            <option value="status">Sorteer op status</option>
            <option value="weld_number">Sorteer op lasnummer</option>
            <option value="due_date">Sorteer op planning</option>
          </Select>
        </div>
      </Card>

      <div className="card-grid cols-3">
        <Card><div className="metric-card"><span>Open inspecties</span><strong>{inspectionsQuery.data?.total ?? inspectionRows.length}</strong></div></Card>
        <Card><div className="metric-card"><span>Actieve welds</span><strong>{weldsQuery.data?.total ?? weldRows.length}</strong></div></Card>
        <Card><div className="metric-card"><span>Open defecten</span><strong>{defectsQuery.data?.total ?? defectRows.length}</strong></div></Card>
      </div>

      <Card>
        <Tabs value={tab} onChange={(next) => { setTab(next); setPage(1); }} tabs={[{ value: 'welds', label: 'Welds' }, { value: 'inspections', label: 'Inspecties' }, { value: 'defects', label: 'Defecten' }]} />
      </Card>

      {tab === 'welds' ? (
        <Card>
          <DataTableToolbar
            left={<span className="badge badge-neutral">Gebruik bij voorkeur project-scoped endpoints</span>}
            center={<span className="badge badge-warning">{weldRows.filter((item) => Number(item.defect_count || 0) > 0).length} met defecten</span>}
            right={<Button onClick={() => setWeldModal(true)}><Plus size={16} /> Nieuwe weld</Button>}
          />
          {weldsQuery.isLoading ? <LoadingState label="Welds laden..." /> : null}
          {weldsQuery.isError ? <ErrorState title="Welds niet geladen" description="Controleer GET /projects/{project_id}/welds of de fallback endpoint in de backend." /> : null}
          {!weldsQuery.isLoading && !weldsQuery.isError ? <DataTable columns={weldColumns} rows={weldRows} rowKey={(row) => String(row.id)} empty={<EmptyState title="Geen welds" description="Maak een weld aan of kies een project-ID." />} page={page} pageSize={limit} total={totalForActiveTab} onPageChange={setPage} /> : null}
        </Card>
      ) : null}

      {tab === 'inspections' ? (
        <Card>
          <DataTableToolbar left={<span className="badge badge-neutral">Inspectieresultaten en approvals</span>} right={<Button onClick={() => setInspectionModal({ mode: 'create' })}><Plus size={16} /> Nieuwe inspectie</Button>} />
          {inspectionsQuery.isLoading ? <LoadingState label="Inspecties laden..." /> : null}
          {inspectionsQuery.isError ? <ErrorState title="Inspecties niet geladen" description="Controleer GET /projects/{project_id}/inspections of /inspections." /> : null}
          {!inspectionsQuery.isLoading && !inspectionsQuery.isError ? <DataTable columns={inspectionColumns} rows={inspectionRows} rowKey={(row) => String(row.id)} empty={<EmptyState title="Geen inspecties" description="Maak een inspectie aan binnen het gekozen project." />} page={page} pageSize={limit} total={totalForActiveTab} onPageChange={setPage} /> : null}
        </Card>
      ) : null}

      {tab === 'defects' ? (
        <Card>
          <DataTableToolbar left={<span className="badge badge-neutral">Resolve, reopen en herstelstatus</span>} right={<Button onClick={() => setDefectModal({ mode: 'create' })}><Plus size={16} /> Nieuw defect</Button>} />
          {defectsQuery.isLoading ? <LoadingState label="Defecten laden..." /> : null}
          {defectsQuery.isError ? <ErrorState title="Defecten niet geladen" description="Controleer GET /projects/{project_id}/defects of /weld-defects." /> : null}
          {!defectsQuery.isLoading && !defectsQuery.isError ? <DataTable columns={defectColumns} rows={defectRows} rowKey={(row) => String(row.id)} empty={<EmptyState title="Geen defecten" description="Maak een defect aan binnen het gekozen project." />} page={page} pageSize={limit} total={totalForActiveTab} onPageChange={setPage} /> : null}
        </Card>
      ) : null}

      <Modal open={weldModal} onClose={() => setWeldModal(false)} title="Nieuwe weld" size="large">
        <WeldForm
          isSubmitting={createWeld.isPending}
          onSubmit={async (values) => {
            await createWeld.mutateAsync(values);
            setMessage('Weld opgeslagen.');
            pushNotification({ title: 'Weld opgeslagen', description: 'Nieuwe weld is opgeslagen via de bestaande backend.', tone: 'success' });
            setWeldModal(false);
          }}
        />
      </Modal>

      <Modal open={!!inspectionModal} onClose={() => setInspectionModal(null)} title={inspectionModal?.mode === 'edit' ? 'Inspectie bewerken' : 'Nieuwe inspectie'} size="large">
        <InspectionForm
          initial={inspectionModal?.item ? { ...inspectionModal.item, weld_id: inspectionModal.item.weld_id ? String(inspectionModal.item.weld_id) : '' } : undefined}
          isSubmitting={createInspection.isPending || updateInspection.isPending}
          onSubmit={async (values) => {
            if (inspectionModal?.mode === 'edit' && inspectionModal.item) {
              await updateInspection.mutateAsync({ inspectionId: inspectionModal.item.id, payload: values });
              await saveInspectionResult.mutateAsync({ inspectionId: inspectionModal.item.id, payload: { result: values.result, notes: values.notes, iso5817_level: 'C' } });
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
            <div className="detail-grid">
              <div><span>Proces</span><strong>{activeWeld.process || '—'}</strong></div>
              <div><span>WPS</span><strong>{activeWeld.wps_id || '—'}</strong></div>
              <div><span>Inspecteur</span><strong>{activeWeld.inspector_name || '—'}</strong></div>
              <div><span>Datum</span><strong>{formatDate(activeWeld.inspection_date)}</strong></div>
            </div>
            <div className="stack-actions">
              <Button variant="secondary" onClick={async () => {
                await resetToNorm.mutateAsync({ projectId: activeWeld.project_id || projectId, weldId: activeWeld.id });
                setMessage(`Weld ${activeWeld.weld_number || activeWeld.id} terug naar norm gezet.`);
              }}><Wrench size={16} /> Reset to norm</Button>
              <Button onClick={() => setInspectionModal({ mode: 'create' })}><Plus size={16} /> Inspectie toevoegen</Button>
              <Button variant="secondary" onClick={() => setDefectModal({ mode: 'create' })}><Plus size={16} /> Defect toevoegen</Button>
            </div>
            <div className="content-grid-2">
              <Card>
                <div className="section-title-row"><h3><ShieldCheck size={18} /> Inspecties</h3></div>
                {weldWorkflowInspections.isLoading ? <LoadingState label="Inspecties laden..." /> : null}
                {!weldWorkflowInspections.isLoading && !(weldWorkflowInspections.data?.items || []).length ? <EmptyState title="Geen inspecties" description="Nog geen inspecties gekoppeld aan deze weld." /> : null}
                <div className="list-stack compact-list">
                  {(weldWorkflowInspections.data?.items || []).map((item) => <div key={String(item.id)} className="list-row"><div><strong>{String(item.id)}</strong><div className="list-subtle">{item.result || 'Pending'} · {formatDate(item.due_date)}</div></div><Badge tone={tone(item.status)}>{item.status || 'Open'}</Badge></div>)}
                </div>
              </Card>
              <Card>
                <div className="section-title-row"><h3><ShieldAlert size={18} /> Defecten</h3></div>
                {weldWorkflowDefects.isLoading ? <LoadingState label="Defecten laden..." /> : null}
                {!weldWorkflowDefects.isLoading && !(weldWorkflowDefects.data?.items || []).length ? <EmptyState title="Geen defecten" description="Geen open defecten op deze weld." /> : null}
                <div className="list-stack compact-list">
                  {(weldWorkflowDefects.data?.items || []).map((item) => <div key={String(item.id)} className="list-row"><div><strong>{String(item.id)}</strong><div className="list-subtle">Ernst {item.severity || '—'}</div></div><Badge tone={tone(item.status)}>{item.status || 'Open'}</Badge></div>)}
                </div>
              </Card>
            </div>
            <Card>
              <div className="section-title-row"><h3><Paperclip size={18} /> Bijlagen</h3></div>
              {weldWorkflowAttachments.isLoading ? <LoadingState label="Bijlagen laden..." /> : null}
              {!weldWorkflowAttachments.isLoading && !(weldWorkflowAttachments.data?.items || []).length ? <EmptyState title="Geen bijlagen" description="Nog geen bijlagen gekoppeld aan deze weld." /> : null}
              <div className="list-stack compact-list">
                {(weldWorkflowAttachments.data?.items || []).map((item: CeDocument) => <div key={String(item.id)} className="list-row"><div><strong>{item.title || item.id}</strong><div className="list-subtle">Versie {item.version || '1.0'} · {item.type || 'Bestand'}</div></div><Badge tone={tone(item.status)}>{item.status || 'Actief'}</Badge></div>)}
              </div>
              <UploadDropzone multiple={false} disabled onFiles={() => undefined} />
              <div className="list-subtle"><UploadCloud size={12} /> Upload voor weld-bijlagen loopt via project/weld attachment endpoints in de bestaande backend.</div>
            </Card>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

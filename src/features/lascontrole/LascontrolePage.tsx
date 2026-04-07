import { useMemo, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { CheckCheck, ClipboardCheck, Eye, Pencil, Plus, ShieldAlert, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Modal } from '@/components/overlays/Modal';
import { useUiStore } from '@/app/store/ui-store';
import { useWelds, useCreateWeld, useUpdateWeld, useConformWeld, useBulkApproveWelds } from '@/hooks/useWelds';
import { useApproveInspection, useInspections, useUpdateInspection } from '@/hooks/useInspections';
import { useDefects } from '@/hooks/useDefects';
import { WeldForm } from '@/features/lascontrole/components/WeldForm';
import { InspectionForm } from '@/features/lascontrole/components/InspectionForm';
import { resolveProjectContextTab } from '@/features/projecten/components/ProjectContextTabs';
import { ProjectTabShell } from '@/features/projecten/components/ProjectTabShell';
import { ProjectContextHeader } from '@/features/projecten/components/ProjectContextHeader';
import type { Weld } from '@/types/domain';
import type { WeldFormValues } from '@/types/forms';
import { formatDate } from '@/utils/format';

function textOf(value: unknown, fallback = '—') {
  if (value == null) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}

function normalizedStatus(value?: string) {
  const raw = String(value || '').trim().toLowerCase().replace(/_/g, '-');
  if (!raw) return 'concept';
  if (raw === 'approved' || raw === 'accepted' || raw === 'ok') return 'conform';
  if (raw === 'rejected' || raw === 'repair-required' || raw === 'niet conform') return 'afgekeurd';
  if (raw === 'pending' || raw === 'in controle' || raw === 'in-control') return 'in-controle';
  return raw;
}

function tone(value?: string) {
  const status = normalizedStatus(value);
  if (['conform', 'resolved', 'goedgekeurd'].includes(status)) return 'success' as const;
  if (['afgekeurd', 'defect', 'niet-conform'].includes(status)) return 'danger' as const;
  return 'warning' as const;
}

function weldStatusLabel(value?: string) {
  const status = normalizedStatus(value);
  if (status === 'conform') return 'Conform';
  if (status === 'afgekeurd') return 'Niet conform';
  if (status === 'defect') return 'Defect';
  if (status === 'in-controle') return 'In behandeling';
  return 'Concept';
}

export function LascontrolePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId = '' } = useParams<{ projectId?: string }>();
  const hasProject = Boolean(projectId);
  const currentProjectTab = hasProject ? resolveProjectContextTab(location.pathname) : 'lascontrole';
  const globalSearch = useUiStore((state) => state.globalSearch);

  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [tab, setTab] = useState('welds');
  const [selectedWeldIds, setSelectedWeldIds] = useState<string[]>([]);
  const [weldModal, setWeldModal] = useState<{ mode: 'create' | 'edit'; item?: Weld } | null>(null);
  const [inspectionModal, setInspectionModal] = useState<Record<string, unknown> | null>(null);

  const mergedSearch = [search, globalSearch].filter(Boolean).join(' ').trim();

  const weldsQuery = useWelds({ page: 1, limit: 100, search: mergedSearch || undefined, project_id: projectId || undefined }, hasProject);
  const inspectionsQuery = useInspections({ page: 1, limit: 100, search: mergedSearch || undefined, project_id: projectId || undefined }, hasProject && tab === 'inspections');
  const defectsQuery = useDefects({ page: 1, limit: 100, search: mergedSearch || undefined, project_id: projectId || undefined }, hasProject && tab === 'defects');

  const createWeld = useCreateWeld();
  const updateWeld = useUpdateWeld(projectId);
  const conformWeld = useConformWeld(projectId);
  const bulkApproveWelds = useBulkApproveWelds();
  const updateInspection = useUpdateInspection();
  const approveInspection = useApproveInspection();

  const welds = useMemo(() => (weldsQuery.data?.items || []).filter((item) => {
    if (status === 'all') return true;
    return normalizedStatus(item.status) === normalizedStatus(status);
  }), [weldsQuery.data, status]);

  const inspections = useMemo(() => inspectionsQuery.data?.items || [], [inspectionsQuery.data]);
  const defects = useMemo(() => defectsQuery.data?.items || [], [defectsQuery.data]);

  const openInspectionCount = useMemo(() => inspections.filter((item) => normalizedStatus(String(item.status || '')) !== 'conform').length, [inspections]);
  const defectCount = useMemo(() => defects.length, [defects]);

  if (!hasProject) {
    return (
      <div className="page-stack">
        <PageHeader title="Lascontrole" description="Open eerst een project om lascontrole te gebruiken." />
        <ErrorState title="Geen projectcontext" description="Open eerst een project vanuit Projecten om lascontrole te gebruiken." />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader title="Lascontrole" description="Projectgebonden lascontrole met zichtbare status, kleurcodering en snelle goedkeuring." />
      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}
      <ProjectContextHeader projectId={projectId} title="Projecteigenschappen" />

      <ProjectTabShell
        projectId={projectId}
        currentTab={currentProjectTab}
        onCreateProject={() => navigate('/projecten?intent=create-project')}
        onCreateAssembly={() => navigate(`/projecten/${projectId}/assemblies`)}
        onCreateWeld={() => setWeldModal({ mode: 'create' })}
        filters={
          <div className="form-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoek op las, locatie, lasser of status" />
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">Alle statussen</option>
              <option value="conform">Conform</option>
              <option value="afgekeurd">Niet conform</option>
              <option value="defect">Defect</option>
              <option value="in-controle">In behandeling</option>
            </Select>
          </div>
        }
        kpis={
          <>
            <Card className="project-kpi-card"><div className="stat-card"><div className="stat-label">Lassen</div><div className="stat-value">{welds.length}</div><div className="stat-meta">Binnen dit project</div></div></Card>
            <Card className="project-kpi-card"><div className="stat-card"><div className="stat-label">Open inspecties</div><div className="stat-value">{openInspectionCount}</div><div className="stat-meta">Nog op te volgen</div></div></Card>
            <Card className="project-kpi-card"><div className="stat-card"><div className="stat-label">Defecten</div><div className="stat-value">{defectCount}</div><div className="stat-meta">Actieve defectmeldingen</div></div></Card>
            <Card className="project-kpi-card"><div className="stat-card"><div className="stat-label">Statusoverzicht</div><div className="stat-value">{welds.filter((item) => normalizedStatus(item.status) === 'conform').length}</div><div className="stat-meta">Conforme lassen</div></div></Card>
          </>
        }
      >
        <Card>
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'welds', label: 'Lassen' },
              { value: 'inspections', label: 'Inspecties' },
              { value: 'defects', label: 'Defecten' },
            ]}
          />
        </Card>

        {tab === 'welds' ? (
          <Card>
            <div className="toolbar-cluster" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="toolbar-cluster">
                <Badge tone="neutral">Dubbelklik opent wijzigen</Badge>
                <Badge tone="warning">{welds.filter((item) => normalizedStatus(item.status) === 'in-controle').length} in behandeling</Badge>
                <Badge tone="danger">{welds.filter((item) => normalizedStatus(item.status) === 'defect').length} defect</Badge>
              </div>
              <div className="toolbar-cluster">
                <Button
                  variant="secondary"
                  disabled={!selectedWeldIds.length || bulkApproveWelds.isPending}
                  onClick={async () => {
                    if (!selectedWeldIds.length) return;
                    await bulkApproveWelds.mutateAsync({ projectId, weldIds: selectedWeldIds });
                    setSelectedWeldIds([]);
                    setMessage('Geselecteerde lassen zijn op akkoord gezet.');
                  }}
                >
                  <CheckCheck size={16} /> Alles akkoord
                </Button>
                <Button onClick={() => setWeldModal({ mode: 'create' })}><Plus size={16} /> Nieuwe las</Button>
              </div>
            </div>

            {weldsQuery.isLoading ? <LoadingState label="Lassen laden..." /> : null}
            {weldsQuery.isError ? <ErrorState title="Lassen niet geladen" description="De lassen voor dit project konden niet worden opgehaald." /> : null}
            {!weldsQuery.isLoading && !weldsQuery.isError ? (
              welds.length ? (
                <div className="list-stack compact-list">
                  {welds.map((weld) => {
                    const checked = selectedWeldIds.includes(String(weld.id));
                    return (
                      <div key={String(weld.id)} className="list-row list-row-button" onDoubleClick={() => setWeldModal({ mode: 'edit', item: weld })}>
                        <div className="toolbar-cluster">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setSelectedWeldIds((current) => current.includes(String(weld.id)) ? current.filter((id) => id !== String(weld.id)) : [...current, String(weld.id)])}
                          />
                          <div>
                            <strong>{textOf(weld.weld_number || weld.weld_no, `Las ${weld.id}`)}</strong>
                            <div className="list-subtle">{textOf(weld.location)} · {textOf(weld.welder_name)} · {formatDate(weld.inspection_date)}</div>
                          </div>
                        </div>
                        <div className="toolbar-cluster">
                          <Badge tone={tone(String(weld.status || 'concept'))}>{weldStatusLabel(String(weld.status || 'concept'))}</Badge>
                          <Button variant="secondary" onClick={() => setWeldModal({ mode: 'edit', item: weld })}><Pencil size={16} /> Wijzigen</Button>
                          <Button variant="secondary" onClick={async () => {
                            await conformWeld.mutateAsync(weld.id);
                            setMessage(`Las ${textOf(weld.weld_number || weld.id, '')} op conform gezet.`);
                          }}><ShieldCheck size={16} /> Conform</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <EmptyState title="Nog geen lassen" description="Voeg een las toe om de projectgebonden lascontrole te starten." />
            ) : null}
          </Card>
        ) : null}

        {tab === 'inspections' ? (
          <Card>
            <div className="section-title-row"><h3>Inspecties</h3></div>
            {inspectionsQuery.isLoading ? <LoadingState label="Inspecties laden..." /> : null}
            {inspectionsQuery.isError ? <ErrorState title="Inspecties niet geladen" description="De inspecties konden niet worden opgehaald." /> : null}
            {!inspectionsQuery.isLoading && !inspectionsQuery.isError ? (
              inspections.length ? (
                <div className="list-stack compact-list">
                  {inspections.map((inspection) => (
                    <div key={String(inspection.id)} className="list-row list-row-button" onClick={() => setInspectionModal(inspection as unknown as Record<string, unknown>)}>                      <div>
                        <strong>{textOf(inspection.method, 'Inspectie')} · #{String(inspection.id)}</strong>
                        <div className="list-subtle">{textOf(inspection.inspector)} · {formatDate(inspection.due_date)} · {textOf(inspection.result, 'Nog te beoordelen')}</div>
                      </div>
                      <div className="toolbar-cluster">
                        <Badge tone={tone(String(inspection.status || 'in-controle'))}>{weldStatusLabel(String(inspection.status || 'in-controle'))}</Badge>
                        <Button variant="secondary" onClick={(event) => { event.stopPropagation(); setInspectionModal(inspection as unknown as Record<string, unknown>); }}><Eye size={16} /> Open</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <EmptyState title="Nog geen inspecties" description="Inspecties verschijnen hier zodra ze aan lassen zijn gekoppeld." />
            ) : null}
          </Card>
        ) : null}

        {tab === 'defects' ? (
          <Card>
            <div className="section-title-row"><h3>Defecten</h3></div>
            {defectsQuery.isLoading ? <LoadingState label="Defecten laden..." /> : null}
            {defectsQuery.isError ? <ErrorState title="Defecten niet geladen" description="De defecten konden niet worden opgehaald." /> : null}
            {!defectsQuery.isLoading && !defectsQuery.isError ? (
              defects.length ? (
                <div className="list-stack compact-list">
                  {defects.map((defect) => (
                    <div key={String(defect.id)} className="list-row">
                      <div>
                        <strong>{textOf(defect.defect_type, `Defect ${defect.id}`)}</strong>
                        <div className="list-subtle">{textOf(defect.severity, 'Onbekend')} · Las {textOf(defect.weld_id)} · {textOf(defect.description || defect.notes, 'Geen omschrijving')}</div>
                      </div>
                      <Badge tone={tone(String(defect.status || 'defect'))}>{weldStatusLabel(String(defect.status || 'defect'))}</Badge>
                    </div>
                  ))}
                </div>
              ) : <EmptyState title="Nog geen defecten" description="Defecten verschijnen hier zodra ze tijdens lascontrole zijn vastgelegd." />
            ) : null}
          </Card>
        ) : null}
      </ProjectTabShell>



      <Modal open={!!inspectionModal} onClose={() => setInspectionModal(null)} title="Inspectie wijzigen" size="large">
        {inspectionModal ? (
          <InspectionForm
            initial={{
              weld_id: String(inspectionModal.weld_id || ''),
              method: String(inspectionModal.method || 'VT'),
              status: String(inspectionModal.status || 'approved'),
              result: String(inspectionModal.result || inspectionModal.status || 'accepted'),
              due_date: String(inspectionModal.due_date || '').slice(0, 10),
              notes: String(inspectionModal.remarks || inspectionModal.notes || ''),
            }}
            weldOptions={welds.map((row) => ({ id: String(row.id), label: String(row.weld_number || row.weld_no || row.id) }))}
            defaultWeldId={String(inspectionModal.weld_id || '')}
            isSubmitting={updateInspection.isPending || approveInspection.isPending}
            onSubmit={async (values) => {
              try {
                await updateInspection.mutateAsync({
                  inspectionId: String(inspectionModal.id),
                  payload: {
                    id: String(inspectionModal.id),
                    weld_id: values.weld_id,
                    inspector: '',
                    inspected_at: values.due_date || null,
                    overall_status: values.status,
                    remarks: values.notes,
                    checks: [
                      { label: 'VISUAL_BASE', status: values.result === 'rejected' ? 'defect' : values.result === 'repair-required' ? 'gerepareerd' : 'conform' },
                      { label: 'DIMENSION_CHECK', status: values.result === 'rejected' ? 'defect' : values.result === 'repair-required' ? 'gerepareerd' : 'conform' },
                    ],
                  },
                });
                setMessage('Inspectie opgeslagen.');
                await inspectionsQuery.refetch();
                setInspectionModal(null);
              } catch (error) {
                setMessage(error instanceof Error ? error.message : 'Inspectie opslaan mislukt.');
              }
            }}
          />
        ) : null}
      </Modal>

      <Modal open={!!weldModal} onClose={() => setWeldModal(null)} title={weldModal?.mode === 'edit' ? 'Las wijzigen' : 'Nieuwe las'} size="large">
        <WeldForm
          initial={weldModal?.item ? {
            project_id: String(projectId),
            weld_number: String(weldModal.item.weld_number || weldModal.item.weld_no || ''),
            assembly_id: weldModal.item.assembly_id ? String(weldModal.item.assembly_id) : '',
            wps_id: String(weldModal.item.wps_id || ''),
            welder_name: String(weldModal.item.welder_name || ''),
            process: String(weldModal.item.process || '135'),
            location: String(weldModal.item.location || ''),
            status: String(weldModal.item.status || 'concept'),
          } : undefined}
          defaultProjectId={String(projectId)}
          isSubmitting={createWeld.isPending || updateWeld.isPending}
          submitLabel={weldModal?.mode === 'edit' ? 'Wijzigen' : 'Opslaan'}
          onSubmit={async (values: WeldFormValues) => {
            try {
              if (weldModal?.mode === 'edit' && weldModal.item) {
                await updateWeld.mutateAsync({ weldId: weldModal.item.id, payload: values });
                setMessage('Las gewijzigd.');
              } else {
                await createWeld.mutateAsync(values);
                setMessage('Las aangemaakt.');
              }
              setWeldModal(null);
            } catch (error) {
              setMessage(error instanceof Error ? error.message : 'Las opslaan mislukt.');
            }
          }}
        />
      </Modal>
    </div>
  );
}

export default LascontrolePage;

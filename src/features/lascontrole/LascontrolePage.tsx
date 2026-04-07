import { useMemo, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCheck, ClipboardCheck, Pencil, Plus, ShieldCheck, Wrench } from 'lucide-react';
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
import { useWelds, useCreateWeld, useUpdateWeld, useBulkApproveWelds, usePatchWeldStatus } from '@/hooks/useWelds';
import { useDefects } from '@/hooks/useDefects';
import { useUpsertWeldInspection, useWeldInspection } from '@/hooks/useInspections';
import { WeldForm } from '@/features/lascontrole/components/WeldForm';
import { resolveProjectContextTab } from '@/features/projecten/components/ProjectContextTabs';
import { ProjectTabShell } from '@/features/projecten/components/ProjectTabShell';
import { ProjectContextHeader } from '@/features/projecten/components/ProjectContextHeader';
import { ProjectKpiActionCard } from '@/features/projecten/components/ProjectKpiActionCard';
import type { Inspection, Weld, WeldStatus } from '@/types/domain';
import type { WeldFormValues } from '@/types/forms';
import { formatDate } from '@/utils/format';

function normalizeStatus(value?: string): WeldStatus {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'conform' || raw === 'approved' || raw === 'ok') return 'conform';
  if (raw === 'gerepareerd' || raw === 'resolved' || raw === 'repaired') return 'gerepareerd';
  return 'defect';
}

function tone(value?: string) {
  const status = normalizeStatus(value);
  if (status === 'conform') return 'success' as const;
  if (status === 'gerepareerd') return 'warning' as const;
  return 'danger' as const;
}

function weldStatusLabel(value?: string) {
  const status = normalizeStatus(value);
  if (status === 'conform') return 'Conform';
  if (status === 'gerepareerd') return 'Gerepareerd';
  return 'Defect';
}

function toInspectionPayload(inspection: Inspection | null, status: WeldStatus) {
  const sourceChecks = Array.isArray(inspection?.checks) ? inspection.checks : [];
  return {
    status,
    template_id: inspection?.template_id ? String(inspection.template_id) : undefined,
    remarks: inspection?.remarks || '',
    checks: sourceChecks.length
      ? sourceChecks.map((check) => ({
          group_key: String(check.group_key || 'algemeen'),
          criterion_key: String(check.criterion_key || ''),
          status: normalizeStatus(String(check.status || (check.approved ? 'conform' : 'defect'))),
          comment: String(check.comment || ''),
        }))
      : [
          { group_key: 'algemeen', criterion_key: 'VISUAL_BASE', status: 'conform' as WeldStatus, comment: '' },
          { group_key: 'maatvoering', criterion_key: 'DIMENSION_CHECK', status: status === 'conform' ? 'conform' as WeldStatus : 'defect' as WeldStatus, comment: '' },
        ],
  };
}

function InspectionEditor({
  projectId,
  weld,
  onSaved,
}: {
  projectId: string;
  weld: Weld;
  onSaved: (message: string) => void;
}) {
  const inspectionQuery = useWeldInspection(projectId, weld.id);
  const upsertInspection = useUpsertWeldInspection(projectId, String(weld.id));
  const [remarks, setRemarks] = useState('');

  const inspection = useMemo(() => inspectionQuery.data || null, [inspectionQuery.data]);
  const checks = useMemo(() => {
    const source = Array.isArray(inspection?.checks) ? inspection.checks : [];
    if (source.length) return source;
    return [
      { group_key: 'algemeen', criterion_key: 'VISUAL_BASE', status: 'conform', comment: '' },
      { group_key: 'maatvoering', criterion_key: 'DIMENSION_CHECK', status: 'conform', comment: '' },
    ];
  }, [inspection]);

  const updateCheckStatus = async (criterionKey: string, status: WeldStatus) => {
    const payload = {
      status,
      template_id: inspection?.template_id ? String(inspection.template_id) : undefined,
      remarks,
      checks: checks.map((check) => ({
        group_key: String(check.group_key || 'algemeen'),
        criterion_key: String(check.criterion_key || ''),
        status: String(check.criterion_key || '') === criterionKey ? status : normalizeStatus(String(check.status || 'conform')),
        comment: String(check.comment || ''),
      })),
    };
    await upsertInspection.mutateAsync(payload);
    onSaved(`Inspectie van las ${String(weld.weld_number || weld.weld_no || weld.id)} bijgewerkt.`);
  };

  if (inspectionQuery.isLoading) return <LoadingState label="Inspectie laden..." />;
  if (inspectionQuery.isError) return <ErrorState title="Inspectie niet geladen" description="De gekoppelde hoofdinspectie kon niet worden opgehaald." />;

  return (
    <div className="content-stack">
      <div className="detail-grid">
        <div><span>Las</span><strong>{String(weld.weld_number || weld.weld_no || weld.id)}</strong></div>
        <div><span>Executieklasse</span><strong>{String(weld.execution_class || 'Van project')}</strong></div>
        <div><span>Template</span><strong>{String(inspection?.template_id || weld.template_id || 'Automatisch')}</strong></div>
        <div><span>Status</span><strong>{weldStatusLabel(String(inspection?.status || weld.status))}</strong></div>
      </div>

      <div className="list-stack compact-list">
        {checks.map((check) => (
          <div key={`${check.group_key}-${check.criterion_key}`} className="list-row">
            <div>
              <strong>{String(check.criterion_key || 'Controlepunt')}</strong>
              <div className="list-subtle">{String(check.group_key || 'algemeen')}</div>
            </div>
            <div className="toolbar-cluster">
              <Badge tone={tone(String(check.status || 'conform'))}>{weldStatusLabel(String(check.status || 'conform'))}</Badge>
              <Button variant="secondary" disabled={upsertInspection.isPending} onClick={() => updateCheckStatus(String(check.criterion_key || ''), 'conform')}>Conform</Button>
              <Button variant="secondary" disabled={upsertInspection.isPending} onClick={() => updateCheckStatus(String(check.criterion_key || ''), 'defect')}>Defect</Button>
              <Button variant="secondary" disabled={upsertInspection.isPending} onClick={() => updateCheckStatus(String(check.criterion_key || ''), 'gerepareerd')}>Gerepareerd</Button>
            </div>
          </div>
        ))}
      </div>

      <div className="form-grid">
        <label className="field-group">
          <span className="field-label">Opmerkingen</span>
          <textarea className="input" value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={4} />
        </label>
        <div className="toolbar-cluster">
          <Button
            disabled={upsertInspection.isPending}
            onClick={async () => {
              await upsertInspection.mutateAsync({
                status: normalizeStatus(String(inspection?.status || weld.status)),
                template_id: inspection?.template_id ? String(inspection.template_id) : undefined,
                remarks,
                checks: checks.map((check) => ({
                  group_key: String(check.group_key || 'algemeen'),
                  criterion_key: String(check.criterion_key || ''),
                  status: normalizeStatus(String(check.status || 'conform')),
                  comment: String(check.comment || ''),
                })),
              });
              onSaved(`Opmerkingen van las ${String(weld.weld_number || weld.weld_no || weld.id)} opgeslagen.`);
            }}
          >
            Inspectie opslaan
          </Button>
        </div>
      </div>
    </div>
  );
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
  const [status, setStatus] = useState<'all' | WeldStatus>('all');
  const [selectedWeldIds, setSelectedWeldIds] = useState<string[]>([]);
  const [weldModal, setWeldModal] = useState<{ mode: 'create' | 'edit'; item?: Weld; activeTab?: 'gegevens' | 'lascontrole' } | null>(null);

  const mergedSearch = [search, globalSearch].filter(Boolean).join(' ').trim();

  const weldsQuery = useWelds({ page: 1, limit: 100, search: mergedSearch || undefined, project_id: projectId || undefined }, hasProject);
  const defectsQuery = useDefects({ page: 1, limit: 100, search: mergedSearch || undefined, project_id: projectId || undefined }, hasProject);

  const createWeld = useCreateWeld();
  const updateWeld = useUpdateWeld(projectId);
  const patchWeldStatus = usePatchWeldStatus(projectId);
  const bulkApproveWelds = useBulkApproveWelds();

  const welds = useMemo(() => (weldsQuery.data?.items || []).filter((item) => {
    if (status === 'all') return true;
    return normalizeStatus(item.status) === status;
  }), [weldsQuery.data, status]);

  const defectCount = useMemo(() => defectsQuery.data?.items?.length || 0, [defectsQuery.data]);
  const repairedCount = useMemo(() => welds.filter((item) => normalizeStatus(item.status) === 'gerepareerd').length, [welds]);
  const conformCount = useMemo(() => welds.filter((item) => normalizeStatus(item.status) === 'conform').length, [welds]);

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
      <PageHeader title="Lascontrole" description="Projectgebonden lassen, hoofdinspectie en uniforme statusknoppen binnen dezelfde projectshell." />
      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}
      <ProjectContextHeader projectId={projectId} title="Projecteigenschappen" />

      <ProjectTabShell
        projectId={projectId}
        currentTab={currentProjectTab}
        onBack={() => navigate('/projecten')}
        onCreateProject={() => navigate('/projecten?intent=create-project')}
        onEditProject={() => navigate(`/projecten/${projectId}/overzicht`)}
        onCreateAssembly={() => navigate(`/projecten/${projectId}/assemblies`)}
        onCreateWeld={() => setWeldModal({ mode: 'create', activeTab: 'gegevens' })}
        onExportSelectionPdf={() => navigate(`/projecten/${projectId}/ce-dossier`)}
        exportSelectionDisabled={!selectedWeldIds.length}
        exportSelectionLabel={selectedWeldIds.length ? `PDF export (${selectedWeldIds.length})` : 'PDF export'}
        filters={
          <div className="form-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoek op las, locatie, lasser of status" />
            <Select value={status} onChange={(event) => setStatus(event.target.value as 'all' | WeldStatus)}>
              <option value="all">Alle statussen</option>
              <option value="conform">Conform</option>
              <option value="defect">Defect</option>
              <option value="gerepareerd">Gerepareerd</option>
            </Select>
          </div>
        }
        kpis={
          <>
            <ProjectKpiActionCard label="Lassen" value={welds.length} meta="Direct bewerkbaar via dubbelklik." onClick={() => setStatus('all')} />
            <ProjectKpiActionCard label="Conform" value={conformCount} meta="Groene eindstatus." onClick={() => setStatus('conform')} />
            <ProjectKpiActionCard label="Defecten" value={defectCount || welds.filter((item) => normalizeStatus(item.status) === 'defect').length} meta="Rode eindstatus / defectflow." onClick={() => setStatus('defect')} />
            <ProjectKpiActionCard label="Gerepareerd" value={repairedCount} meta="Herstelde lassen en inspecties." onClick={() => setStatus('gerepareerd')} />
          </>
        }
      >
        <Card>
          <div className="toolbar-cluster" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="toolbar-cluster">
              <Badge tone="neutral">Dubbelklik opent “Las wijzigen”</Badge>
              <Badge tone="success">{conformCount} conform</Badge>
              <Badge tone="danger">{welds.filter((item) => normalizeStatus(item.status) === 'defect').length} defect</Badge>
              <Badge tone="warning">{repairedCount} gerepareerd</Badge>
            </div>
            <div className="toolbar-cluster">
              <Button
                variant="secondary"
                disabled={!selectedWeldIds.length || bulkApproveWelds.isPending}
                onClick={async () => {
                  if (!selectedWeldIds.length) return;
                  await bulkApproveWelds.mutateAsync({ projectId, weldIds: selectedWeldIds });
                  setSelectedWeldIds([]);
                  setMessage('Geselecteerde lassen zijn op conform gezet.');
                }}
              >
                <CheckCheck size={16} /> Alles akkoord
              </Button>
              <Button onClick={() => setWeldModal({ mode: 'create', activeTab: 'gegevens' })}><Plus size={16} /> Nieuwe las</Button>
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
                    <div key={String(weld.id)} className="list-row list-row-button" onDoubleClick={() => setWeldModal({ mode: 'edit', item: weld, activeTab: 'gegevens' })}>
                      <div className="toolbar-cluster">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setSelectedWeldIds((current) => current.includes(String(weld.id)) ? current.filter((id) => id !== String(weld.id)) : [...current, String(weld.id)])}
                        />
                        <div>
                          <strong>{String(weld.weld_number || weld.weld_no || `Las ${weld.id}`)}</strong>
                          <div className="list-subtle">{String(weld.location || 'Geen locatie')} · {String(weld.welder_name || 'Geen lasser')} · {formatDate(weld.inspection_date || weld.updated_at)}</div>
                        </div>
                      </div>
                      <div className="toolbar-cluster">
                        <Badge tone={tone(String(weld.status || 'defect'))}>{weldStatusLabel(String(weld.status || 'defect'))}</Badge>
                        <Button variant="secondary" onClick={() => setWeldModal({ mode: 'edit', item: weld, activeTab: 'gegevens' })}><Pencil size={16} /> Wijzigen</Button>
                        <Button variant="secondary" disabled={patchWeldStatus.isPending} onClick={async () => {
                          await patchWeldStatus.mutateAsync({ weldId: weld.id, status: 'conform' });
                          setMessage(`Las ${String(weld.weld_number || weld.id)} op conform gezet.`);
                        }}><ShieldCheck size={16} /> Conform</Button>
                        <Button variant="secondary" disabled={patchWeldStatus.isPending} onClick={async () => {
                          await patchWeldStatus.mutateAsync({ weldId: weld.id, status: 'defect' });
                          setMessage(`Las ${String(weld.weld_number || weld.id)} op defect gezet.`);
                        }}><AlertTriangle size={16} /> Defect</Button>
                        <Button variant="secondary" disabled={patchWeldStatus.isPending} onClick={async () => {
                          await patchWeldStatus.mutateAsync({ weldId: weld.id, status: 'gerepareerd' });
                          setMessage(`Las ${String(weld.weld_number || weld.id)} op gerepareerd gezet.`);
                        }}><Wrench size={16} /> Gerepareerd</Button>
                        <Button variant="secondary" onClick={() => setWeldModal({ mode: 'edit', item: weld, activeTab: 'lascontrole' })}><ClipboardCheck size={16} /> Inspectie</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <EmptyState title="Nog geen lassen" description="Voeg een las toe om de projectgebonden lascontrole te starten." />
          ) : null}
        </Card>
      </ProjectTabShell>

      <Modal open={!!weldModal} onClose={() => setWeldModal(null)} title={weldModal?.mode === 'edit' ? 'Las wijzigen' : 'Nieuwe las'} size="large">
        {weldModal?.mode === 'edit' && weldModal.item ? (
          <div className="content-stack">
            <Tabs
              value={weldModal.activeTab || 'gegevens'}
              onChange={(value) => setWeldModal((current) => current ? { ...current, activeTab: value as 'gegevens' | 'lascontrole' } : current)}
              tabs={[
                { value: 'gegevens', label: 'Gegevens van de las' },
                { value: 'lascontrole', label: 'Gegevens van de lascontrole' },
              ]}
            />

            {(weldModal.activeTab || 'gegevens') === 'gegevens' ? (
              <WeldForm
                initial={{
                  project_id: String(projectId),
                  weld_number: String(weldModal.item.weld_number || weldModal.item.weld_no || ''),
                  assembly_id: weldModal.item.assembly_id ? String(weldModal.item.assembly_id) : '',
                  wps_id: String(weldModal.item.wps_id || ''),
                  welder_name: String(weldModal.item.welder_name || ''),
                  process: String(weldModal.item.process || '135'),
                  location: String(weldModal.item.location || ''),
                  status: normalizeStatus(String(weldModal.item.status || 'defect')),
                  execution_class: (String(weldModal.item.execution_class || '') || '') as WeldFormValues['execution_class'],
                  template_id: String(weldModal.item.template_id || ''),
                }}
                defaultProjectId={String(projectId)}
                isSubmitting={updateWeld.isPending}
                submitLabel="Wijzigen"
                onSubmit={async (values: WeldFormValues) => {
                  await updateWeld.mutateAsync({ weldId: weldModal.item?.id, payload: values });
                  setMessage('Las gewijzigd.');
                  setWeldModal(null);
                }}
              />
            ) : (
              <InspectionEditor
                projectId={projectId}
                weld={weldModal.item}
                onSaved={(nextMessage) => setMessage(nextMessage)}
              />
            )}
          </div>
        ) : (
          <WeldForm
            defaultProjectId={String(projectId)}
            isSubmitting={createWeld.isPending}
            submitLabel="Opslaan"
            onSubmit={async (values: WeldFormValues) => {
              await createWeld.mutateAsync(values);
              setMessage('Las aangemaakt met gekoppelde hoofdinspectie.');
              setWeldModal(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

export default LascontrolePage;

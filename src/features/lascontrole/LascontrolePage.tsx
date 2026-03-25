import { useMemo, useState } from 'react';
import {
  CheckCheck,
  Eye,
  Paperclip,
  Pencil,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UploadCloud,
  Wrench,
} from 'lucide-react';
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
import {
  useApproveInspection,
  useCreateInspection,
  useDeleteInspection,
  useInspectionResults,
  useInspections,
  useSaveInspectionResult,
  useUpdateInspection,
  useUploadInspectionAttachment,
} from '@/hooks/useInspections';
import {
  useCreateDefect,
  useDefects,
  useDeleteDefect,
  useReopenDefect,
  useResolveDefect,
  useUpdateDefect,
} from '@/hooks/useDefects';
import {
  useBulkApproveWelds,
  useConformWeld,
  useCopyWeld,
  useCreateWeld,
  useUpdateWeld,
  useUploadWeldAttachment,
  useWeldAttachments,
  useWeldCompliance,
  useWeldDefects,
  useWeldInspections,
  useWelds,
} from '@/hooks/useWelds';
import { useInspectionTemplates } from '@/hooks/useSettings';
import { resetWeldToNorm } from '@/api/welds';
import { WeldForm } from '@/features/lascontrole/components/WeldForm';
import { InspectionForm } from '@/features/lascontrole/components/InspectionForm';
import { DefectForm } from '@/features/lascontrole/components/DefectForm';
import type { CeDocument, Defect, Inspection, Weld } from '@/types/domain';
import type { WeldFormValues } from '@/types/forms';
import { formatDate } from '@/utils/format';
import { useProjectContext } from '@/context/ProjectContext';

function textOf(value: unknown, fallback = '—'): string {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : fallback;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}

function tone(value?: string) {
  const status = String(value || '').toLowerCase();
  if (['goedgekeurd', 'approved', 'accepted', 'resolved', 'conform'].includes(status)) return 'success' as const;
  if (['afgekeurd', 'rejected', 'repair-required'].includes(status)) return 'danger' as const;
  return 'neutral' as const;
}

function isoLabel(value?: string) {
  const normalized = String(value || '').toUpperCase();
  if (!normalized) return '—';
  return `ISO 5817 ${normalized}`;
}

function normalizedStatus(value?: string) {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');

  if (!raw) return '';
  if (raw === 'pending') return 'open';
  if (raw === 'in controle' || raw === 'in-controle' || raw === 'in-control') return 'in-controle';
  if (raw === 'approved' || raw === 'accepted' || raw === 'ok') return 'conform';
  if (raw === 'rejected' || raw === 'repair-required') return 'afgekeurd';
  return raw;
}

function displayWeldNumber(row: Weld | Record<string, unknown>) {
  return textOf(
    (row as { weld_number?: unknown }).weld_number ??
      (row as { weld_no?: unknown }).weld_no ??
      (row as { id?: unknown }).id,
    '',
  );
}

function displayWelder(row: Weld | Record<string, unknown>) {
  return textOf((row as { welder_name?: unknown }).welder_name ?? (row as { welders?: unknown }).welders);
}

function displayWps(row: Weld | Record<string, unknown>) {
  return textOf((row as { wps_id?: unknown }).wps_id ?? (row as { wps?: unknown }).wps);
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
  const [sortKey, setSortKey] = useState('updated_at');
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

  const weldBaseParams = {
    page,
    limit,
    search: mergedSearch || undefined,
    sort: sortKey,
    direction: sortDirection,
  };

  const scopedBaseParams = {
    page,
    limit,
    search: mergedSearch || undefined,
    sort: sortKey,
    direction: sortDirection,
    project_id: hasProject ? projectId || undefined : undefined,
  };

  const globalWeldsQuery = useWelds(
    {
      ...weldBaseParams,
      project_id: undefined,
    },
    true,
  );

  const projectWeldsQuery = useWelds(
    {
      ...weldBaseParams,
      project_id: hasProject ? projectId || undefined : undefined,
    },
    hasProject && Boolean(projectId),
  );

  const inspectionsQuery = useInspections(scopedBaseParams, tab === 'inspections');
  const defectsQuery = useDefects(scopedBaseParams, tab === 'defects');
  const inspectionTemplates = useInspectionTemplates(Boolean(inspectionModal));

  const createWeld = useCreateWeld();
  const updateWeld = useUpdateWeld(activeWeld?.project_id || projectId || '');
  const copyWeld = useCopyWeld(projectId || activeWeld?.project_id || '');
  const conformWeld = useConformWeld(activeWeld?.project_id || projectId || '');
  const bulkApproveWelds = useBulkApproveWelds();

  const createInspection = useCreateInspection();
  const updateInspection = useUpdateInspection();
  const deleteInspection = useDeleteInspection();
  const saveInspectionResult = useSaveInspectionResult();
  const approveInspection = useApproveInspection();
  const uploadInspectionAttachment = useUploadInspectionAttachment();

  const createDefect = useCreateDefect();
  const updateDefect = useUpdateDefect();
  const resolveDefect = useResolveDefect();
  const reopenDefect = useReopenDefect();
  const deleteDefect = useDeleteDefect();

  const queryClient = useQueryClient();

  const resetToNorm = useMutation({
    mutationFn: ({ projectId: currentProjectId, weldId }: { projectId: string | number; weldId: string | number }) =>
      resetWeldToNorm(currentProjectId, weldId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['welds'] });
      queryClient.invalidateQueries({ queryKey: ['project-welds'] });
    },
  });

  const weldWorkflowInspections = useWeldInspections(activeWeld?.project_id || projectId, activeWeld?.id);
  const weldWorkflowDefects = useWeldDefects(activeWeld?.project_id || projectId, activeWeld?.id);
  const weldWorkflowAttachments = useWeldAttachments(activeWeld?.project_id || projectId, activeWeld?.id);
  const weldWorkflowCompliance = useWeldCompliance(activeWeld?.project_id || projectId, activeWeld?.id);
  const uploadWeldAttachment = useUploadWeldAttachment(activeWeld?.project_id || projectId || '', activeWeld?.id || '');
  const inspectionResultsQuery = useInspectionResults(inspectionModal?.item?.id);

  const globalWeldRows = useMemo(() => globalWeldsQuery.data?.items || [], [globalWeldsQuery.data]);
  const projectWeldRows = useMemo(() => projectWeldsQuery.data?.items || [], [projectWeldsQuery.data]);

  const sourceWeldRows = useMemo(() => {
    if (globalWeldRows.length > 0) return globalWeldRows;
    if (hasProject && projectWeldRows.length > 0) return projectWeldRows;
    return globalWeldRows;
  }, [globalWeldRows, projectWeldRows, hasProject]);

  const weldRows = useMemo(() => {
    let rows = [...sourceWeldRows];

    if (status !== 'all') {
      rows = rows.filter((item) => {
        const current = normalizedStatus(item.status);
        if (status === 'open') return ['open', 'in-controle'].includes(current);
        return current === normalizedStatus(status);
      });
    }

    if (quickFilter === 'with-defects') {
      rows = rows.filter((item) => Number(item.defect_count || 0) > 0);
    } else if (quickFilter === 'conform') {
      rows = rows.filter((item) => normalizedStatus(item.status) === 'conform');
    } else if (quickFilter === 'open') {
      rows = rows.filter((item) => ['open', 'in-controle'].includes(normalizedStatus(item.status)));
    }

    return rows;
  }, [sourceWeldRows, status, quickFilter]);

  const inspectionRows = useMemo(() => inspectionsQuery.data?.items || [], [inspectionsQuery.data]);
  const defectRows = useMemo(() => defectsQuery.data?.items || [], [defectsQuery.data]);

  const weldOptions = useMemo(
    () =>
      sourceWeldRows.map((row) => ({
        id: String(row.id),
        label: `${displayWeldNumber(row)} · ${textOf(row.location, 'Onbekende locatie')}`,
      })),
    [sourceWeldRows],
  );

  const templateOptions = useMemo(() => inspectionTemplates.data?.items || [], [inspectionTemplates.data]);
  const activeWeldProjectId = String(activeWeld?.project_id || projectId || '');
  const activeWeldId = activeWeld?.id ? String(activeWeld.id) : '';

  const complianceCards = useMemo(() => {
    if (weldWorkflowCompliance.data) {
      const checklist = Array.isArray(weldWorkflowCompliance.data.checklist) ? weldWorkflowCompliance.data.checklist : [];
      const missing = Array.isArray(weldWorkflowCompliance.data.missing_items)
        ? weldWorkflowCompliance.data.missing_items
        : [];
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
  }, [
    weldWorkflowAttachments.data,
    weldWorkflowCompliance.data,
    weldWorkflowDefects.data,
    weldWorkflowInspections.data,
  ]);

  const weldColumns: ColumnDef<Weld>[] = [
    {
      key: 'weld_number',
      header: 'Lasnummer',
      sortable: true,
      cell: (row) => <strong>{displayWeldNumber(row)}</strong>,
    },
    {
      key: 'project_name',
      header: 'Project',
      sortable: true,
      cell: (row) => textOf(row.project_name),
      hiddenByDefault: false,
    },
    {
      key: 'welder_name',
      header: 'Lasser',
      sortable: true,
      cell: (row) => displayWelder(row),
    },
    {
      key: 'process',
      header: 'Proces',
      sortable: true,
      cell: (row) => textOf(row.process),
    },
    {
      key: 'location',
      header: 'Locatie',
      sortable: true,
      cell: (row) => textOf(row.location),
    },
    {
      key: 'inspection_date',
      header: 'Datum',
      sortable: true,
      cell: (row) => formatDate(row.inspection_date),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (row) => <Badge tone={tone(row.status)}>{textOf(row.status, 'Open')}</Badge>,
    },
    {
      key: 'actions',
      header: 'Acties',
      cell: (row) => (
        <div className="row-actions">
          <button className="icon-button" type="button" onClick={() => setActiveWeld(row)} aria-label="Details">
            <Eye size={16} />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={() => {
              setActiveWeld(row);
              setWeldModalMode('edit');
              setWeldModal(true);
            }}
            aria-label="Bewerken"
          >
            <Pencil size={16} />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={async () => {
              const effectiveProjectId = String(row.project_id || projectId || '');
              if (!effectiveProjectId) {
                throw new Error('Project ontbreekt voor deze las. Kopiëren is niet mogelijk.');
              }
              const copy = await copyWeld.mutateAsync({
                weldId: row.id,
                weldNumber: `${displayWeldNumber(row)}-kopie`,
              });
              setMessage(`Las ${displayWeldNumber(row)} gekopieerd als ${textOf(copy.weld_number || copy.id, '')}.`);
            }}
            aria-label="Kopiëren"
          >
            <Plus size={16} />
          </button>
        </div>
      ),
    },
  ];

  const inspectionColumns: ColumnDef<Inspection>[] = [
    {
      key: 'id',
      header: 'Inspectie',
      sortable: true,
      cell: (row) => <strong>{String(row.id)}</strong>,
    },
    {
      key: 'weld_id',
      header: 'Las',
      sortable: true,
      cell: (row) => String(row.weld_id || '—'),
    },
    {
      key: 'inspector',
      header: 'Inspecteur',
      sortable: true,
      cell: (row) => textOf(row.inspector),
    },
    {
      key: 'due_date',
      header: 'Planning',
      sortable: true,
      cell: (row) => formatDate(row.due_date),
    },
    {
      key: 'result',
      header: 'Resultaat',
      sortable: true,
      cell: (row) => textOf(row.result),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (row) => <Badge tone={tone(row.status)}>{textOf(row.status, 'Open')}</Badge>,
    },
    {
      key: 'actions',
      header: 'Acties',
      cell: (row) => (
        <div className="row-actions">
          <button className="icon-button" type="button" onClick={() => setInspectionModal({ mode: 'edit', item: row })}>
            <Pencil size={16} />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={async () => {
              await approveInspection.mutateAsync(row.id);
              setMessage(`Inspectie ${row.id} goedgekeurd.`);
            }}
          >
            <CheckCheck size={16} />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={async () => {
              await deleteInspection.mutateAsync(row.id);
              setMessage(`Inspectie ${row.id} verwijderd.`);
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const defectColumns: ColumnDef<Defect>[] = [
    {
      key: 'id',
      header: 'Defect',
      sortable: true,
      cell: (row) => <strong>{String(row.id)}</strong>,
    },
    {
      key: 'weld_id',
      header: 'Las',
      sortable: true,
      cell: (row) => String(row.weld_id || '—'),
    },
    {
      key: 'defect_type',
      header: 'Type',
      sortable: true,
      cell: (row) => textOf(row.defect_type),
    },
    {
      key: 'severity',
      header: 'ISO 5817',
      sortable: true,
      cell: (row) => isoLabel(row.severity),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (row) => <Badge tone={tone(row.status)}>{textOf(row.status, 'Open')}</Badge>,
    },
    {
      key: 'actions',
      header: 'Acties',
      cell: (row) => (
        <div className="row-actions">
          <button className="icon-button" type="button" onClick={() => setDefectModal({ mode: 'edit', item: row })}>
            <Pencil size={16} />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={async () => {
              await resolveDefect.mutateAsync(row.id);
              setMessage(`Defect ${row.id} opgelost.`);
            }}
          >
            <ShieldCheck size={16} />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={async () => {
              await reopenDefect.mutateAsync(row.id);
              setMessage(`Defect ${row.id} heropend.`);
            }}
          >
            <ShieldAlert size={16} />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={async () => {
              await deleteDefect.mutateAsync(row.id);
              setMessage(`Defect ${row.id} verwijderd.`);
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const weldTotal =
    globalWeldRows.length > 0
      ? (globalWeldsQuery.data?.total ?? globalWeldRows.length)
      : hasProject
        ? (projectWeldsQuery.data?.total ?? projectWeldRows.length)
        : (globalWeldsQuery.data?.total ?? globalWeldRows.length);

  const totalForActiveTab =
    tab === 'welds'
      ? (status === 'all' && quickFilter === 'all' ? weldTotal : weldRows.length)
      : tab === 'inspections'
        ? (inspectionsQuery.data?.total ?? inspectionRows.length)
        : (defectsQuery.data?.total ?? defectRows.length);

  const openInspectionsCount = useMemo(() => {
    if (!inspectionsQuery.data) return 0;
    return inspectionRows.filter((item) => normalizedStatus(item.status) !== 'conform').length;
  }, [inspectionRows, inspectionsQuery.data]);

  const activeWeldFormInitial: Partial<WeldFormValues> | undefined = activeWeld
    ? {
        project_id: String(activeWeld.project_id || ''),
        weld_number: textOf(activeWeld.weld_number || (activeWeld as Record<string, unknown>).weld_no, ''),
        wps_id: textOf(activeWeld.wps_id || (activeWeld as Record<string, unknown>).wps, ''),
        welder_name: textOf(activeWeld.welder_name || (activeWeld as Record<string, unknown>).welders, ''),
        process: textOf(activeWeld.process, '135'),
        location: textOf(activeWeld.location, ''),
        status: textOf(activeWeld.status, 'open'),
      }
    : undefined;

  return (
    <div className="page-stack">
      <PageHeader
        title="Lascontrole"
        description="Weld-first overzicht met projectfallback, inspecties, defecten en Weld 360°."
      />

      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}

      <InlineMessage tone={hasProject ? 'neutral' : 'success'}>
        {hasProject
          ? 'Projectscope actief. Als de tenantbrede lassenlijst leeg is, gebruikt Lascontrole automatisch de projectlijst als fallback.'
          : 'Geen projectscope gekozen. Lascontrole draait tenantbreed over alle lassen.'}
      </InlineMessage>

      <Card>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <ProjectScopePicker description="Projectscope wordt gebruikt voor acties en fallbackweergave van lassen." />
          </div>

          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Zoek op las, project, WPS, lasser of defect"
          />

          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">Alle statussen</option>
            <option value="open">Open / in-controle</option>
            <option value="conform">Conform</option>
            <option value="afgekeurd">Afgekeurd</option>
          </Select>

          <Select
            value={sortKey}
            onChange={(event) => {
              setSortKey(event.target.value);
              setPage(1);
            }}
          >
            <option value="updated_at">Sorteer op gewijzigd</option>
            <option value="created_at">Sorteer op aangemaakt</option>
            <option value="status">Sorteer op status</option>
            <option value="weld_number">Sorteer op lasnummer</option>
          </Select>

          <Select value={sortDirection} onChange={(event) => setSortDirection(event.target.value as 'asc' | 'desc')}>
            <option value="desc">Nieuwste eerst</option>
            <option value="asc">Oudste eerst</option>
          </Select>
        </div>
      </Card>

      <div className="card-grid cols-3">
        <Card>
          <div className="metric-card">
            <span>Open inspecties</span>
            <strong>{openInspectionsCount}</strong>
          </div>
        </Card>

        <Card>
          <div className="metric-card">
            <span>Actieve lassen</span>
            <strong>{weldRows.length}</strong>
          </div>
        </Card>

        <Card>
          <div className="metric-card">
            <span>Lassen met defecten</span>
            <strong>{sourceWeldRows.filter((item) => Number(item.defect_count || 0) > 0).length}</strong>
          </div>
        </Card>
      </div>

      <Card>
        <Tabs
          value={tab}
          onChange={(next) => {
            setTab(next);
            setPage(1);
          }}
          tabs={[
            { value: 'welds', label: 'Lassen' },
            { value: 'inspections', label: 'Inspecties' },
            { value: 'defects', label: 'Defecten' },
          ]}
        />
      </Card>

      {tab === 'welds' ? (
        <Card>
          <DataTableToolbar
            left={
              <div className="stack-actions">
                <span className="badge badge-neutral">Dubbelklik opent Weld 360°</span>

                <button
                  type="button"
                  className={`badge ${quickFilter === 'all' ? 'badge-success' : 'badge-neutral'}`}
                  onClick={() => setQuickFilter('all')}
                >
                  Alle lassen
                </button>

                <button
                  type="button"
                  className={`badge ${quickFilter === 'open' ? 'badge-warning' : 'badge-neutral'}`}
                  onClick={() => setQuickFilter('open')}
                >
                  Open
                </button>

                <button
                  type="button"
                  className={`badge ${quickFilter === 'with-defects' ? 'badge-danger' : 'badge-neutral'}`}
                  onClick={() => setQuickFilter('with-defects')}
                >
                  Met defecten
                </button>

                <button
                  type="button"
                  className={`badge ${quickFilter === 'conform' ? 'badge-success' : 'badge-neutral'}`}
                  onClick={() => setQuickFilter('conform')}
                >
                  Conform
                </button>
              </div>
            }
            center={
              <span className="badge badge-warning">
                {weldRows.filter((item) => Number(item.defect_count || 0) > 0).length} met defecten
              </span>
            }
            right={
              <div className="stack-actions">
                <Button
                  variant="secondary"
                  disabled={!selectedWeldIds.length || bulkApproveWelds.isPending}
                  onClick={async () => {
                    if (!selectedWeldIds.length) return;

                    const selectedRows = sourceWeldRows.filter((row) => selectedWeldIds.includes(String(row.id)));
                    const grouped = selectedRows.reduce<Record<string, Array<string | number>>>((acc, row) => {
                      const key = String(row.project_id || '');
                      if (!key) return acc;
                      acc[key] = [...(acc[key] || []), row.id];
                      return acc;
                    }, {});

                    const entries = Object.entries(grouped);
                    if (!entries.length) {
                      setMessage('Selecteer lassen met een geldig project voordat je alles accordeert.');
                      return;
                    }

                    for (const [currentProjectId, weldIds] of entries) {
                      await bulkApproveWelds.mutateAsync({ projectId: currentProjectId, weldIds });
                    }

                    const count = selectedWeldIds.length;
                    setSelectedWeldIds([]);
                    setMessage(`${count} lassen in 1 klik geaccordeerd.`);
                  }}
                >
                  <CheckCheck size={16} /> Alles accorderen
                </Button>

                <Button
                  onClick={() => {
                    setWeldModalMode('create');
                    setWeldModal(true);
                  }}
                >
                  <Plus size={16} /> Nieuwe las
                </Button>
              </div>
            }
          />

          {globalWeldsQuery.isLoading || projectWeldsQuery.isLoading ? <LoadingState label="Lassen laden..." /> : null}

          {globalWeldsQuery.isError && !projectWeldRows.length ? (
            <ErrorState title="Lassen niet geladen" description="Controleer /welds of de projectfallback." />
          ) : null}

          {!globalWeldsQuery.isLoading &&
          !projectWeldsQuery.isLoading &&
          !(globalWeldsQuery.isError && !projectWeldRows.length) ? (
            <DataTable
              columns={weldColumns}
              rows={weldRows}
              rowKey={(row) => String(row.id)}
              empty={
                <EmptyState
                  title="Geen lassen"
                  description="Maak een las aan of verfijn het filter. Bij actieve projectscope wordt automatisch op projectniveau teruggevallen."
                />
              }
              selectable
              selectedRowKeys={selectedWeldIds}
              onToggleRow={(key) =>
                setSelectedWeldIds((current) =>
                  current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
                )
              }
              onToggleAll={() =>
                setSelectedWeldIds((current) =>
                  current.length === weldRows.length ? [] : weldRows.map((row) => String(row.id)),
                )
              }
              onRowDoubleClick={(row) => setActiveWeld(row)}
              page={page}
              pageSize={limit}
              total={totalForActiveTab}
              onPageChange={setPage}
            />
          ) : null}
        </Card>
      ) : null}

      {tab === 'inspections' ? (
        <Card>
          <DataTableToolbar
            left={<span className="badge badge-neutral">Inspectieresultaten, template-keuze en approvals</span>}
            right={
              <Button onClick={() => setInspectionModal({ mode: 'create' })}>
                <Plus size={16} /> Nieuwe inspectie
              </Button>
            }
          />

          {inspectionsQuery.isLoading ? <LoadingState label="Inspecties laden..." /> : null}

          {inspectionsQuery.isError ? (
            <ErrorState title="Inspecties niet geladen" description="Controleer de inspectie-endpoints voor het actieve project." />
          ) : null}

          {!inspectionsQuery.isLoading && !inspectionsQuery.isError ? (
            <DataTable
              columns={inspectionColumns}
              rows={inspectionRows}
              rowKey={(row) => String(row.id)}
              empty={
                <EmptyState
                  title="Geen inspecties"
                  description={
                    hasProject
                      ? 'Maak een inspectie aan binnen het gekozen project.'
                      : 'Kies eerst een projectscope om inspecties te bekijken.'
                  }
                />
              }
              onRowDoubleClick={(row) => setInspectionModal({ mode: 'edit', item: row })}
              page={page}
              pageSize={limit}
              total={totalForActiveTab}
              onPageChange={setPage}
            />
          ) : null}
        </Card>
      ) : null}

      {tab === 'defects' ? (
        <Card>
          <DataTableToolbar
            left={<span className="badge badge-neutral">ISO 5817 terminologie + herstelstatus</span>}
            right={
              <Button onClick={() => setDefectModal({ mode: 'create' })}>
                <Plus size={16} /> Nieuw defect
              </Button>
            }
          />

          {defectsQuery.isLoading ? <LoadingState label="Defecten laden..." /> : null}

          {defectsQuery.isError ? (
            <ErrorState title="Defecten niet geladen" description="Controleer de defect-endpoints voor het actieve project." />
          ) : null}

          {!defectsQuery.isLoading && !defectsQuery.isError ? (
            <DataTable
              columns={defectColumns}
              rows={defectRows}
              rowKey={(row) => String(row.id)}
              empty={
                <EmptyState
                  title="Geen defecten"
                  description={
                    hasProject
                      ? 'Maak een defect aan binnen het gekozen project.'
                      : 'Kies eerst een projectscope om defecten te bekijken.'
                  }
                />
              }
              onRowDoubleClick={(row) => setDefectModal({ mode: 'edit', item: row })}
              page={page}
              pageSize={limit}
              total={totalForActiveTab}
              onPageChange={setPage}
            />
          ) : null}
        </Card>
      ) : null}

      <Modal
        open={weldModal}
        onClose={() => setWeldModal(false)}
        title={weldModalMode === 'edit' ? 'Las bewerken' : 'Nieuwe las'}
        size="large"
      >
        <WeldForm
          initial={weldModalMode === 'edit' ? activeWeldFormInitial : undefined}
          defaultProjectId={String(projectId || activeWeld?.project_id || '')}
          submitLabel={weldModalMode === 'edit' ? 'Las bijwerken' : 'Las opslaan'}
          isSubmitting={createWeld.isPending || updateWeld.isPending}
          onSubmit={async (values) => {
            if (weldModalMode === 'edit' && activeWeld) {
              await updateWeld.mutateAsync({ weldId: activeWeld.id, payload: values });
              setMessage(`Las ${displayWeldNumber(activeWeld)} bijgewerkt.`);
              setActiveWeld({ ...activeWeld, ...values } as Weld);
            } else {
              const created = await createWeld.mutateAsync(values);
              setTab('welds');
              setStatus('all');
              setQuickFilter('all');
              setPage(1);
              setMessage(`Las ${textOf(created.weld_number || (created as Record<string, unknown>).weld_no || created.id, '')} opgeslagen.`);
              pushNotification({
                title: 'Las opgeslagen',
                description: 'Nieuwe las is opgeslagen via de bestaande backend.',
                tone: 'success',
              });
            }
            setWeldModal(false);
          }}
        />
      </Modal>

      <Modal
        open={!!inspectionModal}
        onClose={() => setInspectionModal(null)}
        title={inspectionModal?.mode === 'edit' ? 'Inspectie bewerken' : 'Nieuwe inspectie'}
        size="large"
      >
        <InspectionForm
          initial={
            inspectionModal?.item
              ? ({
                  ...inspectionModal.item,
                  weld_id: inspectionModal.item.weld_id ? String(inspectionModal.item.weld_id) : '',
                  notes: textOf(
                    (inspectionModal.item as Record<string, unknown>).notes ||
                      (inspectionModal.item as Record<string, unknown>).remarks,
                    '',
                  ),
                } as Partial<Record<string, unknown>>)
              : undefined
          }
          weldOptions={weldOptions}
          templateOptions={templateOptions}
          defaultWeldId={activeWeldId}
          isSubmitting={createInspection.isPending || updateInspection.isPending}
          onSubmit={async (values) => {
            const selectedTemplate = templateOptions.find(
              (item) => String(item.id) === String(values.template_id || ''),
            ) as Record<string, unknown> | undefined;

            const templateItems = Array.isArray(selectedTemplate?.items_json) ? selectedTemplate.items_json : [];

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
              const selectedWeld = sourceWeldRows.find((row) => String(row.id) === String(values.weld_id)) || activeWeld;
              const targetProjectId = selectedWeld?.project_id ? String(selectedWeld.project_id) : projectId || undefined;

              if (!targetProjectId) {
                throw new Error('Project ontbreekt voor deze inspectie. Kies eerst een project of een las met project.');
              }

              await createInspection.mutateAsync({
                projectId: targetProjectId,
                weldId: values.weld_id,
                payload: values,
              });
              setMessage('Inspectie aangemaakt.');
            }

            setInspectionModal(null);
          }}
        />

        {inspectionModal?.item ? (
          <div className="detail-stack" style={{ marginTop: 16 }}>
            <Card>
              <div className="section-title-row">
                <h3>Huidig resultaat</h3>
              </div>
              {inspectionResultsQuery.isLoading ? (
                <LoadingState label="Resultaat laden..." />
              ) : (
                <pre className="code-block">{JSON.stringify(inspectionResultsQuery.data || {}, null, 2)}</pre>
              )}
            </Card>

            <UploadDropzone
              multiple={false}
              disabled={uploadInspectionAttachment.isPending}
              onFiles={async (files) => {
                const file = files[0];
                if (!file || !inspectionModal.item) return;

                const formData = new FormData();
                formData.append('file', file);

                await uploadInspectionAttachment.mutateAsync({
                  inspectionId: inspectionModal.item.id,
                  formData,
                });

                setMessage(`Bijlage ${file.name} toegevoegd aan inspectie ${inspectionModal.item.id}.`);
              }}
            />
          </div>
        ) : null}
      </Modal>

      <Modal
        open={!!defectModal}
        onClose={() => setDefectModal(null)}
        title={defectModal?.mode === 'edit' ? 'Defect bewerken' : 'Nieuw defect'}
        size="large"
      >
        <DefectForm
          initial={
            defectModal?.item
              ? {
                  ...defectModal.item,
                  weld_id: defectModal.item.weld_id ? String(defectModal.item.weld_id) : '',
                  notes: textOf(
                    (defectModal.item as Record<string, unknown>).notes ||
                      (defectModal.item as Record<string, unknown>).description,
                    '',
                  ),
                }
              : undefined
          }
          weldOptions={weldOptions}
          defaultWeldId={activeWeldId}
          isSubmitting={createDefect.isPending || updateDefect.isPending}
          onSubmit={async (values) => {
            if (defectModal?.mode === 'edit' && defectModal.item) {
              await updateDefect.mutateAsync({ defectId: defectModal.item.id, payload: values });
              setMessage(`Defect ${defectModal.item.id} bijgewerkt.`);
            } else {
              const selectedWeld = sourceWeldRows.find((row) => String(row.id) === String(values.weld_id)) || activeWeld;
              const targetProjectId = selectedWeld?.project_id ? String(selectedWeld.project_id) : projectId;

              if (!targetProjectId) {
                throw new Error('Project ontbreekt voor dit defect. Kies eerst een las binnen een project.');
              }

              await createDefect.mutateAsync({
                projectId: targetProjectId,
                weldId: values.weld_id,
                payload: values,
              });

              setMessage('Defect aangemaakt.');
            }

            setDefectModal(null);
          }}
        />
      </Modal>

      <Drawer open={!!activeWeld} onClose={() => setActiveWeld(null)} title="Weld 360°">
        {activeWeld ? (
          <div className="detail-stack">
            <div className="detail-hero">
              <div>
                <h3>{displayWeldNumber(activeWeld)}</h3>
                <div className="list-subtle">
                  {displayWelder(activeWeld)} · {textOf(activeWeld.location, 'Locatie onbekend')}
                </div>
              </div>
              <Badge tone={tone(activeWeld.status)}>{textOf(activeWeld.status, 'Open')}</Badge>
            </div>

            <div className="kpi-strip">
              {complianceCards.map((item) => (
                <div key={item.label} className="kpi-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            <div className="detail-grid">
              <div>
                <span>Proces</span>
                <strong>{textOf(activeWeld.process)}</strong>
              </div>
              <div>
                <span>WPS</span>
                <strong>{displayWps(activeWeld)}</strong>
              </div>
              <div>
                <span>Inspecteur</span>
                <strong>{textOf(activeWeld.inspector_name || (activeWeld as Record<string, unknown>).inspector)}</strong>
              </div>
              <div>
                <span>Datum</span>
                <strong>{formatDate(activeWeld.inspection_date)}</strong>
              </div>
            </div>

            <div className="stack-actions">
              <Button
                variant="secondary"
                onClick={() => {
                  setWeldModalMode('edit');
                  setWeldModal(true);
                }}
              >
                <Pencil size={16} /> Las wijzigen
              </Button>

              <Button
                variant="secondary"
                disabled={!activeWeldProjectId || conformWeld.isPending}
                onClick={async () => {
                  await conformWeld.mutateAsync(activeWeld.id);
                  setMessage(`Las ${displayWeldNumber(activeWeld)} conform gezet.`);
                  setActiveWeld({ ...activeWeld, status: 'conform' });
                }}
              >
                <CheckCheck size={16} /> Conform
              </Button>

              <Button
                variant="secondary"
                onClick={async () => {
                  const targetProjectId = activeWeld.project_id || projectId;
                  if (!targetProjectId) {
                    throw new Error('Project ontbreekt voor reset to norm.');
                  }
                  await resetToNorm.mutateAsync({ projectId: targetProjectId, weldId: activeWeld.id });
                  setMessage(`Las ${displayWeldNumber(activeWeld)} terug naar norm gezet.`);
                  setActiveWeld({ ...activeWeld, status: 'open' });
                }}
              >
                <Wrench size={16} /> Reset to norm
              </Button>

              <Button onClick={() => setInspectionModal({ mode: 'create' })}>
                <Plus size={16} /> Inspectie toevoegen
              </Button>

              <Button variant="secondary" onClick={() => setDefectModal({ mode: 'create' })}>
                <Plus size={16} /> Defect toevoegen
              </Button>
            </div>

            <div className="content-grid-2">
              <Card>
                <div className="section-title-row">
                  <h3>
                    <ShieldCheck size={18} /> Inspecties
                  </h3>
                </div>

                {weldWorkflowInspections.isLoading ? <LoadingState label="Inspecties laden..." /> : null}

                {!weldWorkflowInspections.isLoading && !(weldWorkflowInspections.data?.items || []).length ? (
                  <EmptyState title="Geen inspecties" description="Nog geen inspecties gekoppeld aan deze las." />
                ) : null}

                <div className="list-stack compact-list">
                  {(weldWorkflowInspections.data?.items || []).map((item) => (
                    <div
                      key={String(item.id)}
                      className="list-row"
                      onDoubleClick={() => setInspectionModal({ mode: 'edit', item })}
                    >
                      <div>
                        <strong>{String(item.id)}</strong>
                        <div className="list-subtle">
                          {textOf(item.result, 'Pending')} · {formatDate(item.due_date)}
                        </div>
                      </div>
                      <Badge tone={tone(item.status)}>{textOf(item.status, 'Open')}</Badge>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <div className="section-title-row">
                  <h3>
                    <ShieldAlert size={18} /> Defecten
                  </h3>
                </div>

                {weldWorkflowDefects.isLoading ? <LoadingState label="Defecten laden..." /> : null}

                {!weldWorkflowDefects.isLoading && !(weldWorkflowDefects.data?.items || []).length ? (
                  <EmptyState title="Geen defecten" description="Geen open defecten op deze las." />
                ) : null}

                <div className="list-stack compact-list">
                  {(weldWorkflowDefects.data?.items || []).map((item) => (
                    <div
                      key={String(item.id)}
                      className="list-row"
                      onDoubleClick={() => setDefectModal({ mode: 'edit', item })}
                    >
                      <div>
                        <strong>{String(item.id)}</strong>
                        <div className="list-subtle">
                          {isoLabel(item.severity)} · {textOf(item.defect_type, 'Onbekend type')}
                        </div>
                      </div>
                      <Badge tone={tone(item.status)}>{textOf(item.status, 'Open')}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card>
              <div className="section-title-row">
                <h3>
                  <Paperclip size={18} /> Bijlagen
                </h3>
              </div>

              {weldWorkflowAttachments.isLoading ? <LoadingState label="Bijlagen laden..." /> : null}

              {!weldWorkflowAttachments.isLoading && !(weldWorkflowAttachments.data?.items || []).length ? (
                <EmptyState title="Geen bijlagen" description="Nog geen bijlagen gekoppeld aan deze las." />
              ) : null}

              <div className="list-stack compact-list">
                {(weldWorkflowAttachments.data?.items || []).map((item: CeDocument) => (
                  <div key={String(item.id)} className="list-row">
                    <div>
                      <strong>{textOf(item.title || item.id, '')}</strong>
                      <div className="list-subtle">
                        Versie {textOf(item.version, '1.0')} · {textOf(item.type, 'Bestand')}
                      </div>
                    </div>
                    <Badge tone={tone(textOf(item.status, 'Actief'))}>{textOf(item.status, 'Actief')}</Badge>
                  </div>
                ))}
              </div>

              <UploadDropzone
                multiple={false}
                disabled={uploadWeldAttachment.isPending}
                onFiles={async (files) => {
                  const file = files[0];
                  if (!file) return;

                  const formData = new FormData();
                  formData.append('files', file);

                  await uploadWeldAttachment.mutateAsync(formData);
                  setMessage(`Bijlage ${file.name} toegevoegd aan las ${displayWeldNumber(activeWeld)}.`);
                }}
              />

              <div className="list-subtle">
                <UploadCloud size={12} /> Foto&apos;s en documenten worden direct op de las opgeslagen voor audit en
                CE-dossier.
              </div>
            </Card>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
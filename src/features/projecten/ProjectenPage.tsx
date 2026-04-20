import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download, Eye, Filter, Pencil, Plus, Trash2 } from 'lucide-react';
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
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog';
import { useUiStore } from '@/app/store/ui-store';
import { useCreateProject, useDeleteProject, useProjects, useUpdateProject } from '@/hooks/useProjects';
import { ProjectForm } from '@/features/projecten/components/ProjectForm';
import { ProjectsFilterDrawer } from '@/features/projecten/components/ProjectsFilterDrawer';
import { BulkActionsBar } from '@/features/projecten/components/BulkActionsBar';
import type { Project } from '@/types/domain';
import { formatDate } from '@/utils/format';
import { downloadCsv } from '@/utils/export';

const initialFilters = {
  status: 'all',
  opdrachtgever: '',
  executionClass: 'all',
};

function toneFromStatus(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  const value = (status ?? '').toLowerCase();
  if (['gereed', 'vrijgegeven', 'conform'].includes(value)) return 'success';
  if (['geblokkeerd', 'afgekeurd', 'niet_conform', 'niet conform'].includes(value)) return 'danger';
  if (['in_controle', 'in controle', 'in_uitvoering', 'in uitvoering'].includes(value)) return 'warning';
  return 'neutral';
}

// D-04: CE-status tonen in projectenlijst
function CeStatusBadge({ ceStatus, ceScore }: { ceStatus?: string | null; ceScore?: number | null }) {
  if (!ceStatus) return null;
  const tone = toneFromStatus(ceStatus);
  const label = ceStatus === 'conform' ? 'Conform'
    : ceStatus === 'niet_conform' ? 'Niet conform'
    : ceStatus === 'in_controle' ? 'In controle'
    : ceStatus;
  return (
    <Badge tone={tone}>
      {label}{ceScore != null ? ` ${Math.round(ceScore)}%` : ''}
    </Badge>
  );
}

export function ProjectenPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const pushNotification = useUiStore((state) => state.pushNotification);
  const globalSearch = useUiStore((state) => state.globalSearch);
  const createProjectRequestNonce = useUiStore((state) => state.createProjectRequestNonce);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<keyof Project>('projectnummer');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const limit = 10;

  const mergedSearch = [search, globalSearch].filter(Boolean).join(' ').trim();

  const query = useProjects({ page, limit, search: mergedSearch || undefined });

  const rows = useMemo(() => {
    const input = [...(query.data?.items || [])];
    const filtered = input.filter((project) => {
      const status = String(project.status || '').toLowerCase();
      const client = String(project.client_name || (project as any).opdrachtgever || '').toLowerCase();
      const exec = String(project.execution_class || (project as any).executieklasse || '').toLowerCase();
      const matchesStatus = filters.status === 'all' || status === filters.status.toLowerCase();
      const matchesClient = !filters.opdrachtgever || client.includes(filters.opdrachtgever.toLowerCase());
      const matchesExec = filters.executionClass === 'all' || exec === filters.executionClass.toLowerCase();
      return matchesStatus && matchesClient && matchesExec;
    });
    filtered.sort((l, r) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      const a = String((l as any)[sortKey] ?? '').toLowerCase();
      const b = String((r as any)[sortKey] ?? '').toLowerCase();
      if (a < b) return -1 * dir;
      if (a > b) return 1 * dir;
      return 0;
    });
    return filtered;
  }, [query.data, filters, sortKey, sortDirection]);

  const columns: ColumnDef<Project>[] = [
    {
      key: 'projectnummer',
      header: 'Projectnummer',
      sortable: true,
      cell: (row) => <strong>{String((row as any).projectnummer || row.id)}</strong>,
    },
    {
      key: 'name',
      header: 'Omschrijving',
      sortable: true,
      cell: (row) => (row as any).name || (row as any).omschrijving || '—',
    },
    {
      key: 'client_name',
      header: 'Opdrachtgever',
      sortable: true,
      cell: (row) => (row as any).client_name || (row as any).opdrachtgever || '—',
    },
    {
      key: 'execution_class',
      header: 'EXC',
      sortable: true,
      cell: (row) => (row as any).execution_class || (row as any).executieklasse || '—',
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (row) => (
        <Badge tone={toneFromStatus(String((row as any).status || ''))}>
          {String((row as any).status || 'Onbekend')}
        </Badge>
      ),
    },
    // D-04: CE-status kolom toegevoegd
    {
      key: 'ce_status',
      header: 'CE',
      sortable: false,
      hiddenByDefault: false,
      cell: (row) => (
        <CeStatusBadge
          ceStatus={(row as any).ce_status}
          ceScore={(row as any).ce_score}
        />
      ),
    },
    {
      key: 'start_date',
      header: 'Start',
      sortable: true,
      hiddenByDefault: true,
      cell: (row) => formatDate((row as any).start_date),
    },
    {
      key: 'end_date',
      header: 'Eind',
      sortable: true,
      hiddenByDefault: true,
      cell: (row) => formatDate((row as any).end_date),
    },
    {
      key: 'actions',
      header: 'Acties',
      cell: (row) => (
        <div className="row-actions">
          <button className="icon-button" type="button"
            onClick={() => navigate(`/projecten/${row.id}/overzicht`)} aria-label="Open Project 360">
            <Eye size={16} />
          </button>
          <button className="icon-button" type="button"
            onClick={() => { setEditingProject(row); setModalMode('edit'); }} aria-label="Bewerken">
            <Pencil size={16} />
          </button>
          <button className="icon-button" type="button"
            onClick={() => setPendingDelete(row)} aria-label="Verwijderen">
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const activeFilterCount =
    Number(Boolean(filters.opdrachtgever)) +
    Number(filters.executionClass !== 'all') +
    Number(filters.status !== 'all');

  useEffect(() => {
    if (!createProjectRequestNonce) return;
    setEditingProject(null);
    setModalMode('create');
  }, [createProjectRequestNonce]);

  useEffect(() => {
    const queryIntent = new URLSearchParams(location.search).get('intent');
    const state = (location.state as { intent?: string; projectId?: string | number } | null) || null;
    const intent = state?.intent || queryIntent;
    if (intent === 'create-project') { setEditingProject(null); setModalMode('create'); }
    if (intent === 'edit-project' && state?.projectId) {
      const p = (query.data?.items || []).find((item) => String(item.id) === String(state.projectId)) || null;
      if (p) { setEditingProject(p); setModalMode('edit'); }
    }
    if (!intent) return;
    if (state?.intent) { navigate(location.pathname + location.search, { replace: true, state: null }); return; }
    if (queryIntent) { navigate(location.pathname, { replace: true }); }
  }, [location.pathname, location.search, location.state, navigate, query.data]);

  return (
    <div className="page-stack">
      <PageHeader
        title="Projecten"
        description="Dubbelklik op een project opent direct het wijzigvenster. Vanuit dezelfde tabel ga je ook door naar Project 360."
      />

      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}
      {selectedRows.length ? (
        <InlineMessage tone="neutral">{`${selectedRows.length} project(en) geselecteerd voor bulkacties.`}</InlineMessage>
      ) : null}

      <BulkActionsBar projectIds={selectedRows} onDone={setMessage} />

      <Card>
        <DataTableToolbar
          left={
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Zoek binnen projecten" />
          }
          center={
            <>
              <Button variant="secondary" onClick={() => setFilterDrawerOpen(true)}>
                <Filter size={16} /> Filters {activeFilterCount ? `(${activeFilterCount})` : ''}
              </Button>
              <Button variant="secondary"
                onClick={() => {
                  const exportRows = (selectedRows.length
                    ? rows.filter((r) => selectedRows.includes(String(r.id)))
                    : rows
                  ).map((p) => ({
                    projectnummer: (p as any).projectnummer || p.id,
                    omschrijving: (p as any).name || '',
                    opdrachtgever: (p as any).client_name || '',
                    executieklasse: (p as any).execution_class || '',
                    status: (p as any).status || '',
                    ce_status: (p as any).ce_status || '',
                    ce_score: (p as any).ce_score ?? '',
                    start: (p as any).start_date || '',
                    eind: (p as any).end_date || '',
                  }));
                  downloadCsv('projecten.csv', exportRows);
                  setMessage(selectedRows.length ? `${selectedRows.length} project(en) geëxporteerd.` : 'Projectselectie geëxporteerd.');
                  pushNotification({ title: 'Projectexport klaar', description: 'De selectie is als CSV geëxporteerd.', tone: 'success' });
                }}
                disabled={!rows.length}
              >
                <Download size={16} /> Export
              </Button>
              {selectedRows.length ? (
                <Button variant="secondary" onClick={() => setSelectedRows([])}>Selectie wissen</Button>
              ) : null}
            </>
          }
          right={
            <Button onClick={() => { setEditingProject(null); setModalMode('create'); }}>
              <Plus size={16} /> Nieuw project
            </Button>
          }
        />

        {query.isLoading ? <LoadingState label="Projecten laden..." /> : null}
        {query.isError ? <ErrorState title="Projecten niet geladen" description="De projectlijst kon niet worden opgehaald uit de backend." /> : null}
        {!query.isLoading && !query.isError ? (
          <DataTable
            onRowDoubleClick={(row) => { setEditingProject(row); setModalMode('edit'); }}
            columns={columns}
            rows={rows}
            rowKey={(row) => String(row.id)}
            sortKey={String(sortKey)}
            sortDirection={sortDirection}
            onSort={(key) => {
              setPage(1);
              if (sortKey === key) setSortDirection((p) => p === 'asc' ? 'desc' : 'asc');
              else { setSortKey(key as keyof Project); setSortDirection('asc'); }
            }}
            selectable
            selectedRowKeys={selectedRows}
            onToggleRow={(key) => setSelectedRows((c) => c.includes(key) ? c.filter((i) => i !== key) : [...c, key])}
            onToggleAll={() => setSelectedRows((c) => c.length === rows.length ? [] : rows.map((r) => String(r.id)))}
            empty={<EmptyState title="Geen projecten gevonden" description="Pas filters aan of voeg een nieuw project toe via de popup." />}
            page={page}
            total={query.data?.total ?? rows.length}
            pageSize={limit}
            onPageChange={setPage}
          />
        ) : null}
      </Card>

      <ProjectsFilterDrawer open={filterDrawerOpen} values={filters}
        onClose={() => { setFilterDrawerOpen(false); setPage(1); }}
        onChange={(patch) => setFilters((c) => ({ ...c, ...patch }))}
        onReset={() => { setFilters(initialFilters); setPage(1); }} />

      <Modal open={modalMode === 'create'} onClose={() => setModalMode(null)} title="Nieuw project" size="large">
        <ProjectForm isSubmitting={createProject.isPending} submitLabel="Project opslaan"
          onSubmit={async (values) => {
            try {
              const created = await createProject.mutateAsync(values);
              const warnings = (created as any).create_summary?.warnings || [];
              setMessage(warnings.length ? `Project aangemaakt met ${warnings.length} aandachtspunt(en).` : 'Project aangemaakt.');
              pushNotification({ title: 'Project aangemaakt', description: `Project ${(values as any).projectnummer || created.id} is opgeslagen.`, tone: 'success' });
              setModalMode(null);
              navigate(`/projecten/${created.id}/overzicht`);
            } catch (error) {
              const msg = error instanceof Error ? error.message : 'Project aanmaken mislukt.';
              setMessage(msg);
              pushNotification({ title: 'Project aanmaken mislukt', description: msg, tone: 'error' });
            }
          }}
        />
      </Modal>

      <Modal open={modalMode === 'edit' && !!editingProject} onClose={() => setModalMode(null)} title="Wijzig project" size="large">
        {editingProject ? (
          <ProjectForm initial={editingProject} isSubmitting={updateProject.isPending} submitLabel="Wijzigen"
            onSubmit={async (values) => {
              try {
                await updateProject.mutateAsync({ id: editingProject.id, payload: values });
                setMessage('Project gewijzigd.');
                pushNotification({ title: 'Project gewijzigd', description: `Wijzigingen op ${(editingProject as any).projectnummer || editingProject.id} zijn opgeslagen.`, tone: 'success' });
                setModalMode(null);
              } catch (error) {
                const msg = error instanceof Error ? error.message : 'Project wijzigen mislukt.';
                setMessage(msg);
                pushNotification({ title: 'Project wijzigen mislukt', description: msg, tone: 'error' });
              }
            }}
          />
        ) : null}
      </Modal>

      <ConfirmDialog open={!!pendingDelete} title="Project verwijderen"
        description="Het project wordt definitief verwijderd uit de projectlijst."
        danger confirmLabel="Verwijderen"
        onConfirm={async () => {
          if (!pendingDelete) return;
          try {
            await deleteProject.mutateAsync(pendingDelete.id);
            setPendingDelete(null);
            setSelectedRows((c) => c.filter((id) => id !== String(pendingDelete.id)));
            setMessage('Project verwijderd.');
          } catch (error) {
            const msg = error instanceof Error ? error.message : 'Project verwijderen mislukt.';
            setMessage(msg);
            pushNotification({ title: 'Project verwijderen mislukt', description: msg, tone: 'error' });
          }
        }}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}

export default ProjectenPage;

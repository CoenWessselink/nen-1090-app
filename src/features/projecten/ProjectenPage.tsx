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

function toneFromStatus(status: string) {
  const value = status.toLowerCase();
  if (['gereed', 'vrijgegeven', 'conform'].includes(value)) return 'success' as const;
  if (['geblokkeerd', 'afgekeurd'].includes(value)) return 'danger' as const;
  return 'warning' as const;
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
  const apiStatus = filters.status !== 'all' ? filters.status : undefined;
  const query = useProjects({
    page,
    limit,
    search: mergedSearch || undefined,
    sort: String(sortKey),
    direction: sortDirection,
    status: apiStatus,
  });

  const rows = useMemo(() => {
    const input = [...(query.data?.items || [])];
    return input.filter((project) => {
      const matchesClient = !filters.opdrachtgever || String(project.client_name || project.opdrachtgever || '').toLowerCase().includes(filters.opdrachtgever.toLowerCase());
      const exec = String(project.execution_class || project.executieklasse || '').toLowerCase();
      const matchesExecutionClass = filters.executionClass === 'all' || exec === filters.executionClass;
      return matchesClient && matchesExecutionClass;
    });
  }, [query.data, filters]);

  const openProject = (row: Project) => navigate(`/projecten/${row.id}/overzicht`);

  const columns: ColumnDef<Project>[] = [
    { key: 'projectnummer', header: 'Projectnummer', sortable: true, cell: (row) => <strong>{String(row.projectnummer || row.id)}</strong> },
    { key: 'name', header: 'Omschrijving', sortable: true, cell: (row) => row.name || row.omschrijving || '—' },
    { key: 'client_name', header: 'Opdrachtgever', sortable: true, cell: (row) => row.client_name || row.opdrachtgever || '—' },
    { key: 'execution_class', header: 'Executieklasse', sortable: true, cell: (row) => row.execution_class || row.executieklasse || '—' },
    { key: 'status', header: 'Status', sortable: true, cell: (row) => <Badge tone={toneFromStatus(String(row.status || ''))}>{String(row.status || 'Onbekend')}</Badge> },
    { key: 'start_date', header: 'Start', sortable: true, hiddenByDefault: true, cell: (row) => formatDate(row.start_date) },
    { key: 'end_date', header: 'Eind', sortable: true, hiddenByDefault: true, cell: (row) => formatDate(row.end_date) },
    {
      key: 'actions',
      header: 'Acties',
      cell: (row) => (
        <div className="row-actions">
          <button className="icon-button" type="button" onClick={() => openProject(row)} aria-label="Open Project 360"><Eye size={16} /></button>
          <button className="icon-button" type="button" onClick={() => { setEditingProject(row); setModalMode('edit'); }} aria-label="Bewerken"><Pencil size={16} /></button>
          <button className="icon-button" type="button" onClick={() => setPendingDelete(row)} aria-label="Verwijderen"><Trash2 size={16} /></button>
        </div>
      ),
    },
  ];

  const activeFilterCount = Number(Boolean(filters.opdrachtgever)) + Number(filters.executionClass !== 'all') + Number(filters.status !== 'all');

  useEffect(() => {
    if (!createProjectRequestNonce) return;
    setEditingProject(null);
    setModalMode('create');
  }, [createProjectRequestNonce]);

  useEffect(() => {
    const queryIntent = new URLSearchParams(location.search).get('intent');
    const stateIntent = (location.state as { intent?: string } | null)?.intent;
    const intent = stateIntent || queryIntent;
    if (intent !== 'create-project') return;

    setEditingProject(null);
    setModalMode('create');

    if (stateIntent) {
      navigate(location.pathname + location.search, { replace: true, state: null });
      return;
    }

    if (queryIntent) {
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.search, location.state, navigate]);

  return (
    <div className="page-stack">
      <PageHeader title="Projecten" description="Operationele projecthub met directe doorgang naar Project 360, assemblies, lassen, documenten en historie." />

      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}
      {selectedRows.length ? <InlineMessage tone="neutral">{`${selectedRows.length} project(en) geselecteerd voor bulkacties.`}</InlineMessage> : null}

      <BulkActionsBar projectIds={selectedRows} onDone={setMessage} />

      <Card>
        <DataTableToolbar
          left={<Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Zoek binnen projecten" />}
          center={
            <>
              <Button variant="secondary" onClick={() => setFilterDrawerOpen(true)}>
                <Filter size={16} /> Filters {activeFilterCount ? `(${activeFilterCount})` : ''}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  const exportRows = (selectedRows.length ? rows.filter((row) => selectedRows.includes(String(row.id))) : rows).map((project) => ({
                    projectnummer: project.projectnummer || project.id,
                    omschrijving: project.name || project.omschrijving || '',
                    opdrachtgever: project.client_name || project.opdrachtgever || '',
                    executieklasse: project.execution_class || project.executieklasse || '',
                    status: project.status || '',
                    start: project.start_date || '',
                    eind: project.end_date || '',
                  }));
                  downloadCsv('projecten.csv', exportRows);
                  setMessage(selectedRows.length ? `${selectedRows.length} geselecteerde project(en) geëxporteerd.` : 'Huidige projectselectie geëxporteerd.');
                  pushNotification({ title: 'Projectexport klaar', description: 'De huidige projectselectie is als CSV geëxporteerd.', tone: 'success' });
                }}
                disabled={!rows.length}
              ><Download size={16} /> Export</Button>
              {selectedRows.length ? (
                <Button variant="secondary" onClick={() => setSelectedRows([])}>Selectie wissen</Button>
              ) : null}
            </>
          }
          right={<Button onClick={() => { setEditingProject(null); setModalMode('create'); }}><Plus size={16} /> Nieuw project</Button>}
        />

        {query.isLoading ? <LoadingState label="Projecten laden..." /> : null}
        {query.isError ? <ErrorState title="Projecten niet geladen" description="De projectlijst kon niet worden opgehaald uit de backend." /> : null}
        {!query.isLoading && !query.isError ? (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => String(row.id)}
            sortKey={String(sortKey)}
            sortDirection={sortDirection}
            onSort={(key) => {
              setPage(1);
              if (sortKey === key) setSortDirection((prev) => prev === 'asc' ? 'desc' : 'asc');
              else {
                setSortKey(key as keyof Project);
                setSortDirection('asc');
              }
            }}
            selectable
            onRowDoubleClick={(row) => { setEditingProject(row); setModalMode('edit'); }}
            selectedRowKeys={selectedRows}
            onToggleRow={(key) => setSelectedRows((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])}
            onToggleAll={() => setSelectedRows((current) => current.length === rows.length ? [] : rows.map((row) => String(row.id)))}
            empty={<EmptyState title="Geen projecten gevonden" description="Pas filters aan of voeg een nieuw project toe via de modal." />}
            page={page}
            total={query.data?.total ?? rows.length}
            pageSize={limit}
            onPageChange={setPage}
          />
        ) : null}
      </Card>

      <ProjectsFilterDrawer
        open={filterDrawerOpen}
        values={filters}
        onClose={() => { setFilterDrawerOpen(false); setPage(1); }}
        onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
        onReset={() => { setFilters(initialFilters); setPage(1); }}
      />

      <Modal open={modalMode === 'create'} onClose={() => setModalMode(null)} title="Nieuw project" size="large">
        <ProjectForm
          isSubmitting={createProject.isPending}
          onSubmit={async (values) => {
            try {
              const createdProject = await createProject.mutateAsync(values);
              const summary = (createdProject as { create_summary?: { assemblies_created?: number; welds_created?: number; photos_uploaded?: number; warnings?: Array<{ message?: string }> } }).create_summary;
              const warningCount = summary?.warnings?.length || 0;
              const description = [
                `Assemblies: ${summary?.assemblies_created ?? 0}`,
                `Lassen: ${summary?.welds_created ?? 0}`,
                `Foto's: ${summary?.photos_uploaded ?? 0}`,
                `Waarschuwingen: ${warningCount}`,
              ].join(' · ');
              setMessage(
                warningCount
                  ? `Project aangemaakt met aandachtspunten. ${description}`
                  : `Project aangemaakt en direct geopend in Project 360. ${description}`,
              );
              pushNotification({
                title: warningCount ? 'Project aangemaakt met waarschuwingen' : 'Nieuw project aangemaakt',
                description,
                tone: warningCount ? 'warning' : 'success',
              });
              setModalMode(null);
              navigate(`/projecten/${createdProject.id}/overzicht`);
            } catch (error) {
              setMessage(error instanceof Error ? error.message : 'Project aanmaken mislukt.');
            }
          }}
        />
      </Modal>

      <Modal open={modalMode === 'edit' && !!editingProject} onClose={() => setModalMode(null)} title="Project bewerken" size="large">
        {editingProject ? (
          <ProjectForm
            initial={editingProject}
            isSubmitting={updateProject.isPending}
            onSubmit={async (values) => {
              try {
                await updateProject.mutateAsync({ id: editingProject.id, payload: values });
                setMessage('Project bijgewerkt.');
                pushNotification({ title: 'Project bijgewerkt', description: `Wijzigingen op ${editingProject.projectnummer || editingProject.id} zijn opgeslagen.`, tone: 'success' });
                setModalMode(null);
              } catch (error) {
                setMessage(error instanceof Error ? error.message : 'Project bijwerken mislukt.');
              }
            }}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Project verwijderen"
        description="Het project wordt definitief verwijderd uit de projectlijst."
        danger
        confirmLabel="Verwijderen"
        onConfirm={async () => {
          if (!pendingDelete) return;
          try {
            await deleteProject.mutateAsync(pendingDelete.id);
            setPendingDelete(null);
            setSelectedRows((current) => current.filter((id) => id !== String(pendingDelete.id)));
            setMessage('Project verwijderd.');
          } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Project verwijderen mislukt.');
          }
        }}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}

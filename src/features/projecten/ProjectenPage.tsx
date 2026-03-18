import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Download, Eye, Filter, FolderOpen, Pencil, Plus, Trash2 } from 'lucide-react';
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
import { Project360Drawer } from '@/features/projecten/components/Project360Drawer';
import { BulkActionsBar } from '@/features/projecten/components/BulkActionsBar';
import { useProjectContext } from '@/context/ProjectContext';
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
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const pushNotification = useUiStore((state) => state.pushNotification);
  const { setProject, activeProject: currentScopedProject } = useProjectContext();
  const globalSearch = useUiStore((state) => state.globalSearch);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
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
          <button className="icon-button" type="button" onClick={() => setActiveProject(row)} aria-label="Openen"><Eye size={16} /></button>
          <button className="icon-button" type="button" onClick={() => { setProject({ id: String(row.id), name: String(row.name || row.omschrijving || row.client_name || ''), projectnummer: String(row.projectnummer || '') }); setMessage(`Projectscope actief: ${row.projectnummer || row.id}.`); }} aria-label="Gebruik als projectscope"><FolderOpen size={16} /></button>
          <button className="icon-button" type="button" onClick={() => { setActiveProject(row); setModalMode('edit'); }} aria-label="Bewerken"><Pencil size={16} /></button>
          <button className="icon-button" type="button" onClick={() => setPendingDelete(row)} aria-label="Verwijderen"><Trash2 size={16} /></button>
        </div>
      ),
    },
  ];

  const activeFilterCount = Number(Boolean(filters.opdrachtgever)) + Number(filters.executionClass !== 'all') + Number(filters.status !== 'all');

  return (
    <div className="page-stack">
      <PageHeader title="Projecten" description="Fase 2: projectlijst draait op enterprise list-contract met server-side page/limit/search/sort/status plus 360° detaildrawer voor assemblies, welds, inspecties, documenten, compliance en exports." />

      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}
      {selectedRows.length ? <InlineMessage tone="neutral">{`${selectedRows.length} project(en) geselecteerd voor bulkacties.`}</InlineMessage> : null}
      {currentScopedProject ? <InlineMessage tone="success">{`Actieve projectscope: ${currentScopedProject.projectnummer || currentScopedProject.name || currentScopedProject.id}`}</InlineMessage> : null}

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
          right={<Button onClick={() => { setActiveProject(null); setModalMode('create'); }}><Plus size={16} /> Nieuw project</Button>}
        />

        {query.isLoading ? <LoadingState label="Projecten laden..." /> : null}
        {query.isError ? <ErrorState title="Projecten niet geladen" description="De frontend verwacht een werkend GET /projects endpoint in de bestaande backend." /> : null}
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
              await createProject.mutateAsync(values);
              setMessage('Project aangemaakt.');
              pushNotification({ title: 'Nieuw project aangemaakt', description: 'Het project is opgeslagen via de bestaande backend.', tone: 'success' });
              setModalMode(null);
            } catch (error) {
              setMessage(error instanceof Error ? error.message : 'Project aanmaken mislukt.');
            }
          }}
        />
      </Modal>

      <Modal open={modalMode === 'edit' && !!activeProject} onClose={() => setModalMode(null)} title="Project bewerken" size="large">
        {activeProject ? (
          <ProjectForm
            initial={activeProject}
            isSubmitting={updateProject.isPending}
            onSubmit={async (values) => {
              try {
                await updateProject.mutateAsync({ id: activeProject.id, payload: values });
                setMessage('Project bijgewerkt.');
                pushNotification({ title: 'Project bijgewerkt', description: `Wijzigingen op ${activeProject.projectnummer || activeProject.id} zijn opgeslagen.`, tone: 'success' });
                setModalMode(null);
              } catch (error) {
                setMessage(error instanceof Error ? error.message : 'Bijwerken mislukt.');
              }
            }}
          />
        ) : null}
      </Modal>

      <Project360Drawer project={activeProject} open={!!activeProject && modalMode !== 'edit'} onClose={() => setActiveProject(null)} onMessage={setMessage} />

      <ConfirmDialog
        open={!!pendingDelete}
        title="Project verwijderen"
        description="Dit project wordt verwijderd uit de frontendlijst en gekoppelde records kunnen hierdoor niet meer bereikbaar zijn."
        danger
        confirmLabel="Verwijderen"
        onConfirm={async () => {
          if (!pendingDelete) return;
          try {
            await deleteProject.mutateAsync(pendingDelete.id);
            setMessage('Project verwijderd.');
            setPendingDelete(null);
          } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Verwijderen mislukt.');
          }
        }}
        onClose={() => setPendingDelete(null)}
      />

    </div>
  );
}

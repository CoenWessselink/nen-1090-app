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
import { ProjectKpiActionCard } from '@/features/projecten/components/ProjectKpiActionCard';
import type { Project } from '@/types/domain';
import { formatDate } from '@/utils/format';
import { downloadCsv } from '@/utils/export';

const initialFilters = {
  status: 'all',
  opdrachtgever: '',
  executionClass: 'all',
};

type NormalizedProjectStatus = {
  key: 'conform' | 'non_conform' | 'in_progress' | 'warning';
  label: string;
  tone: 'success' | 'danger' | 'warning' | 'neutral';
};

function normalizeProjectStatus(project: Project): NormalizedProjectStatus {
  const statusText = String(project.status || '').toLowerCase();
  const complianceText = String((project as Record<string, unknown>).ce_status || (project as Record<string, unknown>).compliance_status || '').toLowerCase();
  const combined = `${statusText} ${complianceText}`;

  if (combined.includes('niet conform') || combined.includes('non_conform') || combined.includes('non-conform') || combined.includes('afgekeurd') || combined.includes('geblokkeerd') || combined.includes('defect')) {
    return { key: 'non_conform', label: 'Niet conform', tone: 'danger' };
  }
  if (combined.includes('conform') || combined.includes('gereed') || combined.includes('approved') || combined.includes('vrijgegeven')) {
    return { key: 'conform', label: 'Conform', tone: 'success' };
  }
  if (combined.includes('controle') || combined.includes('review') || combined.includes('uitvoering') || combined.includes('in_progress') || combined.includes('progress')) {
    return { key: 'in_progress', label: 'In controle', tone: 'warning' };
  }
  return { key: 'warning', label: 'Aandacht nodig', tone: 'neutral' };
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

  const query = useProjects({
    page,
    limit,
    search: mergedSearch || undefined,
  });

  const rows = useMemo(() => {
    const input = [...(query.data?.items || [])];

    const filtered = input.filter((project) => {
      const normalizedStatus = normalizeProjectStatus(project).key;
      const client = String(project.client_name || project.opdrachtgever || '').toLowerCase();
      const exec = String(project.execution_class || project.executieklasse || '').toLowerCase();

      const matchesStatus = filters.status === 'all' || normalizedStatus === filters.status.toLowerCase();
      const matchesClient = !filters.opdrachtgever || client.includes(filters.opdrachtgever.toLowerCase());
      const matchesExecutionClass = filters.executionClass === 'all' || exec === filters.executionClass.toLowerCase();

      return matchesStatus && matchesClient && matchesExecutionClass;
    });

    filtered.sort((left, right) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      const a = String(left[sortKey] ?? '').toLowerCase();
      const b = String(right[sortKey] ?? '').toLowerCase();
      if (a < b) return -1 * direction;
      if (a > b) return 1 * direction;
      return 0;
    });

    return filtered;
  }, [query.data, filters, sortKey, sortDirection]);

  const projectStatusSummary = useMemo(() => {
    return rows.reduce(
      (summary, project) => {
        const normalized = normalizeProjectStatus(project).key;
        summary.total += 1;
        if (normalized === 'conform') summary.conform += 1;
        else if (normalized === 'non_conform') summary.nonConform += 1;
        else if (normalized === 'in_progress') summary.inProgress += 1;
        else summary.warning += 1;
        return summary;
      },
      { total: 0, conform: 0, nonConform: 0, inProgress: 0, warning: 0 },
    );
  }, [rows]);

  const columns: ColumnDef<Project>[] = [
    {
      key: 'projectnummer',
      header: 'Projectnummer',
      sortable: true,
      cell: (row) => <strong>{String(row.projectnummer || row.id)}</strong>,
    },
    {
      key: 'name',
      header: 'Omschrijving',
      sortable: true,
      cell: (row) => {
        const normalized = normalizeProjectStatus(row);
        return (
          <div>
            <strong>{row.name || row.omschrijving || '—'}</strong>
            <div className="list-subtle">{normalized.label} · Project 360 en wijzigflow direct beschikbaar</div>
          </div>
        );
      },
    },
    {
      key: 'client_name',
      header: 'Opdrachtgever',
      sortable: true,
      cell: (row) => row.client_name || row.opdrachtgever || '—',
    },
    {
      key: 'execution_class',
      header: 'Executieklasse',
      sortable: true,
      cell: (row) => row.execution_class || row.executieklasse || '—',
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (row) => {
        const normalized = normalizeProjectStatus(row);
        return <Badge tone={normalized.tone}>{normalized.label}</Badge>;
      },
    },
    {
      key: 'start_date',
      header: 'Start',
      sortable: true,
      hiddenByDefault: true,
      cell: (row) => formatDate(row.start_date),
    },
    {
      key: 'end_date',
      header: 'Eind',
      sortable: true,
      hiddenByDefault: true,
      cell: (row) => formatDate(row.end_date),
    },
    {
      key: 'actions',
      header: 'Acties',
      cell: (row) => (
        <div className="row-actions">
          <button className="icon-button" type="button" onClick={() => navigate(`/projecten/${row.id}/overzicht`)} aria-label="Open Project 360">
            <Eye size={16} />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={() => {
              setEditingProject(row);
              setModalMode('edit');
            }}
            aria-label="Bewerken"
          >
            <Pencil size={16} />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={() => {
              setPendingDelete(row);
            }}
            aria-label="Verwijderen"
          >
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
    const stateIntent = state?.intent;
    const intent = stateIntent || queryIntent;

    if (intent === 'create-project') {
      setEditingProject(null);
      setModalMode('create');
    }

    if (intent === 'edit-project' && state?.projectId) {
      const projectToEdit = (query.data?.items || []).find((item) => String(item.id) === String(state.projectId)) || null;
      if (projectToEdit) {
        setEditingProject(projectToEdit);
        setModalMode('edit');
      }
    }

    if (!intent) return;

    if (stateIntent) {
      navigate(location.pathname + location.search, { replace: true, state: null });
      return;
    }

    if (queryIntent) {
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.search, location.state, navigate, query.data]);

  return (
    <div className="page-stack">
      <PageHeader
        title="Projecten"
        description="Dubbelklik op een project opent direct het wijzigvenster. Vanuit dezelfde tabel ga je ook door naar Project 360. Statusen volgen nu consequent de project- en compliancecontext."
      />

      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}
      {selectedRows.length ? (
        <InlineMessage tone="neutral">{`${selectedRows.length} project(en) geselecteerd voor bulkacties.`}</InlineMessage>
      ) : null}

      <div className="project-tab-kpi-grid">
        <ProjectKpiActionCard label="Projecten totaal" value={projectStatusSummary.total} meta="Volledige projectlijst" onClick={() => { setFilters(initialFilters); setSearch(''); }} />
        <ProjectKpiActionCard label="Conform" value={projectStatusSummary.conform} meta="Projecten zonder open blokkades" onClick={() => setFilters((current) => ({ ...current, status: 'conform' }))} />
        <ProjectKpiActionCard label="Niet conform" value={projectStatusSummary.nonConform} meta="Directe opvolging nodig" onClick={() => setFilters((current) => ({ ...current, status: 'non_conform' }))} />
        <ProjectKpiActionCard label="In controle / aandacht" value={projectStatusSummary.inProgress + projectStatusSummary.warning} meta="Open acties of controle nodig" onClick={() => setFilters((current) => ({ ...current, status: 'in_progress' }))} />
      </div>

      <BulkActionsBar projectIds={selectedRows} onDone={setMessage} />

      <Card>
        <DataTableToolbar
          left={
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Zoek binnen projecten"
            />
          }
          center={
            <>
              <Button variant="secondary" onClick={() => setFilterDrawerOpen(true)}>
                <Filter size={16} /> Filters {activeFilterCount ? `(${activeFilterCount})` : ''}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  const exportRows = (selectedRows.length
                    ? rows.filter((row) => selectedRows.includes(String(row.id)))
                    : rows
                  ).map((project) => {
                    const normalized = normalizeProjectStatus(project);
                    return {
                      projectnummer: project.projectnummer || project.id,
                      omschrijving: project.name || project.omschrijving || '',
                      opdrachtgever: project.client_name || project.opdrachtgever || '',
                      executieklasse: project.execution_class || project.executieklasse || '',
                      status: normalized.label,
                      start: project.start_date || '',
                      eind: project.end_date || '',
                    };
                  });
                  downloadCsv('projecten.csv', exportRows);
                  setMessage(
                    selectedRows.length
                      ? `${selectedRows.length} geselecteerde project(en) geëxporteerd.`
                      : 'Huidige projectselectie geëxporteerd.',
                  );
                  pushNotification({
                    title: 'Projectexport klaar',
                    description: 'De huidige projectselectie is als CSV geëxporteerd.',
                    tone: 'success',
                  });
                }}
                disabled={!rows.length}
              >
                <Download size={16} /> Export
              </Button>
              {selectedRows.length ? (
                <Button variant="secondary" onClick={() => setSelectedRows([])}>
                  Selectie wissen
                </Button>
              ) : null}
            </>
          }
          right={
            <Button
              onClick={() => {
                setEditingProject(null);
                setModalMode('create');
              }}
            >
              <Plus size={16} /> Nieuw project
            </Button>
          }
        />

        {query.isLoading ? <LoadingState label="Projecten laden..." /> : null}
        {query.isError ? (
          <ErrorState title="Projecten niet geladen" description="De projectlijst kon niet worden opgehaald uit de backend." />
        ) : null}
        {!query.isLoading && !query.isError ? (
          <DataTable
            onRowClick={(row) => navigate(`/projecten/${row.id}/overzicht`)}
            onRowDoubleClick={(row) => { setEditingProject(row); setModalMode('edit'); }}
            columns={columns}
            rows={rows}
            rowKey={(row) => String(row.id)}
            sortKey={String(sortKey)}
            sortDirection={sortDirection}
            onSort={(key) => {
              setPage(1);
              if (sortKey === key) {
                setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
              } else {
                setSortKey(key as keyof Project);
                setSortDirection('asc');
              }
            }}
            selectable
            selectedRowKeys={selectedRows}
            onToggleRow={(key) => {
              setSelectedRows((current) =>
                current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
              );
            }}
            onToggleAll={() =>
              setSelectedRows((current) => (current.length === rows.length ? [] : rows.map((row) => String(row.id))))
            }
            empty={
              <EmptyState
                title="Geen projecten gevonden"
                description="Pas filters aan of voeg een nieuw project toe via de popup."
              />
            }
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
        onClose={() => {
          setFilterDrawerOpen(false);
          setPage(1);
        }}
        onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
        onReset={() => {
          setFilters(initialFilters);
          setPage(1);
        }}
      />

      <Modal open={modalMode === 'create'} onClose={() => setModalMode(null)} title="Nieuw project" size="large">
        <ProjectForm
          isSubmitting={createProject.isPending}
          submitLabel="Project opslaan"
          onSubmit={async (values) => {
            try {
              const createdProject = await createProject.mutateAsync(values);
              const warnings = createdProject.create_summary?.warnings || [];
              setMessage(warnings.length ? `Project aangemaakt met ${warnings.length} aandachtspunt(en).` : 'Project aangemaakt.');
              pushNotification({
                title: warnings.length ? 'Project aangemaakt met aandachtspunten' : 'Project aangemaakt',
                description: warnings.length
                  ? warnings.slice(0, 2).map((item) => item.message).join(' | ')
                  : `Project ${values.projectnummer || createdProject.id} is opgeslagen en geopend.`,
                tone: warnings.length ? 'warning' : 'success',
              });
              setModalMode(null);
              navigate(`/projecten/${createdProject.id}/overzicht`);
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Project aanmaken mislukt.';
              setMessage(message);
              pushNotification({ title: 'Project aanmaken mislukt', description: message, tone: 'error' });
            }
          }}
        />
      </Modal>

      <Modal open={modalMode === 'edit' && !!editingProject} onClose={() => setModalMode(null)} title="Wijzig project" size="large">
        {editingProject ? (
          <ProjectForm
            initial={editingProject}
            isSubmitting={updateProject.isPending}
            submitLabel="Wijzigen"
            onSubmit={async (values) => {
              try {
                await updateProject.mutateAsync({ id: editingProject.id, payload: values });
                setMessage('Project gewijzigd.');
                pushNotification({
                  title: 'Project gewijzigd',
                  description: `Wijzigingen op ${editingProject.projectnummer || editingProject.id} zijn opgeslagen.`,
                  tone: 'success',
                });
                setModalMode(null);
              } catch (error) {
                const message = error instanceof Error ? error.message : 'Project wijzigen mislukt.';
                setMessage(message);
                pushNotification({ title: 'Project wijzigen mislukt', description: message, tone: 'error' });
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
            const message = error instanceof Error ? error.message : 'Project verwijderen mislukt.';
            setMessage(message);
            pushNotification({ title: 'Project verwijderen mislukt', description: message, tone: 'error' });
          }
        }}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}

export default ProjectenPage;

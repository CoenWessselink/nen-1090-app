import { useMemo, useState } from 'react';
import { CalendarRange, Download, RefreshCcw } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { DataTable, type ColumnDef } from '@/components/datatable/DataTable';
import { DataTableToolbar } from '@/components/datatable/DataTableToolbar';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { usePlanning } from '@/hooks/usePlanning';
import type { PlanningItem } from '@/types/domain';
import { downloadCsv } from '@/utils/export';
import { formatDate, toneFromStatus } from '@/utils/format';

export function PlanningPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('start_date');
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');
  const query = usePlanning({ page, limit: 10, search: search || undefined, status: status !== 'all' ? status : undefined, sort, direction });

  const rows = useMemo(() => query.data?.items || [], [query.data]);

  const columns: ColumnDef<PlanningItem>[] = [
    { key: 'title', header: 'Taak', sortable: true, cell: (row) => <strong>{row.title || '—'}</strong> },
    { key: 'project_name', header: 'Project', sortable: true, cell: (row) => row.project_name || '—' },
    { key: 'assignee', header: 'Toegewezen', sortable: true, cell: (row) => row.assignee || '—' },
    { key: 'start_date', header: 'Start', sortable: true, cell: (row) => formatDate(row.start_date) },
    { key: 'end_date', header: 'Eind', sortable: true, cell: (row) => formatDate(row.end_date) },
    { key: 'status', header: 'Status', sortable: true, cell: (row) => <Badge tone={toneFromStatus(row.status)}>{row.status || '—'}</Badge> },
  ];

  return (
    <div className="page-stack">
      <PageHeader title="Planning" description="Planningsoverzicht op het enterprise list-contract met server-side page, limit, search, sort en status." />
      <Card>
        <DataTableToolbar
          left={<Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Zoek op taak, project of medewerker" />}
          center={<Badge tone="neutral"><CalendarRange size={14} /> Planning · {query.data?.total || rows.length} totaal</Badge>}
          right={(
            <div className="toolbar-cluster">
              <Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
                <option value="all">Alle statussen</option>
                <option value="open">Open</option>
                <option value="in-uitvoering">In uitvoering</option>
                <option value="gereed">Gereed</option>
              </Select>
              <Button variant="secondary" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCcw size={16} /> Vernieuwen</Button>
              <Button variant="secondary" onClick={() => downloadCsv('planning.csv', rows.map((item) => ({ taak: item.title, project: item.project_name, toegewezen: item.assignee, start: item.start_date, eind: item.end_date, status: item.status })))} disabled={!rows.length}><Download size={16} /> Exporteer CSV</Button>
            </div>
          )}
        />
        {query.isLoading ? <LoadingState label="Planning laden..." /> : null}
        {query.isError ? <ErrorState title="Planning niet geladen" description="De frontend gebruikt geen fallback-rijen meer. Controleer of het bestaande planning-endpoint beschikbaar is en het verwachte contract teruggeeft." /> : null}
        {!query.isLoading && !query.isError ? (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => String(row.id)}
            sortKey={sort}
            sortDirection={direction}
            onSort={(key) => {
              if (sort === key) setDirection((current) => current === 'asc' ? 'desc' : 'asc');
              else { setSort(key); setDirection('asc'); }
              setPage(1);
            }}
            page={page}
            total={query.data?.total || rows.length}
            pageSize={10}
            onPageChange={setPage}
            empty={<EmptyState title="Geen planning gevonden" description="Er zijn geen planningstaken teruggekomen vanuit de backend voor deze selectie." />}
          />
        ) : null}
      </Card>
    </div>
  );
}

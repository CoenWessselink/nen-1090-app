import { useMemo, useState } from 'react';
import { Download, FileChartColumnIncreasing, RefreshCcw } from 'lucide-react';
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
import { useReports } from '@/hooks/useReports';
import type { ReportItem } from '@/types/domain';
import { downloadCsv } from '@/utils/export';
import { formatDateTime, toneFromStatus } from '@/utils/format';

export function RapportagePage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('created_at');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');
  const query = useReports({ page, limit: 10, search: search || undefined, status: status !== 'all' ? status : undefined, sort, direction });

  const rows = useMemo(() => query.data?.items || [], [query.data]);

  const columns: ColumnDef<ReportItem>[] = [
    { key: 'title', header: 'Rapport', sortable: true, cell: (row) => <strong>{row.title || '—'}</strong> },
    { key: 'type', header: 'Type', sortable: true, cell: (row) => row.type || '—' },
    { key: 'status', header: 'Status', sortable: true, cell: (row) => <Badge tone={toneFromStatus(row.status)}>{row.status || '—'}</Badge> },
    { key: 'owner', header: 'Eigenaar', sortable: true, cell: (row) => row.owner || '—' },
    { key: 'created_at', header: 'Aangemaakt', sortable: true, cell: (row) => formatDateTime(row.created_at) },
  ];

  return (
    <div className="page-stack">
      <PageHeader title="Rapportage" description="Rapportagecentrum op het enterprise list-contract met server-side page, limit, search, sort en status." />
      <Card>
        <DataTableToolbar
          left={<Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Zoek rapportages" />}
          center={<Badge tone="neutral"><FileChartColumnIncreasing size={14} /> Rapportages · {query.data?.total || rows.length} totaal</Badge>}
          right={(
            <div className="toolbar-cluster">
              <Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
                <option value="all">Alle statussen</option>
                <option value="concept">Concept</option>
                <option value="gereed">Gereed</option>
                <option value="mislukt">Mislukt</option>
              </Select>
              <Button variant="secondary" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCcw size={16} /> Vernieuwen</Button>
              <Button variant="secondary" onClick={() => downloadCsv('rapportages.csv', rows.map((item) => ({ rapport: item.title, type: item.type, status: item.status, eigenaar: item.owner, aangemaakt: item.created_at })))} disabled={!rows.length}><Download size={16} /> Exporteer CSV</Button>
            </div>
          )}
        />
        {query.isLoading ? <LoadingState label="Rapportages laden..." /> : null}
        {query.isError ? <ErrorState title="Rapportages niet geladen" description="De frontend gebruikt geen fallback-rijen meer. Controleer of het bestaande reports-endpoint beschikbaar is en het verwachte contract teruggeeft." /> : null}
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
            empty={<EmptyState title="Geen rapportages gevonden" description="Er zijn geen rapportages teruggekomen vanuit de backend voor deze selectie." />}
          />
        ) : null}
      </Card>
    </div>
  );
}

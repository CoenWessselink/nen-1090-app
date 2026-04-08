import { useMemo, useState } from 'react';
import { Download, FileChartColumnIncreasing, FolderOpenDot, RefreshCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

function metricCardStyle(clickable = false): React.CSSProperties {
  return {
    minHeight: 120,
    display: 'grid',
    gap: 8,
    alignContent: 'center',
    cursor: clickable ? 'pointer' : undefined,
  };
}

export function RapportagePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('created_at');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');
  const query = useReports({ page, limit: 10, search: search || undefined, status: status !== 'all' ? status : undefined, sort, direction });

  const rows = useMemo(() => query.data?.items || [], [query.data]);
  const metrics = useMemo(() => {
    const total = query.data?.total || rows.length;
    const gereed = rows.filter((item) => String(item.status || '').toLowerCase() === 'gereed').length;
    const concept = rows.filter((item) => String(item.status || '').toLowerCase() === 'concept').length;
    const mislukt = rows.filter((item) => ['mislukt', 'failed', 'error'].includes(String(item.status || '').toLowerCase())).length;
    return { total, gereed, concept, mislukt };
  }, [query.data, rows]);

  const columns: ColumnDef<ReportItem>[] = [
    {
      key: 'title',
      header: 'Rapport',
      sortable: true,
      cell: (row) => (
        <button
          type="button"
          onClick={() => row.project_id ? navigate(`/projecten/${row.project_id}/overzicht`) : undefined}
          style={{ background: 'none', border: 0, padding: 0, font: 'inherit', textAlign: 'left', cursor: row.project_id ? 'pointer' : 'default' }}
        >
          <strong>{row.title || '—'}</strong>
          {row.project_id ? <div className="list-subtle">Open project</div> : null}
        </button>
      ),
    },
    { key: 'type', header: 'Type', sortable: true, cell: (row) => row.type || '—' },
    { key: 'status', header: 'Status', sortable: true, cell: (row) => <Badge tone={toneFromStatus(row.status)}>{row.status || '—'}</Badge> },
    { key: 'owner', header: 'Eigenaar', sortable: true, cell: (row) => row.owner || '—' },
    { key: 'created_at', header: 'Aangemaakt', sortable: true, cell: (row) => formatDateTime(row.created_at) },
  ];

  return (
    <div className="page-stack">
      <PageHeader title="Rapportage" description="Rapportagecentrum op het enterprise list-contract met server-side page, limit, search, sort en status. Als het reports-endpoint leeg terugkomt, worden projectoverzichten afgeleid uit live projectdata." />

      <div className="project-tab-kpi-grid">
        <button type="button" className="card" onClick={() => { setStatus('all'); setPage(1); }} style={{ textAlign: 'left', background: 'transparent', border: 0, padding: 16 }}><div style={metricCardStyle(true)}><div className="stat-label">Rapportages totaal</div><div className="stat-value">{metrics.total}</div><div className="stat-meta">Server-side totaal of live afgeleid uit projecten.</div></div></button>
        <button type="button" className="card" onClick={() => { setStatus('gereed'); setPage(1); }} style={{ textAlign: 'left', background: 'transparent', border: 0, padding: 16 }}><div style={metricCardStyle(true)}><div className="stat-label">Gereed</div><div className="stat-value">{metrics.gereed}</div><div className="stat-meta">Rapportages met status gereed in deze selectie.</div></div></button>
        <button type="button" className="card" onClick={() => { setStatus('concept'); setPage(1); }} style={{ textAlign: 'left', background: 'transparent', border: 0, padding: 16 }}><div style={metricCardStyle(true)}><div className="stat-label">Concept</div><div className="stat-value">{metrics.concept}</div><div className="stat-meta">Open concepten binnen de huidige filterset.</div></div></button>
        <button type="button" className="card" onClick={() => { setStatus('mislukt'); setPage(1); }} style={{ textAlign: 'left', background: 'transparent', border: 0, padding: 16 }}><div style={metricCardStyle(true)}><div className="stat-label">Mislukt</div><div className="stat-value">{metrics.mislukt}</div><div className="stat-meta">Rapportages die aandacht of retry nodig hebben.</div></div></button>
      </div>

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
        {query.isError ? <ErrorState title="Rapportages niet geladen" description="Controleer of het reports-endpoint of het projects-endpoint beschikbaar is. Zonder live backenddata blijft de rapportage leeg." /> : null}
        {!query.isLoading && !query.isError && rows.length === 0 ? (
          <EmptyState title="Geen rapportages gevonden" description="Er kwamen geen rapportages terug uit de backend en er konden ook geen projectoverzichten worden afgeleid." />
        ) : null}
        {!query.isLoading && !query.isError && rows.length > 0 ? (
          <>
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
            <div className="toolbar-cluster" style={{ justifyContent: 'space-between', marginTop: 16 }}>
              <Badge tone="neutral">Bron: {String((query.data as Record<string, unknown> | undefined)?.source || 'reports-endpoint')}</Badge>
              <Button variant="secondary" onClick={() => rows[0]?.project_id ? navigate(`/projecten/${rows[0].project_id}/overzicht`) : undefined} disabled={!rows[0]?.project_id}><FolderOpenDot size={16} /> Open eerste project</Button>
            </div>
          </>
        ) : null}
      </Card>
    </div>
  );
}

export default RapportagePage;

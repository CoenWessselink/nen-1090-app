import { useMemo, useState } from 'react';
import { FileText, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useReports } from '@/hooks/useReports';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { formatValue } from '@/features/mobile/mobile-utils';

type ReportRow = {
  id: string | number;
  title?: string;
  type?: string;
  created_at?: string;
  project_id?: string | number;
  project_name?: string;
  projectnummer?: string;
  client_name?: string;
};

export function MobileRapportagePage() {
  const navigate = useNavigate();
  const reports = useReports({ page: 1, limit: 50 });
  const rows = ((reports.data?.items || []) as ReportRow[]);
  const [search, setSearch] = useState('');

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [rows, search]);

  const firstProjectId = visibleRows.find((item) => item.project_id)?.project_id;

  return (
    <MobilePageScaffold title="Rapportage" subtitle="Mobiel rapportoverzicht">
      <div className="mobile-toolbar-card">
        <div className="mobile-search-shell">
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoek op projectnaam, projectnummer of type" />
        </div>
      </div>

      <div className="mobile-list-card mobile-report-highlight" role="button" tabIndex={0} onClick={() => firstProjectId ? navigate(`/projecten/${firstProjectId}/pdf-viewer`) : undefined}>
        <div className="mobile-list-card-head">
          <strong>PDF</strong>
          <span className="mobile-pill mobile-pill-success">Direct openen</span>
        </div>
        <div className="mobile-report-cta">
          <div className="mobile-report-icon"><FileText size={26} /></div>
          <div>
            <strong>Open PDF</strong>
            <span className="mobile-list-card-meta">Klik op dit blok om het rapport direct te openen.</span>
          </div>
        </div>
      </div>

      {reports.isLoading ? <div className="mobile-state-card">Rapportages laden…</div> : null}
      {reports.isError ? <div className="mobile-state-card mobile-state-card-error">Rapportage kon niet worden geladen.</div> : null}

      {!reports.isLoading && !reports.isError ? (
        <div className="mobile-list-stack">
          {visibleRows.map((row) => (
            <div key={String(row.id)} className="mobile-list-card">
              <div className="mobile-list-card-head">
                <strong>{formatValue(row.title, `Rapport ${row.id}`)}</strong>
                <span className="mobile-list-card-meta">{formatValue(row.created_at, '—')}</span>
              </div>
              <span className="mobile-list-card-subtitle">{formatValue(row.project_name || row.projectnummer || row.client_name, 'Project onbekend')}</span>
              <div className="mobile-inline-actions">
                {row.project_id ? (
                  <button type="button" className="mobile-secondary-button" onClick={() => navigate(`/projecten/${row.project_id}/overzicht`)}>
                    Open project
                  </button>
                ) : null}
                {row.project_id ? (
                  <button type="button" className="mobile-primary-button" onClick={() => navigate(`/projecten/${row.project_id}/pdf-viewer`)}>
                    Bekijk PDF
                  </button>
                ) : null}
              </div>
            </div>
          ))}
          {!visibleRows.length ? <div className="mobile-state-card">Geen rapportregels gevonden.</div> : null}
        </div>
      ) : null}
    </MobilePageScaffold>
  );
}

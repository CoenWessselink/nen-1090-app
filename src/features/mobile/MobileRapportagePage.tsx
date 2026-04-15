import { useMemo, useState } from 'react';
import { Download, FileText, Search } from 'lucide-react';
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
  pdf_url?: string;
  download_url?: string;
};

function reportPdfUrl(row: ReportRow) {
  return String(row.pdf_url || row.download_url || '').trim();
}

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

  const featured = visibleRows.find((item) => reportPdfUrl(item) || item.project_id) || null;

  function openReport(row: ReportRow) {
    const url = reportPdfUrl(row);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (row.project_id) navigate(`/projecten/${row.project_id}/pdf-viewer`);
  }

  return (
    <MobilePageScaffold title="Rapportage" subtitle="Mobiel rapportoverzicht">
      <div className="mobile-toolbar-card">
        <div className="mobile-search-shell">
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoek op projectnaam, projectnummer of type" />
        </div>
      </div>

      <div className="mobile-list-card mobile-report-highlight" role="button" tabIndex={0} onClick={() => { if (featured) openReport(featured); }}>
        <div className="mobile-list-card-head">
          <strong>PDF</strong>
          <span className="mobile-pill mobile-pill-success">Direct openen</span>
        </div>
        <div className="mobile-report-cta">
          <div className="mobile-report-icon"><FileText size={26} /></div>
          <div>
            <strong>{featured?.title || 'Open PDF'}</strong>
            <span className="mobile-list-card-meta">Klik op dit blok om het meest recente rapport direct te openen.</span>
          </div>
        </div>
      </div>

      {reports.isLoading ? <div className="mobile-state-card">Rapportages laden…</div> : null}
      {reports.isError ? <div className="mobile-state-card mobile-state-card-error">Rapportage kon niet worden geladen.</div> : null}

      {!reports.isLoading && !reports.isError ? (
        <div className="mobile-list-stack">
          {visibleRows.map((row) => {
            const pdfUrl = reportPdfUrl(row);
            return (
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
                  <button type="button" className="mobile-primary-button" onClick={() => openReport(row)}>
                    Bekijk PDF
                  </button>
                  {pdfUrl ? (
                    <a className="mobile-secondary-button" href={pdfUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                      <Download size={14} /> Download
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })}
          {!visibleRows.length ? <div className="mobile-state-card">Geen rapportregels gevonden.</div> : null}
        </div>
      ) : null}
    </MobilePageScaffold>
  );
}

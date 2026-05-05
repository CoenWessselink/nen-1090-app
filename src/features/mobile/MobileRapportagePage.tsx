import { useMemo, useState } from 'react';
import { Download, FileText, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useReports } from '@/hooks/useReports';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { openDownloadUrl } from '@/utils/download';
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

function isProjectSummary(row: ReportRow) {
  return String(row.type || '').toLowerCase().includes('project') || String(row.type || '').toLowerCase().includes('weld_compliance') || String(row.id || '').startsWith('project-');
}

function reportTitle(row?: ReportRow | null) {
  if (!row) return 'Latest PDF';
  const raw = String(row.title || '').trim();
  if (!raw) return `Weld Compliance Report ${row.id}`;
  return raw.replace(/Projectoverzicht/gi, 'Weld Compliance Report').replace(/Export pdf/gi, 'Weld Compliance Report');
}

function reportFilename(row: ReportRow) {
  const safe = (value: string, fallback: string) => String(value || fallback).trim().replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || fallback;
  const projectName = safe(String(row.project_name || row.title || 'project'), 'project');
  const projectNumber = safe(String(row.projectnummer || row.project_id || row.id || 'no-number'), 'no-number');
  return `Weld-Compliance-Report-${projectNumber}-${projectName}-${new Date().toISOString().slice(0, 10)}.pdf`;
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
    if (row.project_id && isProjectSummary(row)) {
      navigate(`/projecten/${row.project_id}/pdf-viewer`);
      return;
    }

    const url = reportPdfUrl(row);
    if (url) {
      void openDownloadUrl(url, reportFilename(row));
      return;
    }
    if (row.project_id) navigate(`/projecten/${row.project_id}/pdf-viewer`);
  }

  return (
    <MobilePageScaffold title="Reports" subtitle="Mobile report overview">
      <div className="mobile-toolbar-card">
        <div className="mobile-search-shell">
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by project name, project number or type" />
        </div>
      </div>

      <div className="mobile-list-card mobile-report-highlight" role="button" tabIndex={0} onClick={() => { if (featured) openReport(featured); }}>
        <div className="mobile-list-card-head">
          <strong>PDF</strong>
          <span className="mobile-pill mobile-pill-success">Open now</span>
        </div>
        <div className="mobile-report-cta">
          <div className="mobile-report-icon"><FileText size={26} /></div>
          <div>
            <strong>{reportTitle(featured)}</strong>
            <span className="mobile-list-card-meta">Tap this card to open the most recent Weld Compliance Report.</span>
          </div>
        </div>
      </div>

      {reports.isLoading ? <div className="mobile-state-card">Loading reports…</div> : null}
      {reports.isError ? <div className="mobile-state-card mobile-state-card-error">Reports could not be loaded.</div> : null}

      {!reports.isLoading && !reports.isError ? (
        <div className="mobile-list-stack">
          {visibleRows.map((row) => {
            const pdfUrl = reportPdfUrl(row);
            return (
              <div key={String(row.id)} className="mobile-list-card">
                <div className="mobile-list-card-head">
                  <strong>{reportTitle(row)}</strong>
                  <span className="mobile-list-card-meta">{formatValue(row.created_at, '—')}</span>
                </div>
                <span className="mobile-list-card-subtitle">{formatValue(row.project_name || row.projectnummer || row.client_name, 'Project unknown')}</span>
                <div className="mobile-inline-actions mobile-report-actions">
                  {row.project_id ? (
                    <button type="button" className="mobile-secondary-button" onClick={() => navigate(`/projecten/${row.project_id}/overzicht`)}>
                      Project
                    </button>
                  ) : null}
                  <button type="button" className="mobile-primary-button" onClick={() => openReport(row)}>
                    Create PDF
                  </button>
                  {pdfUrl ? (
                    <button type="button" className="mobile-secondary-button" onClick={() => void openDownloadUrl(pdfUrl, reportFilename(row))}>
                      <Download size={14} /> Download
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
          {!visibleRows.length ? <div className="mobile-state-card">No report rows found.</div> : null}
        </div>
      ) : null}
    </MobilePageScaffold>
  );
}

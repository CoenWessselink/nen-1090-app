import { useMemo, useState } from 'react';
import { Download, FileText, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useReports } from '@/hooks/useReports';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { openDownloadUrl } from '@/utils/download';
import { downloadCeReportRouteAsPdf } from '@/utils/ceReportPdfDownload';
import { formatValue, normalizeApiError } from '@/features/mobile/mobile-utils';

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

function rowProjectId(row: ReportRow) {
  const value = row.project_id ?? (String(row.id || '').startsWith('project-summary-') ? String(row.id).replace('project-summary-', '') : '');
  return String(value || '').trim();
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

function ceReportUrl(row: ReportRow) {
  const projectId = rowProjectId(row);
  if (!projectId) return '';
  return `/projecten/${projectId}/ce-report`;
}

export function MobileRapportagePage() {
  const navigate = useNavigate();
  const reports = useReports({ page: 1, limit: 50 });
  const rows = useMemo(() => ((reports.data?.items || []) as ReportRow[]), [reports.data]);
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [rows, search]);

  const featured = visibleRows.find((item) => rowProjectId(item) || reportPdfUrl(item)) || null;

  function createPdf(row: ReportRow) {
    setActionError(null);
    const url = ceReportUrl(row);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    const fallbackUrl = reportPdfUrl(row);
    if (fallbackUrl) {
      void openDownloadUrl(fallbackUrl, reportFilename(row)).catch((err) => setActionError(normalizeApiError(err, 'PDF openen mislukt.')));
    }
  }

  function downloadReport(row: ReportRow) {
    setActionError(null);
    const url = ceReportUrl(row);
    if (url) {
      const key = String(row.id || rowProjectId(row));
      setDownloadingId(key);
      void downloadCeReportRouteAsPdf({ url, filename: reportFilename(row) })
        .catch((err) => setActionError(normalizeApiError(err, 'PDF opslaan mislukt.')))
        .finally(() => setDownloadingId(null));
      return;
    }
    const fallbackUrl = reportPdfUrl(row);
    if (fallbackUrl) {
      void openDownloadUrl(fallbackUrl, reportFilename(row)).catch((err) => setActionError(normalizeApiError(err, 'Download mislukt.')));
    }
  }

  function openProject(row: ReportRow) {
    const projectId = rowProjectId(row);
    if (projectId) navigate(`/projecten/${projectId}/overzicht`);
  }

  function openCeDossier(row: ReportRow) {
    const projectId = rowProjectId(row);
    if (projectId) navigate(`/projecten/${projectId}/ce-v2`);
  }

  return (
    <MobilePageScaffold title="Reports" subtitle="Mobile report overview">
      <div className="mobile-toolbar-card">
        <div className="mobile-search-shell">
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by project name, project number or type" />
        </div>
      </div>

      <div className="mobile-list-card mobile-report-highlight" role="button" tabIndex={0} onClick={() => { if (featured) createPdf(featured); }}>
        <div className="mobile-list-card-head">
          <strong>Nieuw CE-rapport</strong>
          <span className="mobile-pill mobile-pill-success">Open</span>
        </div>
        <div className="mobile-report-cta">
          <div className="mobile-report-icon"><FileText size={26} /></div>
          <div>
            <strong>{reportTitle(featured)}</strong>
            <span className="mobile-list-card-meta">Open de nieuwe premium CE-report layout.</span>
          </div>
        </div>
      </div>

      {reports.isLoading ? <div className="mobile-state-card">Loading reports…</div> : null}
      {reports.isError ? <div className="mobile-state-card mobile-state-card-error">Reports could not be loaded.</div> : null}
      {actionError ? <div className="mobile-state-card mobile-state-card-error">{actionError}</div> : null}

      {!reports.isLoading && !reports.isError ? (
        <div className="mobile-list-stack">
          {visibleRows.map((row) => {
            const projectId = rowProjectId(row);
            const rowDownloading = downloadingId === String(row.id || projectId);
            return (
              <div key={String(row.id)} className="mobile-list-card">
                <div className="mobile-list-card-head">
                  <strong>{reportTitle(row)}</strong>
                  <span className="mobile-list-card-meta">{formatValue(row.created_at, '—')}</span>
                </div>
                <span className="mobile-list-card-subtitle">{formatValue(row.project_name || row.projectnummer || row.client_name, 'Project unknown')}</span>
                <div
                  className="mobile-inline-actions mobile-report-actions"
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, alignItems: 'stretch' }}
                >
                  <button type="button" className="mobile-secondary-button" onClick={() => openProject(row)} disabled={!projectId}>
                    Project
                  </button>
                  <button type="button" className="mobile-primary-button" onClick={() => createPdf(row)} disabled={!projectId && !reportPdfUrl(row)}>
                    Open nieuw rapport
                  </button>
                  <button type="button" className="mobile-secondary-button" onClick={() => downloadReport(row)} disabled={rowDownloading || (!projectId && !reportPdfUrl(row))}>
                    <Download size={14} /> {rowDownloading ? 'Voorbereiden…' : 'PDF opslaan'}
                  </button>
                  <button type="button" className="mobile-secondary-button" onClick={() => openCeDossier(row)} disabled={!projectId}>
                    CE Dossier
                  </button>
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

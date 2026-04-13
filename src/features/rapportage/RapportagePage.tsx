import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useReports } from '@/hooks/useReports';

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
};

function toneFromType(type?: string) {
  const value = String(type || '').toLowerCase();
  if (value.includes('project')) return 'success' as const;
  if (value.includes('ce')) return 'warning' as const;
  return 'neutral' as const;
}

function buildViewerUrl(row: ReportRow | null) {
  if (!row) return '';
  if (row.pdf_url) return String(row.pdf_url);
  if (row.project_id) return `/projecten/${row.project_id}/ce-dossier?report_preview=1`;
  return '';
}

export function RapportagePage() {
  const navigate = useNavigate();
  const reports = useReports({ page: 1, limit: 50 });
  const rows = (reports.data?.items || []) as ReportRow[];
  const [search, setSearch] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string | number | null>(null);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      JSON.stringify({
        title: row.title,
        project_name: row.project_name,
        projectnummer: row.projectnummer,
        client_name: row.client_name,
      })
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search]);

  useEffect(() => {
    if (!visibleRows.length) {
      setSelectedReportId(null);
      return;
    }
    const selectedStillVisible = visibleRows.some((row) => String(row.id) === String(selectedReportId));
    if (!selectedStillVisible) setSelectedReportId(visibleRows[0].id);
  }, [selectedReportId, visibleRows]);

  const selectedRow = visibleRows.find((row) => String(row.id) === String(selectedReportId)) || null;
  const viewerUrl = buildViewerUrl(selectedRow);
  const selectedProjectPath = selectedRow?.project_id ? `/projecten/${selectedRow.project_id}/overzicht` : null;

  const openPdfInNewTab = (row: ReportRow) => {
    const target = buildViewerUrl(row);
    if (!target) return;
    window.open(target, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="page-stack">
      <PageHeader title="Rapportage" description="Rapportages zijn direct te bekijken in het ingebouwde PDF-paneel of openen het gekoppelde projectdossier." />

      <Card>
        <div className="toolbar-cluster" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <Input
            data-testid="reports-search-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Zoek op projectnaam, projectnummer of opdrachtgever"
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={() => setSearch('')}>Wis filter</Button>
            {selectedRow ? <Button onClick={() => openPdfInNewTab(selectedRow)}>Open in nieuw tabblad</Button> : null}
          </div>
        </div>
      </Card>

      {reports.isLoading ? <LoadingState label="Rapportage laden..." /> : null}
      {reports.isError ? <ErrorState title="Rapportage niet geladen" description="Controleer het /reports contract of de projects fallback." /> : null}
      {!reports.isLoading && !reports.isError && visibleRows.length === 0 ? (
        <EmptyState title="Geen rapportregels beschikbaar" description="Er zijn nog geen rapportages of afgeleide projectoverzichten gevonden." />
      ) : null}

      {!reports.isLoading && !reports.isError && visibleRows.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 480px) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
          <Card>
            <table className="table">
              <thead>
                <tr>
                  <th>Titel</th>
                  <th>Project</th>
                  <th>Type</th>
                  <th>Aangemaakt</th>
                  <th>Actie</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => {
                  const projectPath = row.project_id ? `/projecten/${row.project_id}/overzicht` : null;
                  const isActive = String(selectedReportId) === String(row.id);
                  return (
                    <tr
                      key={String(row.id)}
                      data-testid={`report-row-${row.id}`}
                      style={{ cursor: 'pointer', background: isActive ? '#eff6ff' : undefined }}
                      onClick={() => setSelectedReportId(row.id)}
                    >
                      <td><strong>{row.title || `Rapport ${row.id}`}</strong></td>
                      <td>{row.project_name || row.projectnummer || row.client_name || '—'}</td>
                      <td><Badge tone={toneFromType(row.type)}>{row.type || 'project_summary'}</Badge></td>
                      <td>{row.created_at || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {projectPath ? (
                            <button className="icon-button" type="button" onClick={(event) => { event.stopPropagation(); navigate(projectPath); }}>
                              Open project
                            </button>
                          ) : null}
                          <button className="icon-button" type="button" onClick={(event) => { event.stopPropagation(); openPdfInNewTab(row); }}>
                            Bekijk PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          <Card data-testid="reports-pdf-panel">
            <div className="section-title-row">
              <h3 style={{ margin: 0 }}>PDF voorbeeld</h3>
              {selectedProjectPath ? <Button variant="secondary" onClick={() => navigate(selectedProjectPath)}>Open gekoppeld project</Button> : null}
            </div>
            {selectedRow ? (
              <>
                <div style={{ color: '#64748b', marginTop: 8 }}>
                  {selectedRow.title || `Rapport ${selectedRow.id}`} · {selectedRow.project_name || selectedRow.projectnummer || selectedRow.client_name || 'Geen projectcontext'}
                </div>
                {viewerUrl ? (
                  <iframe
                    key={viewerUrl}
                    src={viewerUrl}
                    title={String(selectedRow.title || `Rapport ${selectedRow.id}`)}
                    style={{ width: '100%', minHeight: 860, border: '1px solid #e2e8f0', borderRadius: 12, marginTop: 16, background: '#fff' }}
                  />
                ) : (
                  <EmptyState title="Geen directe PDF beschikbaar" description="Voor deze rapportregel is geen pdf_url aanwezig. Open het gekoppelde projectdossier voor verdere rapportdetails." />
                )}
              </>
            ) : (
              <EmptyState title="Geen rapport geselecteerd" description="Kies links een rapport om de PDF direct te bekijken." />
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}

export default RapportagePage;

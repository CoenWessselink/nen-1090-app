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

function projectSummaryLabel(row: ReportRow) {
  const parts = [row.project_name, row.projectnummer, row.client_name].filter(Boolean);
  return parts.length ? parts.join(' · ') : '—';
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
    const stillVisible = visibleRows.some((row) => String(row.id) === String(selectedReportId));
    if (!stillVisible) setSelectedReportId(visibleRows[0].id);
  }, [visibleRows, selectedReportId]);

  const selectedRow = useMemo(
    () => visibleRows.find((row) => String(row.id) === String(selectedReportId)) || visibleRows[0] || null,
    [selectedReportId, visibleRows],
  );

  const inlinePdfUrl = selectedRow?.pdf_url || (selectedRow?.project_id ? `/api/v1/projects/${selectedRow.project_id}/exports/pdf` : '');

  return (
    <div className="page-stack">
      <PageHeader title="Rapportage" description="Zoek op projectnaam, projectnummer of opdrachtgever en bekijk het rapport direct in het PDF-paneel." />

      <Card>
        <div className="toolbar-cluster" style={{ justifyContent: 'space-between', gap: 12 }}>
          <Input
            data-testid="reports-search-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Zoek op projectnaam, projectnummer of opdrachtgever"
          />
          <Button variant="secondary" onClick={() => setSearch('')}>Wis filter</Button>
        </div>
      </Card>

      {reports.isLoading ? <LoadingState label="Rapportage laden..." /> : null}
      {reports.isError ? <ErrorState title="Rapportage niet geladen" description="Controleer het /reports contract of de projects fallback." /> : null}
      {!reports.isLoading && !reports.isError && visibleRows.length === 0 ? (
        <EmptyState title="Geen rapportregels beschikbaar" description="Er zijn nog geen rapportages of afgeleide projectoverzichten gevonden." />
      ) : null}

      {!reports.isLoading && !reports.isError && visibleRows.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 0.95fr) minmax(420px, 1.35fr)', gap: 16 }}>
          <Card>
            <table className="table" data-testid="reports-table">
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
                  const active = String(selectedRow?.id || '') === String(row.id);
                  return (
                    <tr
                      key={String(row.id)}
                      data-testid={`report-row-${row.id}`}
                      style={{ background: active ? '#eff6ff' : undefined }}
                    >
                      <td><strong>{row.title || `Rapport ${row.id}`}</strong></td>
                      <td>{projectSummaryLabel(row)}</td>
                      <td><Badge tone={toneFromType(row.type)}>{row.type || 'project_summary'}</Badge></td>
                      <td>{row.created_at || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button className="icon-button" type="button" onClick={() => setSelectedReportId(row.id)}>
                            Bekijk PDF
                          </button>
                          {projectPath ? (
                            <button className="icon-button" type="button" onClick={() => navigate(projectPath)}>
                              Open project
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          <Card data-testid="reports-pdf-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              <div>
                <strong>{selectedRow?.title || 'PDF preview'}</strong>
                <div className="list-subtle">Directe rapportweergave in de pagina</div>
              </div>
              {selectedRow?.project_id ? (
                <Button variant="secondary" onClick={() => navigate(`/projecten/${selectedRow.project_id}/ce-dossier`)}>
                  Open CE Dossier
                </Button>
              ) : null}
            </div>
            {inlinePdfUrl ? (
              <iframe
                title={selectedRow?.title || 'Rapport PDF'}
                src={inlinePdfUrl}
                data-testid="reports-pdf-iframe"
                style={{ width: '100%', minHeight: 760, border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff' }}
              />
            ) : (
              <EmptyState title="Geen PDF beschikbaar" description="Er is nog geen PDF-route gevonden voor dit rapport." />
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}

export default RapportagePage;

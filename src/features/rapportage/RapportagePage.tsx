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

function derivePdfUrl(row: ReportRow | null) {
  if (!row) return '';
  if (row.pdf_url && /(^https?:\/\/)|(^\/api\/)|(^\/projects\/.*\/pdf)/i.test(row.pdf_url)) return String(row.pdf_url);
  if (row.project_id) return `/api/v1/projects/${row.project_id}/exports/pdf`;
  return row.pdf_url ? String(row.pdf_url) : '';
}

function isPdfUrl(url?: string) {
  return Boolean(url && (url.includes('/exports/pdf') || /\.pdf($|\?)/i.test(url)));
}

function formatCreatedAt(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('nl-NL');
}

export function RapportagePage() {
  const navigate = useNavigate();
  const reports = useReports({ page: 1, limit: 50 });
  const rows = (reports.data?.items || []) as ReportRow[];
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | number | null>(null);

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
      setSelectedId(null);
      return;
    }
    if (selectedId == null || !visibleRows.some((row) => String(row.id) === String(selectedId))) {
      const preferred = visibleRows.find((row) => row.pdf_url) || visibleRows[0];
      setSelectedId(preferred.id);
    }
  }, [visibleRows, selectedId]);

  const selectedRow = visibleRows.find((row) => String(row.id) === String(selectedId)) || null;
  const selectedPdfUrl = derivePdfUrl(selectedRow);
  const canPreviewPdf = isPdfUrl(selectedPdfUrl);

  return (
    <div className="page-stack">
      <PageHeader title="Rapportage" description="Rapportages zijn direct te filteren op projectnaam, projectnummer en opdrachtgever en worden inline als PDF getoond zodra een PDF-link beschikbaar is." />

      <Card>
        <div className="toolbar-cluster" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <Input
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
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 420px) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
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
                  const isSelected = String(row.id) === String(selectedId);
                  return (
                    <tr key={String(row.id)} style={{ background: isSelected ? '#eff6ff' : undefined }}>
                      <td><strong>{row.title || `Rapport ${row.id}`}</strong></td>
                      <td>{row.project_name || row.projectnummer || row.client_name || '—'}</td>
                      <td><Badge tone={toneFromType(row.type)}>{row.type || 'project_summary'}</Badge></td>
                      <td>{formatCreatedAt(row.created_at)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button className="icon-button" type="button" onClick={() => setSelectedId(row.id)}>
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

          <Card data-testid="rapportage-pdf-panel">
            <div className="section-title-row">
              <h3>PDF voorbeeld</h3>
              {selectedRow?.pdf_url ? (
                <a href={selectedRow.pdf_url} target="_blank" rel="noreferrer" className="button button-secondary">
                  Open in nieuw tabblad
                </a>
              ) : null}
            </div>
            {selectedRow ? (
              <div className="page-stack">
                <div className="list-subtle">
                  {selectedRow.project_name || selectedRow.projectnummer || selectedRow.client_name || selectedRow.title || 'Geselecteerd rapport'}
                </div>
                {canPreviewPdf ? (
                  <iframe
                    title={`PDF preview ${selectedRow.title || selectedRow.id}`}
                    src={selectedPdfUrl}
                    style={{ width: '100%', minHeight: 780, border: '1px solid #e2e8f0', borderRadius: 16, background: '#fff' }}
                  />
                ) : (
                  <EmptyState
                    title="Nog geen directe PDF-link"
                    description="Voor dit rapport is nog geen pdf_url beschikbaar. Open het gekoppelde project of voeg een backend-PDF endpoint toe om hier direct te renderen."
                  />
                )}
              </div>
            ) : (
              <EmptyState title="Geen rapport geselecteerd" description="Selecteer links een rapport om het PDF-paneel te vullen." />
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}

export default RapportagePage;

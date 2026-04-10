import React, { useMemo, useState } from 'react';
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

export function RapportagePage() {
  const navigate = useNavigate();
  const reports = useReports({ page: 1, limit: 50 });
  const rows = (reports.data?.items || []) as ReportRow[];
  const [search, setSearch] = useState('');

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

  const openPdf = (row: ReportRow) => {
    if (row.pdf_url) {
      window.open(String(row.pdf_url), '_blank', 'noopener,noreferrer');
      return;
    }
    if (row.project_id) {
      navigate(`/projecten/${row.project_id}/ce-dossier`);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader title="Rapportage" description="Rapportages zijn direct te bekijken als PDF of openen direct het gekoppelde projectdossier." />

      <Card>
        <div className="toolbar-cluster" style={{ justifyContent: 'space-between' }}>
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
                return (
                  <tr key={String(row.id)} style={{ cursor: projectPath ? 'pointer' : 'default' }}>
                    <td><strong>{row.title || `Rapport ${row.id}`}</strong></td>
                    <td>{row.project_name || row.projectnummer || row.client_name || '—'}</td>
                    <td><Badge tone={toneFromType(row.type)}>{row.type || 'project_summary'}</Badge></td>
                    <td>{row.created_at || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {projectPath ? (
                          <button className="icon-button" type="button" onClick={() => navigate(projectPath)}>
                            Open project
                          </button>
                        ) : null}
                        <button className="icon-button" type="button" onClick={() => openPdf(row)}>
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
      ) : null}
    </div>
  );
}

export default RapportagePage;

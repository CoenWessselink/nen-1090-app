import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
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

  return (
    <div className="page-stack">
      <PageHeader title="Rapportage" description="Dubbelklik opent direct de gekoppelde projectcontext. Rapportage blijft daarmee geen dood scherm meer." />

      {reports.isLoading ? <LoadingState label="Rapportage laden..." /> : null}
      {reports.isError ? <ErrorState title="Rapportage niet geladen" description="Controleer het /reports contract of de projects fallback." /> : null}
      {!reports.isLoading && !reports.isError && rows.length === 0 ? (
        <EmptyState title="Geen rapportregels beschikbaar" description="Er zijn nog geen rapportages of afgeleide projectoverzichten gevonden." />
      ) : null}

      {!reports.isLoading && !reports.isError && rows.length > 0 ? (
        <Card>
          <table className="table">
            <thead>
              <tr>
                <th>Titel</th>
                <th>Type</th>
                <th>Aangemaakt</th>
                <th>Actie</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const projectPath = row.project_id ? `/projecten/${row.project_id}/overzicht` : null;
                return (
                  <tr
                    key={String(row.id)}
                    onDoubleClick={() => projectPath && navigate(projectPath)}
                    style={{ cursor: projectPath ? 'pointer' : 'default' }}
                  >
                    <td>
                      <strong>{row.title || `Rapport ${row.id}`}</strong>
                    </td>
                    <td>
                      <Badge tone={toneFromType(row.type)}>{row.type || 'project_summary'}</Badge>
                    </td>
                    <td>{row.created_at || '—'}</td>
                    <td>
                      {projectPath ? (
                        <button className="icon-button" type="button" onClick={() => navigate(projectPath)}>
                          Open project
                        </button>
                      ) : (
                        'Geen project'
                      )}
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

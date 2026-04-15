import React, { useMemo, useState } from 'react';
import { FileText, Search } from 'lucide-react';
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
import { openDownloadUrl } from '@/utils/download';

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

function isProjectSummary(row: ReportRow) {
  return String(row.type || '').toLowerCase().includes('project') || String(row.id || '').startsWith('project-');
}

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
  const [activePreviewUrl, setActivePreviewUrl] = useState('');

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      JSON.stringify({
        title: row.title,
        project_name: row.project_name,
        projectnummer: row.projectnummer,
        client_name: row.client_name,
      }).toLowerCase().includes(q),
    );
  }, [rows, search]);

  async function openPdf(row: ReportRow) {
    if (row.project_id && isProjectSummary(row)) {
      navigate(`/projecten/${row.project_id}/pdf-viewer`);
      return;
    }
    if (row.pdf_url) {
      setActivePreviewUrl(String(row.pdf_url));
      await openDownloadUrl(String(row.pdf_url), `rapport-${row.id}.pdf`);
      return;
    }
    if (row.project_id) {
      navigate(`/projecten/${row.project_id}/overzicht`);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader title="Rapportage" description="Rapportages zijn uitgelijnd, direct filterbaar en vanuit de PDF-tegel direct te openen." />

      <div className="content-grid-2" style={{ alignItems: 'start' }}>
        <Card>
          <div className="section-title-row">
            <h3>Zoeken in rapportages</h3>
            <Button variant="secondary" onClick={() => setSearch('')}>Wis filter</Button>
          </div>
          <div className="toolbar-cluster" style={{ alignItems: 'center' }}>
            <Search size={16} />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Zoek op projectnaam, projectnummer of opdrachtgever"
            />
          </div>
        </Card>

        <Card>
          <div className="section-title-row">
            <h3>PDF</h3>
            <Badge tone="success">Direct openen</Badge>
          </div>
          <button
            type="button"
            onClick={() => {
              const firstRow = visibleRows.find((item) => item.pdf_url || item.project_id);
              if (firstRow) openPdf(firstRow);
            }}
            style={{
              width: '100%',
              border: '1px solid #bfdbfe',
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              borderRadius: 18,
              padding: 18,
              display: 'grid',
              gap: 8,
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: '#1d4ed8', color: '#fff', display: 'grid', placeItems: 'center' }}>
                <FileText size={24} />
              </div>
              <div>
                <strong>Open PDF</strong>
                <div className="list-subtle">Klik op het PDF-blok om het rapport direct te openen.</div>
              </div>
            </div>
          </button>
        </Card>
      </div>

      {reports.isLoading ? <LoadingState label="Rapportage laden..." /> : null}
      {reports.isError ? <ErrorState title="Rapportage niet geladen" description="Controleer het /reports contract of de projects fallback." /> : null}
      {!reports.isLoading && !reports.isError && visibleRows.length === 0 ? (
        <EmptyState title="Geen rapportregels beschikbaar" description="Er zijn nog geen rapportages of afgeleide projectoverzichten gevonden." />
      ) : null}

      {!reports.isLoading && !reports.isError && visibleRows.length > 0 ? (
        <div className="content-grid-2" style={{ alignItems: 'start' }}>
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
                    <tr key={String(row.id)}>
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

          <Card>
            <div className="section-title-row">
              <h3>PDF voorbeeld</h3>
              <Badge tone={activePreviewUrl ? 'success' : 'neutral'}>{activePreviewUrl ? 'Actief' : 'Nog niets geopend'}</Badge>
            </div>
            {activePreviewUrl ? (
              <iframe title="Rapport PDF voorbeeld" src={activePreviewUrl} style={{ width: '100%', minHeight: 720, border: '1px solid #e2e8f0', borderRadius: 14 }} />
            ) : (
              <EmptyState title="Nog geen PDF gekozen" description="Klik op Open PDF of Bekijk PDF om een rapport direct te openen." />
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}

export default RapportagePage;

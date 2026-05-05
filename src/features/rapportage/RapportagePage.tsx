import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileText, RefreshCw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { useReports } from '@/hooks/useReports';
import { openDownloadUrl, openProtectedPdfPreview } from '@/utils/download';

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
  ce_status?: string;
  ce_score?: number;
  photos_count?: number;
  documents_count?: number;
};

function isProjectSummary(row: ReportRow) {
  return String(row.type || '').toLowerCase().includes('project') || String(row.type || '').toLowerCase().includes('weld_compliance') || String(row.id || '').startsWith('project-');
}

function toneFromType(type?: string) {
  const value = String(type || '').toLowerCase();
  if (value.includes('weld') || value.includes('project')) return 'success' as const;
  if (value.includes('ce')) return 'warning' as const;
  return 'neutral' as const;
}

function resolvePdfUrl(row: ReportRow, force = false) {
  const base = String(row.pdf_url || row.download_url || '').trim();
  if (!base) return '';
  if (!force) return base;
  const separator = base.includes('?') ? '&' : '?';
  return base.includes('force=true') ? base : `${base}${separator}force=true`;
}

function reportFilename(row: ReportRow) {
  const safe = (value: string, fallback: string) => String(value || fallback).trim().replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || fallback;
  const projectName = safe(String(row.project_name || row.title || 'project'), 'project');
  const projectNumber = safe(String(row.projectnummer || row.project_id || row.id || 'zonder-nummer'), 'zonder-nummer');
  const stamp = new Date().toISOString().slice(0, 10);
  return `Weld-Compliance-Report-${projectNumber}-${projectName}-${stamp}.pdf`;
}

export function RapportagePage() {
  const navigate = useNavigate();
  const reports = useReports({ page: 1, limit: 50 });
  const rows = (reports.data?.items || []) as ReportRow[];
  const [search, setSearch] = useState('');
  const [activePreviewUrl, setActivePreviewUrl] = useState('');
  const [activePreviewTitle, setActivePreviewTitle] = useState('');
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [creatingId, setCreatingId] = useState<string | null>(null);

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

  useEffect(() => () => {
    if (activePreviewUrl.startsWith('blob:')) URL.revokeObjectURL(activePreviewUrl);
  }, [activePreviewUrl]);

  async function previewPdf(row: ReportRow, force = false) {
    try {
      const pdfUrl = resolvePdfUrl(row, force);
      if (row.project_id && isProjectSummary(row) && !pdfUrl) {
        navigate(`/projecten/${row.project_id}/pdf-viewer`);
        return;
      }
      if (!pdfUrl) {
        if (row.project_id) {
          navigate(`/projecten/${row.project_id}/pdf-viewer`);
          return;
        }
        setPreviewMessage('Voor dit rapport is nog geen preview-URL beschikbaar.');
        return;
      }
      const protectedUrl = await openProtectedPdfPreview(pdfUrl);
      setPreviewMessage(null);
      setActivePreviewTitle(String(row.title || `Rapport ${row.id}`));
      setActivePreviewUrl((current) => {
        if (current && current.startsWith('blob:')) URL.revokeObjectURL(current);
        return protectedUrl;
      });
    } catch (error) {
      setPreviewMessage(error instanceof Error ? error.message : 'PDF preview openen mislukt.');
    }
  }

  async function createPdf(row: ReportRow) {
    const key = String(row.id);
    setCreatingId(key);
    try {
      await previewPdf(row, true);
    } finally {
      setCreatingId(null);
    }
  }

  async function downloadPdf(row: ReportRow) {
    const pdfUrl = resolvePdfUrl(row, true);
    if (pdfUrl) {
      await openDownloadUrl(pdfUrl, reportFilename(row));
      return;
    }
    if (row.project_id) {
      navigate(`/projecten/${row.project_id}/pdf-viewer`);
    }
  }

  return (
    <div className="page-stack reports-page-fix">
      <PageHeader title="Rapportage" description="Maak, bekijk en download het Weld Compliance Report per project." />

      <div className="content-grid-2 reports-toolbar-grid" style={{ alignItems: 'start' }}>
        <Card>
          <div className="section-title-row reports-title-row">
            <h3>Zoeken in rapportages</h3>
            <Button variant="secondary" onClick={() => setSearch('')}>Wis filter</Button>
          </div>
          <div className="toolbar-cluster reports-searchbar" style={{ alignItems: 'center' }}>
            <Search size={16} />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Zoek op projectnaam, projectnummer of opdrachtgever"
            />
          </div>
        </Card>

        <Card>
          <div className="section-title-row reports-title-row">
            <h3>PDF</h3>
            <Badge tone="success">Beveiligde preview</Badge>
          </div>
          <button
            type="button"
            onClick={() => {
              const firstRow = visibleRows.find((item) => resolvePdfUrl(item) || item.project_id);
              if (firstRow) void createPdf(firstRow);
            }}
            className="reports-feature-button"
          >
            <div className="reports-feature-icon"><FileText size={24} /></div>
            <div>
              <strong>Create PDF</strong>
              <div className="list-subtle">Genereer het meest recente Weld Compliance Report opnieuw en open de preview.</div>
            </div>
          </button>
        </Card>
      </div>

      {previewMessage ? <InlineMessage tone="neutral">{previewMessage}</InlineMessage> : null}
      {reports.isLoading ? <LoadingState label="Rapportage laden..." /> : null}
      {reports.isError ? <ErrorState title="Rapportage niet geladen" description="Controleer het /reports contract of de projects fallback." /> : null}
      {!reports.isLoading && !reports.isError && visibleRows.length === 0 ? (
        <EmptyState title="Geen rapportregels beschikbaar" description="Er zijn nog geen rapportages of afgeleide projectoverzichten gevonden." />
      ) : null}

      {!reports.isLoading && !reports.isError && visibleRows.length > 0 ? (
        <div className="content-grid-2 reports-content-grid" style={{ alignItems: 'start' }}>
          <Card>
            <div className="reports-list">
              {visibleRows.map((row) => {
                const projectPath = row.project_id ? `/projecten/${row.project_id}/overzicht` : null;
                const key = String(row.id);
                return (
                  <article key={key} className="reports-card-row">
                    <div className="reports-card-main">
                      <strong>{row.title || `Weld Compliance Report ${row.id}`}</strong>
                      <span>{row.created_at ? new Date(row.created_at).toLocaleString('nl-NL') : 'Datum onbekend'}</span>
                      <span>{row.project_name || row.projectnummer || row.client_name || 'Project onbekend'}</span>
                      <Badge tone={toneFromType(row.type)}>{row.type || 'weld_compliance_report'}</Badge>
                    </div>
                    <div className="reports-card-actions">
                      {projectPath ? (
                        <button className="reports-action reports-action-secondary" type="button" onClick={() => navigate(projectPath)}>
                          Project
                        </button>
                      ) : null}
                      <button className="reports-action reports-action-primary" type="button" onClick={() => void createPdf(row)} disabled={creatingId === key}>
                        {creatingId === key ? <RefreshCw size={15} /> : <FileText size={15} />}
                        {creatingId === key ? 'Maken…' : 'Create PDF'}
                      </button>
                      <button className="reports-action reports-action-secondary" type="button" onClick={() => void downloadPdf(row)}>
                        <Download size={15} /> Download
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="section-title-row reports-title-row">
              <h3>PDF voorbeeld</h3>
              <Badge tone={activePreviewUrl ? 'success' : 'neutral'}>{activePreviewUrl ? 'Actief' : 'Nog niets geopend'}</Badge>
            </div>
            {activePreviewTitle ? <div className="list-subtle" style={{ marginBottom: 12 }}>{activePreviewTitle}</div> : null}
            {activePreviewUrl ? (
              <iframe title="Rapport PDF voorbeeld" src={activePreviewUrl} style={{ width: '100%', minHeight: 720, border: '1px solid #e2e8f0', borderRadius: 14 }} />
            ) : (
              <EmptyState title="Nog geen PDF gekozen" description="Klik op Create PDF om een rapport opnieuw te genereren en direct te openen." />
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}

export default RapportagePage;

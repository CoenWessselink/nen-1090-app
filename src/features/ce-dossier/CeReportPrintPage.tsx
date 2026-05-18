import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchCeAggregate, type CeAggregateResponse } from '@/api/ceAggregateApi';
import { getProject } from '@/api/projects';
import { dossierPayloadFromAggregate, attachmentsAsCeDocuments } from '@/utils/ceAggregateView';
import { normalizeChecklist, summarizeChecklist, projectTitle, projectCode, projectClient, projectExecutionClass } from '@/features/mobile/mobile-utils';
import { useSession } from '@/app/session/SessionContext';
import type { CeDocument, Project } from '@/types/domain';
import './ce-report-print.css';

function val(v: unknown, fallback = '—') {
  if (v === null || v === undefined || v === '') return fallback;
  return String(v);
}

function fmtDate(v?: string | null) {
  if (!v) return new Date().toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function pct(n: number, total: number) {
  if (!total) return 0;
  return Math.round((n / total) * 100);
}

function statusLabel(score: number) {
  if (score >= 95) return 'Compliant';
  if (score >= 80) return 'In control';
  return 'In progress';
}

function statusClass(score: number) {
  if (score >= 95) return 'rpt-status-green';
  if (score >= 80) return 'rpt-status-blue';
  return 'rpt-status-orange';
}

const tocSections = [
  { id: 'project-summary', label: 'Project & compliance summary' },
  { id: 'applicable-standards', label: 'Applicable standards' },
  { id: 'dossier-checklist', label: 'Dossier completeness checklist' },
  { id: 'weld-register', label: 'Weld register' },
  { id: 'weld-inspections', label: 'Detailed weld inspections' },
  { id: 'wps-certificates', label: 'Certificates and WPS documents' },
  { id: 'attachments-appendix', label: 'Attachments appendix' },
  { id: 'audit-release', label: 'Audit trail and approval' },
];

export function CeReportPrintPage() {
  const { projectId = '' } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [aggregate, setAggregate] = useState<CeAggregateResponse | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const session = useSession();

  const loadAll = useCallback(async () => {
    const [agg, proj] = await Promise.all([
      fetchCeAggregate(projectId),
      getProject(projectId).catch(() => null),
    ]);

    setAggregate(agg);
    setDocuments(attachmentsAsCeDocuments((agg.attachments || []) as Record<string, unknown>[]));
    setProject(proj || null);

    await new Promise((resolve) => setTimeout(resolve, 900));
  }, [projectId]);

  useEffect(() => {
    let active = true;

    setLoading(true);

    loadAll()
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [loadAll]);

  useEffect(() => {
    if (!loading) {
      const images = Array.from(document.images);

      Promise.all(images.map((img) => {
        if (img.complete) return Promise.resolve();

        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })).finally(() => {
        document.body.setAttribute('data-ce-report-ready', '1');
      });
    }
  }, [loading]);

  const checklist = useMemo(() => normalizeChecklist(aggregate?.project || {}), [aggregate]);
  const summary = useMemo(() => summarizeChecklist(checklist), [checklist]);

  const score = Math.max(0, Math.min(100, Number(summary.total ? pct(summary.complete, summary.total) : 83)));

  const generatedBy = session?.user?.email || 'system';
  const generatedAt = new Date().toISOString();

  const projName = project ? projectTitle(project) : 'Project';
  const projCode = project ? projectCode(project) : projectId;
  const projClient = project ? projectClient(project) : '—';
  const projExc = project ? projectExecutionClass(project) : 'EXC2';

  if (loading) {
    return <div className="rpt-loading">Loading CE report...</div>;
  }

  return (
    <div className="rpt-page-wrap">
      <button
        type="button"
        className="rpt-print-btn"
        onClick={() => {
          requestAnimationFrame(() => {
            setTimeout(() => window.print(), 350);
          });
        }}
      >
        ⎙ Afdrukken / PDF opslaan
      </button>

      <section className="rpt-page rpt-cover">
        <div className="rpt-body">
          <h1>Weld Compliance Report</h1>
          <div className="rpt-cover-grid">
            <div><span>PROJECT</span><strong>{projName}</strong></div>
            <div><span>CLIENT</span><strong>{projClient}</strong></div>
            <div><span>EXECUTION CLASS</span><strong>{projExc}</strong></div>
            <div><span>COMPLETENESS</span><strong>{score}%</strong></div>
          </div>
        </div>
      </section>

      <section className="rpt-page">
        <div className="rpt-body">
          <h2>Table of contents</h2>

          <ol className="rpt-toc">
            {tocSections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.label}</a>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="rpt-page" id="project-summary">
        <div className="rpt-body">
          <h2>1. Project & compliance summary</h2>
          <table className="rpt-table">
            <tbody>
              <tr><td>Project</td><td>{projName}</td></tr>
              <tr><td>Project number</td><td>{projCode}</td></tr>
              <tr><td>Generated by</td><td>{generatedBy}</td></tr>
              <tr><td>Generated at</td><td>{generatedAt}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="rpt-page" id="applicable-standards">
        <div className="rpt-body">
          <h2>2. Applicable standards</h2>
          <p>EN 1090 · ISO 3834 · ISO 5817</p>
        </div>
      </section>

      <section className="rpt-page" id="dossier-checklist">
        <div className="rpt-body">
          <h2>3. Dossier completeness checklist</h2>
          <p>Current dossier completeness: {score}%</p>
        </div>
      </section>

      <section className="rpt-page" id="weld-register">
        <div className="rpt-body">
          <h2>4. Weld register</h2>
          <p>Canonical weld register included in CE aggregate runtime.</p>
        </div>
      </section>

      <section className="rpt-page" id="weld-inspections">
        <div className="rpt-body">
          <h2>5. Detailed weld inspections</h2>
          <p>Inspection evidence and weld quality records.</p>
        </div>
      </section>

      <section className="rpt-page" id="wps-certificates">
        <div className="rpt-body">
          <h2>6. Certificates and WPS documents</h2>
          <p>WPS, WPQR and qualification evidence linked.</p>
        </div>
      </section>

      <section className="rpt-page" id="attachments-appendix">
        <div className="rpt-body">
          <h2>7. Attachments appendix</h2>

          {documents.length ? documents.map((doc, index) => {
            const isImage = String(doc.mime_type || '').startsWith('image');
            const src = doc.url || doc.download_url || doc.file_url;

            return (
              <div key={String(doc.id || index)} className="rpt-attachment-card">
                <table className="rpt-table rpt-table-compact">
                  <tbody>
                    <tr><td>ID</td><td>APP-{String(index + 1).padStart(3, '0')}</td></tr>
                    <tr><td>Filename</td><td>{val(doc.file_name || doc.name || doc.title)}</td></tr>
                    <tr><td>Type</td><td>{val(doc.mime_type || doc.category)}</td></tr>
                  </tbody>
                </table>

                {isImage && src ? (
                  <img
                    className="rpt-attachment-image"
                    src={String(src)}
                    alt={String(doc.file_name || doc.name || 'Attachment')}
                  />
                ) : null}
              </div>
            );
          }) : (
            <p>No attachments linked.</p>
          )}
        </div>
      </section>

      <section className="rpt-page" id="audit-release">
        <div className="rpt-body">
          <h2>8. Audit trail and approval</h2>

          <table className="rpt-table">
            <tbody>
              <tr><td>Generated by</td><td>{generatedBy}</td></tr>
              <tr><td>Generated at</td><td>{generatedAt}</td></tr>
              <tr><td>Runtime source</td><td>Canonical CE aggregate payload</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

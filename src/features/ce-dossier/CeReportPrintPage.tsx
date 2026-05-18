import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchCeAggregate, type CeAggregateResponse } from '@/api/ceAggregateApi';
import { getProject } from '@/api/projects';
import { attachmentsAsCeDocuments } from '@/utils/ceAggregateView';
import { normalizeChecklist, summarizeChecklist, projectTitle, projectCode, projectClient, projectExecutionClass } from '@/features/mobile/mobile-utils';
import { useSession } from '@/app/session/SessionContext';
import type { Project } from '@/types/domain';
import './ce-report-print.css';

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

function val(v: unknown, fallback = '—') {
  if (v === null || v === undefined || v === '') return fallback;
  return String(v);
}

function pct(n: number, total: number) {
  if (!total) return 0;
  return Math.round((n / total) * 100);
}

export function CeReportPrintPage() {
  const { projectId = '' } = useParams();

  const session = useSession();

  const [project, setProject] = useState<Project | null>(null);
  const [aggregate, setAggregate] = useState<CeAggregateResponse | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    const [agg, proj] = await Promise.all([
      fetchCeAggregate(projectId),
      getProject(projectId).catch(() => null),
    ]);

    setAggregate(agg);
    setProject(proj || null);
    setDocuments(attachmentsAsCeDocuments((agg.attachments || []) as Record<string, unknown>[]));

    await new Promise((resolve) => setTimeout(resolve, 1200));
  }, [projectId]);

  useEffect(() => {
    let active = true;

    setLoading(true);

    loadAll().finally(() => {
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
        if (img.complete) {
          return Promise.resolve();
        }

        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })).finally(() => {
        document.documentElement.setAttribute('data-ce-report-ready', '1');
      });
    }
  }, [loading]);

  const checklist = useMemo(() => normalizeChecklist(aggregate?.project || {}), [aggregate]);
  const summary = useMemo(() => summarizeChecklist(checklist), [checklist]);

  const score = Math.max(0, Math.min(100, Number(summary.total ? pct(summary.complete, summary.total) : 83)));

  const projName = project ? projectTitle(project) : 'Project';
  const projCode = project ? projectCode(project) : projectId;
  const projClient = project ? projectClient(project) : '—';
  const projExc = project ? projectExecutionClass(project) : 'EXC2';

  const generatedAt = new Date().toISOString();
  const generatedBy = session?.user?.email || 'system';

  if (loading) {
    return <div className="rpt-loading">Loading enterprise CE report...</div>;
  }

  return (
    <div className="rpt-page-wrap">
      <button
        type="button"
        className="rpt-print-btn"
        onClick={() => {
          requestAnimationFrame(() => {
            setTimeout(() => {
              window.print();
            }, 500);
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

      {tocSections.map((section, index) => (
        <section key={section.id} className="rpt-page" id={section.id}>
          <div className="rpt-body">
            <h2>{index + 1}. {section.label}</h2>

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
      ))}

      <section className="rpt-page" id="attachments-appendix">
        <div className="rpt-body">
          <h2>Attachments appendix</h2>

          {documents.length ? documents.map((doc, index) => {
            const mime = String(doc.mime_type || '').toLowerCase();
            const src = doc.url || doc.download_url || doc.file_url;

            const isImage = mime.startsWith('image');
            const isPdf = mime.includes('pdf');

            return (
              <div className="rpt-attachment-card" key={String(doc.id || index)}>
                <table className="rpt-table rpt-table-compact">
                  <tbody>
                    <tr><td>ID</td><td>APP-{String(index + 1).padStart(3, '0')}</td></tr>
                    <tr><td>Name</td><td>{val(doc.file_name || doc.name || doc.title)}</td></tr>
                    <tr><td>Type</td><td>{val(mime)}</td></tr>
                  </tbody>
                </table>

                {isImage && src ? (
                  <img
                    className="rpt-attachment-image"
                    src={String(src)}
                    alt={String(doc.file_name || doc.name || 'Attachment')}
                  />
                ) : null}

                {isPdf && src ? (
                  <iframe
                    title={String(doc.file_name || doc.name || `pdf-${index}`)}
                    src={String(src)}
                    className="rpt-attachment-image"
                  />
                ) : null}
              </div>
            );
          }) : (
            <p>No linked attachments available.</p>
          )}
        </div>
      </section>
    </div>
  );
}

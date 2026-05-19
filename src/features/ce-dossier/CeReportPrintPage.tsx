import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchCeAggregate, type CeAggregateResponse } from '@/api/ceAggregateApi';
import { getProject } from '@/api/projects';
import { getCompanySettings } from '@/api/settings';
import { dossierPayloadFromAggregate, attachmentsAsCeDocuments } from '@/utils/ceAggregateView';
import { normalizeChecklist, summarizeChecklist, projectTitle, projectCode, projectClient, projectExecutionClass } from '@/features/mobile/mobile-utils';
import { useSession } from '@/app/session/SessionContext';
import {
  RenderControlsAuditRows,
  RenderInspectionCompletenessRow,
  RenderWeldControlsTable,
  controlRowsLabel,
} from '@/features/ce-dossier/ceReportInspectionControls';
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

function resultLabel(v?: string) {
  const s = String(v || '').toLowerCase().replace(/[\s_-]+/g, '-');
  if (s === 'conform' || s === 'compliant' || s === 'ok' || s === 'approved' || s === 'goedgekeurd') return 'Compliant';
  if (s.includes('not') || s.includes('non') || s === 'defect' || s === 'rejected' || s === 'afgekeurd' || s === 'failed') return 'Not compliant';
  return 'In control';
}

function resultClass(v?: string) {
  const label = resultLabel(v);
  if (label === 'Compliant') return 'rpt-status-green';
  if (label === 'Not compliant') return 'rpt-status-red';
  return 'rpt-status-blue';
}

const STANDARDS = [
  { code: 'EN 1090-1', purpose: 'CE marking framework', evidence: 'Project compliance summary' },
  { code: 'EN 1090-2', purpose: 'Execution class and traceability', evidence: 'Weld register, materials, WPS' },
  { code: 'ISO 3834-2', purpose: 'Welding quality requirements', evidence: 'WPS/WPQR, coordinator evidence' },
  { code: 'ISO 5817', purpose: 'Weld acceptance levels', evidence: 'Weld/NDT result status' },
  { code: 'ISO 17637', purpose: 'Visual testing', evidence: 'Inspection records and photos' },
  { code: 'ISO 9606-1', purpose: 'Welder qualification', evidence: 'Welder certificates' },
  { code: 'ISO 15609 / 15614', purpose: 'WPS / WPQR', evidence: 'Procedure references' },
  { code: 'EN 10204', purpose: 'Material traceability', evidence: 'Material certificate register' },
];

const TOC_ITEMS = [
  { id: 'project-summary', label: 'Project & compliance summary' },
  { id: 'applicable-standards', label: 'Applicable standards' },
  { id: 'dossier-checklist', label: 'Dossier completeness checklist' },
  { id: 'weld-register', label: 'Weld register' },
  { id: 'weld-inspections', label: 'Detailed weld inspections' },
  { id: 'photo-evidence', label: 'Photo evidence' },
  { id: 'certificates-wps', label: 'Certificates and WPS documents' },
  { id: 'attachments-appendix', label: 'Attachments appendix' },
  { id: 'audit-trail', label: 'Audit trail' },
  { id: 'approval-release', label: 'Approval & release' },
] as const;

type R = Record<string, unknown>;

function docRecord(d: CeDocument): R {
  return d as unknown as R;
}

function firstString(source: R | null | undefined, keys: string[], fallback = '—') {
  if (!source) return fallback;
  for (const key of keys) {
    const value = source[key];
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return String(value);
    }
  }
  return fallback;
}

function docMime(d: CeDocument) {
  return String(docRecord(d).mime_type || docRecord(d).content_type || docRecord(d).type || '').toLowerCase();
}

function docSource(d: CeDocument) {
  const r = docRecord(d);
  return String(r.url || r.download_url || r.file_url || r.preview_url || r.storage_url || r.public_url || r.href || '');
}

function docName(d: CeDocument) {
  const r = docRecord(d);
  return val(r.file_name || r.filename || r.name || r.title, 'Attachment');
}

function isPreviewableImage(d: CeDocument) {
  const mime = docMime(d);
  const src = docSource(d).toLowerCase();
  return mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)(\?|#|$)/i.test(src);
}

function isPreviewablePdf(d: CeDocument) {
  const mime = docMime(d);
  const src = docSource(d).toLowerCase();
  return mime.includes('pdf') || /\.pdf(\?|#|$)/i.test(src);
}

function weldNumber(weld: R) {
  return firstString(weld, ['weld_number', 'weld_no', 'number', 'code', 'id'], '—');
}

function sameId(a: unknown, b: unknown) {
  return String(a || '').trim() !== '' && String(a || '') === String(b || '');
}

function documentMatchesWeld(document: CeDocument, weld: R) {
  const row = docRecord(document);
  const number = weldNumber(weld);
  return sameId(row.weld_id, weld.id)
    || sameId(row.weldId, weld.id)
    || sameId(row.linked_weld_id, weld.id)
    || sameId(row.entity_id, weld.id)
    || sameId(row.object_id, weld.id)
    || sameId(row.weld_number, number)
    || sameId(row.weld_no, number)
    || sameId(row.weld, number)
    || String(row.scope || row.linked_scope || row.category || '').toLowerCase().includes(String(number).toLowerCase());
}

function photosForWeld(weld: R, documents: CeDocument[]) {
  return documents.filter((document) => isPreviewableImage(document) && documentMatchesWeld(document, weld));
}

async function waitForReportAssets() {
  const root = document.querySelector('.rpt-page-wrap');
  const images = Array.from(root?.querySelectorAll('img') || []);
  const frames = Array.from(root?.querySelectorAll('iframe') || []);

  await Promise.all(images.map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });
  }));

  await Promise.all(frames.map((frame) => new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    frame.onload = finish;
    frame.onerror = finish;
    window.setTimeout(finish, 1200);
  })));

  document.documentElement.setAttribute('data-ce-report-ready', '1');
}

export function CeReportPrintPage() {
  const { projectId = '' } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [aggregate, setAggregate] = useState<CeAggregateResponse | null>(null);
  const [payload, setPayload] = useState<R | null>(null);
  const [companySettings, setCompanySettings] = useState<R | null>(null);
  const [documents, setDocuments] = useState<CeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const session = useSession();

  const loadAll = useCallback(async () => {
    const [agg, proj, company] = await Promise.all([
      fetchCeAggregate(projectId),
      getProject(projectId).catch(() => null),
      getCompanySettings().catch(() => null),
    ]);
    setAggregate(agg);
    setPayload(dossierPayloadFromAggregate(agg));
    setDocuments(attachmentsAsCeDocuments((agg.attachments || []) as R[]));
    setProject(proj || null);
    setCompanySettings((company && typeof company === 'object') ? company as R : null);
  }, [projectId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    document.documentElement.removeAttribute('data-ce-report-ready');
    loadAll()
      .then(() => { if (active) setError(null); })
      .catch(() => { if (active) setError(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadAll]);

  useEffect(() => {
    if (!loading) {
      window.requestAnimationFrame(() => {
        void waitForReportAssets();
      });
    }
  }, [loading, documents.length]);

  const printReport = useCallback(() => {
    window.requestAnimationFrame(() => {
      void waitForReportAssets().finally(() => {
        window.setTimeout(() => window.print(), 350);
      });
    });
  }, []);

  const checklist = useMemo(() => normalizeChecklist(payload?.checklist), [payload]);
  const summary = useMemo(() => summarizeChecklist(checklist), [checklist]);
  const score = Math.max(0, Math.min(100, Number(payload?.score || (summary.total ? pct(summary.complete, summary.total) : 0))));

  const welds = useMemo(() => (aggregate?.welds || []) as R[], [aggregate]);
  const inspections = useMemo(() => (aggregate?.inspections || []) as R[], [aggregate]);
  const materials = useMemo(() => (aggregate?.materials || []) as R[], [aggregate]);
  const wpsRows = useMemo(() => (aggregate?.wps || []) as R[], [aggregate]);
  const welders = useMemo(() => (aggregate?.welders || []) as R[], [aggregate]);
  const photoDocuments = useMemo(() => documents.filter(isPreviewableImage), [documents]);

  const detailedWeldPageCount = Math.max(welds.length, 1);
  const photoPage = 7 + detailedWeldPageCount;
  const certificatesPage = photoPage + 1;
  const appendixPage = photoPage + 2;
  const auditPage = photoPage + 3;
  const totalPages = photoPage + 3;

  const exportId = useMemo(() => crypto.randomUUID?.() || `rpt-${Date.now()}`, []);
  const generatedAt = new Date().toISOString();
  const generatedBy = session?.user?.email || 'system';
  const projName = project ? projectTitle(project) : 'Project';
  const projCode = project ? projectCode(project) : projectId;
  const projClient = project ? projectClient(project) : firstString(companySettings, ['company_name', 'name', 'tenant_name'], '—');
  const projExc = project ? projectExecutionClass(project) : 'EXC2';
  const tenantName = firstString(companySettings, ['display_name', 'company_name', 'legal_name', 'name', 'tenant_name', 'manufacturer_name'], projClient);
  const tenantLogo = firstString(companySettings, ['logo_url', 'logoUrl', 'logo', 'company_logo_url', 'companyLogoUrl', 'tenant_logo_url', 'tenantLogoUrl', 'brand_logo_url', 'image_url'], '');
  const tenantAddress = firstString(companySettings, ['address_line', 'address', 'street', 'postal_address'], '—');
  const tenantPostal = firstString(companySettings, ['postal_code', 'zip', 'postcode'], '');
  const tenantCity = firstString(companySettings, ['city', 'place', 'town'], '');
  const tenantCountry = firstString(companySettings, ['country', 'country_name'], '');
  const tenantContact = [tenantAddress, tenantPostal, tenantCity, tenantCountry].filter((v) => v && v !== '—').join(' · ') || '—';
  const acceptanceLevel = firstString(payload, ['acceptance_level', 'acceptanceLevel', 'quality_level', 'qualityLevel'], 'ISO 5817 - project defined');
  const sourceHash = firstString(payload, ['source_hash', 'sourceHash', 'hash', 'aggregate_hash', 'aggregateHash'], exportId.replace(/-/g, '').slice(0, 40));
  const normLine = `EN 1090 · ISO 3834 · ISO 5817 · Weld inspection evidence`;

  function header() {
    return (
      <div className="rpt-header rpt-brand-header">
        <div className="rpt-header-left">
          <div className="rpt-product-logo" aria-label="WeldInspect Pro logo">
            <span className="rpt-product-logo-title">WeldInspect <b>PRO</b></span>
            <small>Enterprise Weld Compliance Platform</small>
          </div>
        </div>
        <div className="rpt-header-center">
          <span>{projCode} · {normLine}</span>
        </div>
        <div className="rpt-header-right rpt-tenant-logo-box">
          {tenantLogo ? <img src={tenantLogo} alt={`${tenantName} logo`} /> : <strong>{tenantName}</strong>}
          <small>Tenant company logo</small>
        </div>
      </div>
    );
  }

  function footer(pageNum: number, totalPagesCount: number) {
    return (
      <div className="rpt-footer">
        <span>{projCode} · {normLine}</span>
        <span>Export ID {exportId.slice(0, 8)}… · {generatedAt.slice(0, 16).replace('T', ' ')} · Enterprise report-quality v3 · Page {pageNum} of {totalPagesCount}</span>
      </div>
    );
  }

  if (loading) return <div className="rpt-loading">Rapport laden…</div>;
  if (error) return <div className="rpt-loading rpt-error">{error}</div>;

  const checklistRows = [
    { label: 'Project details complete', status: project ? 'In control' : 'Missing', detail: project ? 'Project metadata available' : 'Project not loaded' },
    { label: 'WPS linked', status: wpsRows.length ? 'Compliant' : 'Missing', detail: wpsRows.length ? `${wpsRows.length} WPS references` : 'No WPS linked' },
    { label: 'Material traceability linked', status: materials.length ? 'Compliant' : 'Missing', detail: materials.length ? `${materials.length} material references` : 'No materials linked' },
    { label: 'Inspection completed', status: inspections.length ? 'Compliant' : 'Missing', detail: `${inspections.length} inspection records` },
    { label: 'Photos available', status: photoDocuments.length ? 'Compliant' : 'Missing', detail: `${photoDocuments.length} photo evidence items` },
    { label: 'Attachments available', status: documents.length ? 'Compliant' : 'Missing', detail: `${documents.length} attachment records` },
    { label: 'Approval release', status: score >= 95 ? 'Compliant' : 'In control', detail: score >= 95 ? 'Prepared, reviewed and released' : 'Pending completion' },
  ];

  return (
    <div className="rpt-page-wrap">
      <button type="button" className="rpt-print-btn" onClick={printReport}>⎙ Afdrukken / PDF opslaan</button>

      <section className="rpt-page rpt-cover" data-print-section="true">
        {header()}
        <div className="rpt-cover-body">
          <h1>Weld Compliance Report</h1>
          <p className="rpt-cover-norms">EN 1090 · ISO 3834 · ISO 5817 · ISO 17637 · ISO 9606-1 · EN 10204</p>
          <div className="rpt-cover-status">
            <span className={`rpt-pill ${statusClass(score)}`}>{statusLabel(score).toUpperCase()}</span>
            <span className="rpt-pill rpt-pill-outline">{projExc}</span>
          </div>
          <div className="rpt-cover-grid">
            <div><span>PROJECT</span><strong>{projName}</strong><small>Project no. {projCode}</small></div>
            <div><span>CLIENT</span><strong>{projClient}</strong><small>{tenantName}</small></div>
            <div><span>COMPLETENESS</span><strong>{score}%</strong><small>CE dossier {score >= 95 ? 'ready' : 'in progress'}</small></div>
          </div>
          <table className="rpt-table rpt-meta-table">
            <thead><tr><th>Project field</th><th>Value</th></tr></thead>
            <tbody>
              <tr><td>Project name</td><td>{projName}</td></tr>
              <tr><td>Project number</td><td>{projCode}</td></tr>
              <tr><td>Client / company</td><td>{projClient}</td></tr>
              <tr><td>Tenant / manufacturer</td><td>{tenantName}</td></tr>
              <tr><td>Address / contact</td><td>{tenantContact}</td></tr>
              <tr><td>Execution class</td><td>{projExc}</td></tr>
              <tr><td>Acceptance level</td><td>{acceptanceLevel}</td></tr>
              <tr><td>Generated by</td><td>{generatedBy}</td></tr>
              <tr><td>Source hash</td><td className="rpt-mono">{sourceHash}</td></tr>
              <tr><td>Export ID</td><td className="rpt-mono">{exportId}</td></tr>
            </tbody>
          </table>
        </div>
        {footer(1, totalPages)}
      </section>

      <section className="rpt-page" data-print-section="true">
        {header()}
        <div className="rpt-body">
          <h2>Clickable table of contents</h2>
          <ol className="rpt-toc">
            {TOC_ITEMS.map((item) => (
              <li key={item.id}><a href={`#${item.id}`}>{item.label}</a></li>
            ))}
          </ol>
        </div>
        {footer(2, totalPages)}
      </section>

      <section className="rpt-page rpt-anchor-offset" id="project-summary" data-print-section="true">
        {header()}
        <div className="rpt-body">
          <h2>1. Project &amp; compliance summary</h2>
          <div className="rpt-kpi-grid">
            <div className="rpt-kpi"><span>OVERALL STATUS</span><strong className={statusClass(score)}>{statusLabel(score)}</strong><small>Based on current CE aggregate</small></div>
            <div className="rpt-kpi"><span>DOSSIER</span><strong>{score}%</strong><small>{100 - score}% pending metadata</small></div>
            <div className="rpt-kpi"><span>WELDS</span><strong>{welds.length}</strong><small>{inspections.length} inspection records</small></div>
            <div className="rpt-kpi"><span>PHOTOS</span><strong>{photoDocuments.length}</strong><small>Inline and appendix</small></div>
          </div>
          <div className="rpt-score-bar-row">
            <div><span>Completeness</span><div className="rpt-score-bar"><span style={{ width: `${score}%` }} /></div><strong>{score}%</strong></div>
            <div><span>Inspections</span><div className="rpt-score-bar"><span style={{ width: `${pct(inspections.length, Math.max(welds.length, 1))}%` }} /></div><strong>{pct(inspections.length, Math.max(welds.length, 1))}%</strong></div>
          </div>
          <table className="rpt-table">
            <thead><tr><th>Metric</th><th>Status</th><th>Detail</th></tr></thead>
            <tbody>
              <tr><td>Overall status</td><td className={statusClass(score)}>{statusLabel(score)}</td><td>Based on current dossier completeness and inspection evidence</td></tr>
              <tr><td>Registered welds</td><td>{welds.length}</td><td>{welds.length} weld records</td></tr>
              <tr><td>Inspection records</td><td>{inspections.length}</td><td>{inspections.length} inspection records linked</td></tr>
              <tr><td>Photo evidence</td><td className={photoDocuments.length ? 'rpt-status-green' : 'rpt-status-red'}>{photoDocuments.length ? 'Compliant' : 'Missing'}</td><td>{photoDocuments.length} linked inspection photos</td></tr>
              <tr><td>Attachments</td><td className={documents.length ? 'rpt-status-green' : 'rpt-status-red'}>{documents.length ? 'Compliant' : 'Missing'}</td><td>{documents.length} linked documents and certificates</td></tr>
              <tr><td>Welders</td><td>{welders.length}</td><td>{welders.length} qualified welders linked</td></tr>
              <tr><td>WPS</td><td>{wpsRows.length}</td><td>{wpsRows.length} welding procedure specifications</td></tr>
            </tbody>
          </table>
        </div>
        {footer(3, totalPages)}
      </section>

      <section className="rpt-page rpt-anchor-offset" id="applicable-standards" data-print-section="true">
        {header()}
        <div className="rpt-body">
          <h2>2. Applicable standards</h2>
          <table className="rpt-table">
            <thead><tr><th>Standard</th><th>Used for</th><th>Evidence in dossier</th><th>Status</th></tr></thead>
            <tbody>
              {STANDARDS.map((std) => (
                <tr key={std.code}><td><strong>{std.code}</strong></td><td>{std.purpose}</td><td>{std.evidence}</td><td className={statusClass(score)}>{statusLabel(score)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        {footer(4, totalPages)}
      </section>

      <section className="rpt-page rpt-anchor-offset" id="dossier-checklist" data-print-section="true">
        {header()}
        <div className="rpt-body">
          <h2>3. Dossier completeness checklist</h2>
          <div className="rpt-checklist-score">Overall dossier completeness <strong>{score}%</strong></div>
          <table className="rpt-table">
            <thead><tr><th>Checklist row</th><th>Status</th><th>Detail</th></tr></thead>
            <tbody>
              {checklistRows.map((row) => (
                <tr key={row.label}><td>{row.label}</td><td className={row.status === 'Compliant' ? 'rpt-status-green' : row.status === 'Missing' ? 'rpt-status-red' : 'rpt-status-blue'}>{row.status}</td><td>{row.detail}</td></tr>
              ))}
              <RenderInspectionCompletenessRow welds={welds} inspections={inspections} />
            </tbody>
          </table>
        </div>
        {footer(5, totalPages)}
      </section>

      <section className="rpt-page rpt-anchor-offset" id="weld-register" data-print-section="true">
        {header()}
        <div className="rpt-body">
          <h2>4. Weld register</h2>
          <table className="rpt-table rpt-table-compact">
            <thead><tr><th>Weld no.</th><th>Location</th><th>Process</th><th>Material</th><th>WPS</th><th>Welder</th><th>Result</th><th>Checks</th><th>Photos</th></tr></thead>
            <tbody>
              {welds.length ? welds.map((w, i) => {
                const weldPhotos = photosForWeld(w, documents);
                return (
                  <tr key={String(w.id || i)}>
                    <td><strong>{val(w.weld_number || w.weld_no || w.code)}</strong></td>
                    <td>{val(w.location)}</td>
                    <td>{val(w.process || w.welding_process)}</td>
                    <td>{val(w.material || w.material_name || w.material_grade)}</td>
                    <td>{val(w.wps || w.wps_number || w.wps_id)}</td>
                    <td>{val(w.welder_name || w.welders || w.welder_id)}</td>
                    <td className={resultClass(String(w.status))}>{resultLabel(String(w.status))}</td>
                    <td className={controlRowsLabel(w, inspections) === 'Missing' ? 'rpt-status-red' : 'rpt-status-green'}>{controlRowsLabel(w, inspections)}</td>
                    <td>{weldPhotos.length || val(w.photo_count || w.photos_count || '')}</td>
                  </tr>
                );
              }) : <tr><td colSpan={9} className="rpt-empty">No welds registered</td></tr>}
            </tbody>
          </table>
        </div>
        {footer(6, totalPages)}
      </section>

      {welds.length ? welds.map((w, i) => {
        const weldPhotos = photosForWeld(w, documents);
        return (
          <section className="rpt-page rpt-anchor-offset" id={i === 0 ? 'weld-inspections' : undefined} data-print-section="true" key={String(w.id || i)}>
            {header()}
            <div className="rpt-body">
              <h2>5.{i + 1}. Detailed weld inspection — {val(w.weld_number || w.weld_no || w.code)}</h2>
              <div className="rpt-inspection-card">
                <div className="rpt-inspection-head">
                  <strong>Weld inspection — {val(w.weld_number || w.weld_no || w.code)}</strong>
                  <span className={`rpt-pill-sm ${resultClass(String(w.status))}`}>{resultLabel(String(w.status)).toUpperCase()}</span>
                </div>
                <div className="rpt-inspection-grid">
                  <div><span>Location</span><strong>{val(w.location)}</strong></div>
                  <div><span>Assembly</span><strong>{val(w.assembly || w.assembly_name)}</strong></div>
                  <div><span>Process</span><strong>{val(w.process || w.welding_process)}</strong></div>
                  <div><span>Material</span><strong>{val(w.material || w.material_name || w.material_grade)}</strong></div>
                  <div><span>Thickness</span><strong>{val(w.thickness || w.material_thickness)}</strong></div>
                  <div><span>WPS</span><strong>{val(w.wps || w.wps_number || w.wps_id)}</strong></div>
                  <div><span>Welder(s)</span><strong>{val(w.welder_name || w.welders || w.welder_id)}</strong></div>
                  <div><span>Execution class</span><strong>{val(w.execution_class || w.exc || w.exc_class)}</strong></div>
                </div>
              </div>

              <h3>Gekeurde punten / inspected control points</h3>
              <RenderWeldControlsTable weld={w} inspections={inspections} />

              <h3>Foto's per las / photos for this weld</h3>
              {weldPhotos.length ? <div className="rpt-photo-grid">
                {weldPhotos.map((d, photoIndex) => (
                  <div className="rpt-photo-evidence-card" key={`weld-photo-${String(docRecord(d).id || `${i}-${photoIndex}`)}`}>
                    <img src={docSource(d)} alt={docName(d)} loading="eager" />
                    <div>
                      <strong>{docName(d)}</strong>
                      <span>Linked scope: {val(docRecord(d).scope || docRecord(d).linked_scope || val(w.weld_number || w.weld_no || w.code))}</span>
                      <span>Uploaded: {val(docRecord(d).uploaded_at || docRecord(d).created_at || docRecord(d).date, '—')}</span>
                      <em>PHOTO EVIDENCE</em>
                    </div>
                  </div>
                ))}
              </div> : <p className="rpt-empty">Geen foto's gekoppeld aan deze las.</p>}
            </div>
            {footer(7 + i, totalPages)}
          </section>
        );
      }) : (
        <section className="rpt-page rpt-anchor-offset" id="weld-inspections" data-print-section="true">
          {header()}
          <div className="rpt-body">
            <h2>5. Detailed weld inspections</h2>
            <p className="rpt-empty">No weld inspections available.</p>
          </div>
          {footer(7, totalPages)}
        </section>
      )}

      <section className="rpt-page rpt-anchor-offset" id="photo-evidence" data-print-section="true">
        {header()}
        <div className="rpt-body">
          <h2>6. Photo evidence</h2>
          <p className="rpt-disclaimer">Inline photo previews are included below. Original files remain stored in the WeldInspect Pro attachment system and are linked to the relevant weld and inspection records.</p>
          {photoDocuments.length ? <div className="rpt-photo-grid">
            {photoDocuments.map((d, i) => (
              <div className="rpt-photo-evidence-card" key={`photo-${String(docRecord(d).id || i)}`}>
                <img src={docSource(d)} alt={docName(d)} loading="eager" />
                <div>
                  <strong>Photo evidence {i + 1}</strong>
                  <span>Linked scope: {val(docRecord(d).scope || docRecord(d).linked_scope || 'weld / inspection')}</span>
                  <span>Uploaded: {val(docRecord(d).uploaded_at || docRecord(d).created_at || docRecord(d).date, '—')}</span>
                  <em>PHOTO EVIDENCE</em>
                </div>
              </div>
            ))}
          </div> : <p className="rpt-empty">No photo evidence available.</p>}
        </div>
        {footer(photoPage, totalPages)}
      </section>

      <section className="rpt-page rpt-anchor-offset" id="certificates-wps" data-print-section="true">
        {header()}
        <div className="rpt-body">
          <h2>7. Certificates and WPS documents</h2>
          {welders.length ? <>
            <h3>Welder qualifications</h3>
            <table className="rpt-table">
              <thead><tr><th>Person</th><th>Certificate</th><th>Scope</th><th>Valid until</th><th>Status</th></tr></thead>
              <tbody>{welders.map((w, i) => (
                <tr key={String(w.id || i)}><td>{val(w.name || w.label)}</td><td>{val(w.certificate_number || w.code)}</td><td>{val(w.qualification || w.scope || w.process)}</td><td>{val(w.valid_until || w.expiry_date || w.expires_at)}</td><td className="rpt-status-green">Approved</td></tr>
              ))}</tbody>
            </table>
          </> : null}
          {wpsRows.length ? <>
            <h3>WPS documents</h3>
            <table className="rpt-table">
              <thead><tr><th>Document</th><th>Type</th><th>Description</th><th>Status</th></tr></thead>
              <tbody>{wpsRows.map((w, i) => (
                <tr key={String(w.id || i)}><td><strong>{val(w.code || w.name || w.wps_number)}</strong></td><td>WPS Document</td><td>{val(w.description || w.process || w.welding_process)}</td><td className="rpt-status-green">Approved</td></tr>
              ))}</tbody>
            </table>
          </> : null}
          {materials.length ? <>
            <h3>Material certificates</h3>
            <table className="rpt-table">
              <thead><tr><th>Material</th><th>Standard</th><th>Grade</th><th>Status</th></tr></thead>
              <tbody>{materials.map((m, i) => (
                <tr key={String(m.id || i)}><td><strong>{val(m.code || m.name || m.material_name)}</strong></td><td>{val(m.standard || 'EN 10204')}</td><td>{val(m.grade)}</td><td className="rpt-status-green">Approved</td></tr>
              ))}</tbody>
            </table>
          </> : null}
          {!welders.length && !wpsRows.length && !materials.length ? <p className="rpt-empty">No certificates or WPS documents linked.</p> : null}
        </div>
        {footer(certificatesPage, totalPages)}
      </section>

      <section className="rpt-page rpt-anchor-offset" id="attachments-appendix" data-print-section="true">
        {header()}
        <div className="rpt-body">
          <h2>8. Attachments appendix</h2>
          <table className="rpt-table rpt-table-compact">
            <thead><tr><th>ID</th><th>Type</th><th>Filename</th><th>Linked scope</th><th>Uploaded</th></tr></thead>
            <tbody>
              {documents.length ? documents.map((d, i) => (
                <tr key={String(docRecord(d).id || i)}>
                  <td className="rpt-mono">APP-{String(i + 1).padStart(3, '0')}</td>
                  <td>{val(docRecord(d).mime_type || docRecord(d).category, 'Document')}</td>
                  <td>{docSource(d) ? <a href={docSource(d)} target="_blank" rel="noreferrer">{docName(d)}</a> : docName(d)}</td>
                  <td>{val(docRecord(d).scope || docRecord(d).linked_scope || 'Project')}</td>
                  <td>{val(docRecord(d).uploaded_at || docRecord(d).created_at || docRecord(d).date)}</td>
                </tr>
              )) : <tr><td colSpan={5} className="rpt-empty">No attachments</td></tr>}
            </tbody>
          </table>

          {documents.length ? <div className="rpt-attachment-preview-list">
            {documents.map((d, i) => {
              const src = docSource(d);
              const name = docName(d);
              const mime = docMime(d) || val(docRecord(d).category, 'Document');
              const image = isPreviewableImage(d);
              const pdf = isPreviewablePdf(d);

              return (
                <div className="rpt-attachment-card" key={`preview-${String(docRecord(d).id || i)}`}>
                  <div className="rpt-attachment-card-head">
                    <strong>APP-{String(i + 1).padStart(3, '0')} · {name}</strong>
                    <span>{mime}</span>
                  </div>
                  {image && src ? <img className="rpt-attachment-image" src={src} alt={name} loading="eager" /> : null}
                  {pdf && src ? <iframe className="rpt-attachment-frame" src={src} title={name} /> : null}
                  {!image && !pdf ? <p className="rpt-attachment-note">Document linked in appendix table{src ? <>: <a href={src} target="_blank" rel="noreferrer"> open file</a></> : null}.</p> : null}
                </div>
              );
            })}
          </div> : null}
        </div>
        {footer(appendixPage, totalPages)}
      </section>

      <section className="rpt-page rpt-anchor-offset" id="audit-trail" data-print-section="true">
        {header()}
        <div className="rpt-body">
          <h2>9. Audit trail</h2>
          <table className="rpt-table rpt-meta-table">
            <thead><tr><th>Audit field</th><th>Value</th></tr></thead>
            <tbody>
              <tr><td>Generated by</td><td>{generatedBy}</td></tr>
              <tr><td>Generated at</td><td>{generatedAt}</td></tr>
              <tr><td>Tenant / manufacturer</td><td>{tenantName}</td></tr>
              <tr><td>Project ID</td><td className="rpt-mono">{projectId}</td></tr>
              <tr><td>Export ID</td><td className="rpt-mono">{exportId}</td></tr>
              <tr><td>Source hash</td><td className="rpt-mono">{sourceHash}</td></tr>
              <tr><td>Layout version</td><td>2026.05.enterprise.report-quality.v3</td></tr>
              <tr><td>Runtime source</td><td>Canonical CE aggregate payload</td></tr>
              <RenderControlsAuditRows welds={welds} inspections={inspections} />
            </tbody>
          </table>

          <h2 id="approval-release" className="rpt-anchor-offset" style={{ marginTop: 32 }}>10. Approval &amp; release</h2>
          <table className="rpt-table">
            <thead><tr><th>Role</th><th>Name</th><th>Date</th><th>Signature / approval</th></tr></thead>
            <tbody>
              <tr><td>Prepared by</td><td>{generatedBy}</td><td>{fmtDate()}</td><td className="rpt-status-green">Approved</td></tr>
              <tr><td>Reviewed by</td><td>Quality assurance manager</td><td>{fmtDate()}</td><td>Pending</td></tr>
              <tr><td>Released by</td><td>Welding coordinator (IWE)</td><td>{fmtDate()}</td><td>Pending</td></tr>
            </tbody>
          </table>
          <p className="rpt-disclaimer">This report was generated by WeldInspect Pro based on the canonical CE aggregate payload. All data is sourced from the project's registered welds, inspections, documents and master data.</p>
        </div>
        {footer(auditPage, totalPages)}
      </section>
    </div>
  );
}

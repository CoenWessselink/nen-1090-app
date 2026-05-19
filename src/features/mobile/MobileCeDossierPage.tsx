import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronRight, ClipboardCheck, Download, FileText, FolderOpen, HardHat,
  Layers3, RefreshCcw, ShieldCheck, Users, Wrench,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchCeAggregate, type CeAggregateResponse } from '@/api/ceAggregateApi';
import { getProject } from '@/api/projects';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import {
  formatValue, normalizeApiError,
  normalizeChecklist, projectClient, projectCode, projectExecutionClass, projectTitle, summarizeChecklist,
} from '@/features/mobile/mobile-utils';
import { dossierPayloadFromAggregate, attachmentsAsCeDocuments } from '@/utils/ceAggregateView';
import type { CeDocument, Project } from '@/types/domain';
import './ce-dossier-page.css';

type SectionKey = 'welds' | 'inspections' | 'documents' | 'welders' | 'materials' | 'wps';
type R = Record<string, unknown>;

function val(v: unknown, fallback = '—') {
  if (v === null || v === undefined || v === '') return fallback;
  return String(v);
}

function numberValue(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const parsed = Number(v);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function nestedRecord(source: R | null | undefined, key: string): R | null {
  const value = source?.[key];
  return value && typeof value === 'object' && !Array.isArray(value) ? value as R : null;
}

function countFromAggregate(
  aggregate: CeAggregateResponse | null,
  payload: R | null,
  arrayKey: keyof Pick<CeAggregateResponse, 'welds' | 'inspections' | 'materials' | 'wps' | 'welders' | 'attachments'>,
  keys: string[],
): number {
  const aggregateArray = aggregate?.[arrayKey];
  if (Array.isArray(aggregateArray)) return aggregateArray.length;

  const sources: Array<R | null | undefined> = [
    aggregate?.completeness as R | undefined,
    nestedRecord(aggregate?.completeness as R | undefined, 'counts'),
    nestedRecord(aggregate?.completeness as R | undefined, 'summary'),
    aggregate?.status as R | undefined,
    nestedRecord(aggregate?.status as R | undefined, 'counts'),
    payload,
    nestedRecord(payload, 'counts'),
  ];

  for (const source of sources) {
    if (!source) continue;
    for (const key of keys) {
      const value = numberValue(source[key]);
      if (value !== null) return Math.max(0, Math.round(value));
    }
  }

  return 0;
}

function complianceScoreFromAggregate(aggregate: CeAggregateResponse | null, payload: R | null, checklistScore: number): number {
  const completeness = aggregate?.completeness as R | undefined;
  const status = aggregate?.status as R | undefined;
  const candidates = [
    completeness?.score,
    completeness?.percentage,
    completeness?.percent,
    completeness?.completion_percentage,
    completeness?.compliance_percentage,
    status?.score,
    status?.percentage,
    status?.percent,
    status?.compliance_percentage,
    payload?.score,
    payload?.percentage,
    checklistScore,
  ];

  for (const candidate of candidates) {
    const value = numberValue(candidate);
    if (value !== null) return Math.max(0, Math.min(100, Math.round(value)));
  }

  return 0;
}

function complianceStatusFromAggregate(aggregate: CeAggregateResponse | null, payload: R | null, score: number): string {
  const completeness = aggregate?.completeness as R | undefined;
  const status = aggregate?.status as R | undefined;
  const candidates = [
    status?.label,
    status?.summary,
    status?.status,
    status?.state,
    completeness?.label,
    completeness?.summary,
    completeness?.status,
    completeness?.state,
    payload?.status,
  ];

  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined && String(candidate).trim() !== '') {
      return formatValue(candidate, 'In behandeling');
    }
  }

  if (score >= 95) return 'Compliant';
  if (score >= 80) return 'In control';
  return 'In behandeling';
}

function reportUrl(projectId: string) {
  return `/projecten/${projectId}/ce-report`;
}

export function MobileCeDossierPage() {
  const navigate = useNavigate();
  const { projectId = '' } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [aggregate, setAggregate] = useState<CeAggregateResponse | null>(null);
  const [payload, setPayload] = useState<R | null>(null);
  const [documents, setDocuments] = useState<CeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<SectionKey | null>(null);

  const loadAll = useCallback(async () => {
    const [agg, proj] = await Promise.all([
      fetchCeAggregate(projectId),
      getProject(projectId).catch(() => null),
    ]);
    setAggregate(agg);
    setPayload(dossierPayloadFromAggregate(agg));
    setDocuments(attachmentsAsCeDocuments((agg.attachments || []) as R[]));
    setProject(proj || null);
  }, [projectId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadAll()
      .then(() => { if (active) setError(null); })
      .catch((err) => { if (active) setError(normalizeApiError(err, 'CE-dossier kon niet worden geladen.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadAll]);

  const checklist = useMemo(() => normalizeChecklist(payload?.checklist), [payload]);
  const summary = useMemo(() => summarizeChecklist(checklist), [checklist]);
  const checklistScore = summary.total ? Math.round((summary.complete / summary.total) * 100) : 0;
  const score = useMemo(
    () => complianceScoreFromAggregate(aggregate, payload, checklistScore),
    [aggregate, payload, checklistScore],
  );
  const status = useMemo(
    () => complianceStatusFromAggregate(aggregate, payload, score),
    [aggregate, payload, score],
  );

  const welds = useMemo(() => (aggregate?.welds || []) as R[], [aggregate]);
  const inspections = useMemo(() => (aggregate?.inspections || []) as R[], [aggregate]);
  const materials = useMemo(() => (aggregate?.materials || []) as R[], [aggregate]);
  const wpsRows = useMemo(() => (aggregate?.wps || []) as R[], [aggregate]);
  const welders = useMemo(() => (aggregate?.welders || []) as R[], [aggregate]);

  const weldCount = useMemo(
    () => countFromAggregate(aggregate, payload, 'welds', ['welds', 'weld_count', 'welds_count', 'total_welds']),
    [aggregate, payload],
  );
  const inspectionCount = useMemo(
    () => countFromAggregate(aggregate, payload, 'inspections', ['inspections', 'inspection_count', 'inspections_count', 'total_inspections']),
    [aggregate, payload],
  );
  const documentCount = useMemo(
    () => countFromAggregate(aggregate, payload, 'attachments', ['documents', 'document_count', 'documents_count', 'attachments', 'attachment_count', 'attachments_count']),
    [aggregate, payload],
  );
  const welderCount = useMemo(
    () => countFromAggregate(aggregate, payload, 'welders', ['welders', 'welder_count', 'welders_count', 'qualified_welders', 'qualified_welders_count']),
    [aggregate, payload],
  );
  const materialCount = useMemo(
    () => countFromAggregate(aggregate, payload, 'materials', ['materials', 'material_count', 'materials_count', 'linked_materials', 'linked_materials_count']),
    [aggregate, payload],
  );
  const wpsCount = useMemo(
    () => countFromAggregate(aggregate, payload, 'wps', ['wps', 'wps_count', 'wpqr', 'wpqr_count', 'wps_wpqr_count', 'linked_wps', 'linked_wps_count']),
    [aggregate, payload],
  );

  function toggleSection(key: SectionKey) {
    setExpandedSection((current) => current === key ? null : key);
  }

  function navigateTo(path: string) { navigate(path); }

  function openCorrectCeReport() {
    window.open(reportUrl(projectId), '_blank', 'noopener,noreferrer');
  }

  const sections: Array<{
    key: SectionKey;
    label: string;
    icon: typeof Wrench;
    count: number;
    tone: string;
    items: R[];
    nameKey: string;
    detailKey: string;
    navPath: string;
  }> = [
    { key: 'welds', label: 'Lassen', icon: Wrench, count: weldCount, tone: weldCount ? 'success' : 'warning', items: welds, nameKey: 'weld_number|weld_no|code', detailKey: 'location|status', navPath: `/projecten/${projectId}/lassen` },
    { key: 'inspections', label: 'Inspecties', icon: ClipboardCheck, count: inspectionCount, tone: inspectionCount ? 'success' : 'warning', items: inspections, nameKey: 'method|title|result', detailKey: 'status|result', navPath: `/projecten/${projectId}/lassen` },
    { key: 'documents', label: 'Documenten', icon: FolderOpen, count: documentCount, tone: documentCount ? 'success' : 'warning', items: documents as unknown as R[], nameKey: 'filename|title|name|uploaded_filename', detailKey: 'mime_type|type|category', navPath: `/projecten/${projectId}/documenten` },
    { key: 'welders', label: 'Lassers', icon: Users, count: welderCount, tone: welderCount ? 'success' : 'warning', items: welders, nameKey: 'name|label|code', detailKey: 'qualification|certificate_number|status', navPath: `/projecten/${projectId}/overzicht` },
    { key: 'materials', label: 'Materialen', icon: Layers3, count: materialCount, tone: materialCount ? 'success' : 'warning', items: materials, nameKey: 'name|label|code|material_name', detailKey: 'grade|standard|certificate_number', navPath: `/projecten/${projectId}/overzicht` },
    { key: 'wps', label: 'WPS / WPQR', icon: FileText, count: wpsCount, tone: wpsCount ? 'success' : 'warning', items: wpsRows, nameKey: 'name|label|code|wps_number', detailKey: 'process|status|welding_process', navPath: `/projecten/${projectId}/overzicht` },
  ];

  function resolveField(item: R, keyExpr: string) {
    for (const k of keyExpr.split('|')) {
      const v = item[k];
      if (v !== null && v !== undefined && v !== '') return String(v);
    }
    return '—';
  }

  return (
    <MobilePageScaffold title="CE-Dossier" subtitle="Compleet projectoverzicht" backTo={`/projecten/${projectId}/overzicht`}>
      {loading ? <div className="mobile-state-card">CE-dossier laden…</div> : null}
      {error ? <div className="mobile-inline-alert is-error">{error}</div> : null}
      {success ? <div className="mobile-inline-alert is-success">{success}</div> : null}

      {!loading && (
        <div className="ce-overview">

          {/* ── Project header ── */}
          <section className="ce-project-header" onClick={() => navigateTo(`/projecten/${projectId}/bewerken`)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigateTo(`/projecten/${projectId}/bewerken`)}>
            <div className="ce-project-meta">
              <div className="ce-project-title-row">
                <HardHat size={20} />
                <h2>{project ? projectTitle(project) : 'Project'}</h2>
                <ChevronRight size={16} className="ce-chevron" />
              </div>
              <div className="ce-project-fields">
                <div><span>Projectnummer</span><strong>{project ? projectCode(project) : '—'}</strong></div>
                <div><span>Opdrachtgever</span><strong>{project ? projectClient(project) : '—'}</strong></div>
                <div><span>EXC-klasse</span><strong>{project ? projectExecutionClass(project) : '—'}</strong></div>
                <div><span>Status</span><strong>{val(project?.status)}</strong></div>
              </div>
            </div>
          </section>

          {/* ── Compliance score ── */}
          <section className="ce-score-card">
            <div className="ce-score-top">
              <ShieldCheck size={20} />
              <div>
                <strong>CE Compliance</strong>
                <span className={`ce-status-label ce-tone-${score >= 80 ? 'success' : score >= 50 ? 'warning' : 'danger'}`}>{status}</span>
              </div>
              <div className="ce-score-value">{score}%</div>
            </div>
            <div className="ce-progress-bar"><span style={{ width: `${Math.max(score, 4)}%` }} /></div>
            <div className="ce-score-stats">
              <div><span>Compleet</span><strong>{summary.complete}</strong></div>
              <div><span>Vereist</span><strong>{summary.required}</strong></div>
              <div><span>Ontbreekt</span><strong>{summary.missing}</strong></div>
              <div><span>Totaal</span><strong>{summary.total}</strong></div>
            </div>
          </section>

          {/* ── Section cards ── */}
          <div className="ce-sections-grid">
            {sections.map((sec) => {
              const Icon = sec.icon;
              const isExpanded = expandedSection === sec.key;
              return (
                <section key={sec.key} className={`ce-section-card${isExpanded ? ' is-expanded' : ''}`}>
                  <button type="button" className="ce-section-header" onClick={() => toggleSection(sec.key)}>
                    <Icon size={18} />
                    <span className="ce-section-label">{sec.label}</span>
                    <span className={`ce-section-count ce-tone-${sec.tone}`}>{sec.count}</span>
                    <ChevronRight size={16} className={`ce-chevron${isExpanded ? ' is-rotated' : ''}`} />
                  </button>

                  {isExpanded && (
                    <div className="ce-section-body">
                      {sec.items.length === 0 ? (
                        <div className="ce-empty">Geen {sec.label.toLowerCase()} gevonden.</div>
                      ) : (
                        <div className="ce-item-list">
                          {sec.items.slice(0, 10).map((item, idx) => (
                            <div key={String(item.id || idx)} className="ce-item-row">
                              <div>
                                <strong>{resolveField(item, sec.nameKey)}</strong>
                                <span>{resolveField(item, sec.detailKey)}</span>
                              </div>
                            </div>
                          ))}
                          {sec.items.length > 10 && (
                            <div className="ce-item-more">+{sec.items.length - 10} meer</div>
                          )}
                        </div>
                      )}
                      <button type="button" className="ce-section-nav-btn" onClick={() => navigateTo(sec.navPath)}>
                        Alles bekijken <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          {/* ── Export actions ── */}
          <section className="ce-export-card">
            <div className="ce-export-header">
              <Download size={18} />
              <strong>Export &amp; PDF</strong>
            </div>
            <div className="ce-export-actions">
              <button type="button" className="mobile-primary-button" onClick={openCorrectCeReport}>
                <FileText size={16} /> CE-rapport genereren
              </button>
              <button type="button" className="mobile-secondary-button" onClick={openCorrectCeReport}>
                <Download size={16} /> Download PDF (rapport)
              </button>
            </div>
          </section>

          {/* ── Refresh ── */}
          <button type="button" className="mobile-link-button" onClick={() => { setLoading(true); setSuccess(null); loadAll().finally(() => setLoading(false)); }}>
            <RefreshCcw size={14} /> Vernieuw dossierstatus
          </button>

        </div>
      )}
    </MobilePageScaffold>
  );
}

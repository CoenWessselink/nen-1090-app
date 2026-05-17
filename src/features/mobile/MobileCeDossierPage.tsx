import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronRight, ClipboardCheck, Download, FileText, FolderOpen, HardHat,
  Layers3, RefreshCcw, ShieldCheck, Users, Wrench,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { createPdfExport } from '@/api/ce';
import { fetchCeAggregate, type CeAggregateResponse } from '@/api/ceAggregateApi';
import { getProject } from '@/api/projects';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { CeNormChecksPanel } from '@/features/ce-dossier/CeNormChecksPanel';
import { openDownloadUrl } from '@/utils/download';
import {
  buildCeDossierFilename, formatValue, normalizeApiError,
  normalizeChecklist, projectClient, projectCode, projectExecutionClass, projectTitle, summarizeChecklist,
} from '@/features/mobile/mobile-utils';
import { dossierPayloadFromAggregate, attachmentsAsCeDocuments } from '@/utils/ceAggregateView';
import type { CeDocument, Project } from '@/types/domain';
import './ce-dossier-page.css';

type SectionKey = 'welds' | 'inspections' | 'documents' | 'welders' | 'materials' | 'wps';

function val(v: unknown, fallback = '—') {
  if (v === null || v === undefined || v === '') return fallback;
  return String(v);
}

export function MobileCeDossierPage() {
  const navigate = useNavigate();
  const { projectId = '' } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [aggregate, setAggregate] = useState<CeAggregateResponse | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [documents, setDocuments] = useState<CeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
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
    setDocuments(attachmentsAsCeDocuments((agg.attachments || []) as Record<string, unknown>[]));
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
  const score = Math.max(0, Math.min(100, Number(payload?.score || (summary.total ? Math.round((summary.complete / summary.total) * 100) : 0))));
  const status = formatValue(payload?.status, score >= 80 ? 'Voldoende' : 'In behandeling');

  const welds = useMemo(() => (aggregate?.welds || []) as Record<string, unknown>[], [aggregate]);
  const inspections = useMemo(() => (aggregate?.inspections || []) as Record<string, unknown>[], [aggregate]);
  const materials = useMemo(() => (aggregate?.materials || []) as Record<string, unknown>[], [aggregate]);
  const wpsRows = useMemo(() => (aggregate?.wps || []) as Record<string, unknown>[], [aggregate]);
  const welders = useMemo(() => (aggregate?.welders || []) as Record<string, unknown>[], [aggregate]);

  async function handleExportPdf() {
    try {
      setExporting(true); setError(null); setSuccess(null);
      await createPdfExport(projectId);
      const forceUrl = `/projects/${projectId}/exports/compliance/pdf?download=true&force=true&_=${Date.now()}`;
      await openDownloadUrl(forceUrl, buildCeDossierFilename(payload));
      setSuccess('PDF is aangemaakt en wordt gedownload.');
    } catch (err) { setError(normalizeApiError(err, 'PDF kon niet worden aangemaakt.')); }
    finally { setExporting(false); }
  }

  function toggleSection(key: SectionKey) {
    setExpandedSection((current) => current === key ? null : key);
  }

  function navigateTo(path: string) { navigate(path); }

  const sections: Array<{
    key: SectionKey;
    label: string;
    icon: typeof Wrench;
    count: number;
    tone: string;
    items: Record<string, unknown>[];
    nameKey: string;
    detailKey: string;
    navPath: string;
  }> = [
    { key: 'welds', label: 'Lassen', icon: Wrench, count: welds.length, tone: welds.length ? 'success' : 'warning', items: welds, nameKey: 'weld_number|weld_no|code', detailKey: 'location|status', navPath: `/projecten/${projectId}/lassen` },
    { key: 'inspections', label: 'Inspecties', icon: ClipboardCheck, count: inspections.length, tone: inspections.length ? 'success' : 'warning', items: inspections, nameKey: 'method|title|result', detailKey: 'status|result', navPath: `/projecten/${projectId}/lassen` },
    { key: 'documents', label: 'Documenten', icon: FolderOpen, count: documents.length, tone: documents.length ? 'success' : 'warning', items: documents as unknown as Record<string, unknown>[], nameKey: 'filename|title|name|uploaded_filename', detailKey: 'mime_type|type|category', navPath: `/projecten/${projectId}/documenten` },
    { key: 'welders', label: 'Lassers', icon: Users, count: welders.length, tone: welders.length ? 'success' : 'warning', items: welders, nameKey: 'name|label|code', detailKey: 'qualification|certificate_number|status', navPath: `/projecten/${projectId}/overzicht` },
    { key: 'materials', label: 'Materialen', icon: Layers3, count: materials.length, tone: materials.length ? 'success' : 'warning', items: materials, nameKey: 'name|label|code|material_name', detailKey: 'grade|standard|certificate_number', navPath: `/projecten/${projectId}/overzicht` },
    { key: 'wps', label: 'WPS / WPQR', icon: FileText, count: wpsRows.length, tone: wpsRows.length ? 'success' : 'warning', items: wpsRows, nameKey: 'name|label|code|wps_number', detailKey: 'process|status|welding_process', navPath: `/projecten/${projectId}/overzicht` },
  ];

  function resolveField(item: Record<string, unknown>, keyExpr: string) {
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

          {/* ── Normchecks ── */}
          <CeNormChecksPanel projectId={projectId} />

          {/* ── Export actions ── */}
          <section className="ce-export-card">
            <div className="ce-export-header">
              <Download size={18} />
              <strong>Export &amp; PDF</strong>
            </div>
            <div className="ce-export-actions">
              <button type="button" className="mobile-primary-button" disabled={exporting} onClick={handleExportPdf}>
                <FileText size={16} /> {exporting ? 'Bezig…' : 'CE-dossier PDF'}
              </button>
              <button type="button" className="mobile-secondary-button" onClick={() => navigateTo(`/projecten/${projectId}/pdf-viewer`)}>
                <FileText size={16} /> Open PDF viewer
              </button>
              <button type="button" className="mobile-secondary-button" onClick={() => navigateTo(`/projecten/${projectId}/ce-report`)}>
                <FileText size={16} /> Rapport preview
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

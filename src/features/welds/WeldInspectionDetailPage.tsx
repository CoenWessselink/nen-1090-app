import { useEffect, useMemo, useState, type CSSProperties, type ReactElement } from 'react';
import { ArrowLeft, CalendarDays, CheckCircle2, ClipboardList, Eye, MapPin, MinusCircle, Save, ShieldCheck, XCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getWeldInspection, saveWeldInspection, type InspectionTemplateItem, type InspectionTemplateSection, type WeldInspectionRun } from '@/api/norms';
import { getProject } from '@/api/projects';
import { getWeld } from '@/api/welds';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { dispatchAppRefresh, normalizeApiError } from '@/features/mobile/mobile-utils';
import type { Project, Weld } from '@/types/domain';

const STATUS_CHOICES = [
  { key: 'conform', label: 'Compliant', icon: CheckCircle2, tone: '#16a34a', soft: '#ecfdf5', faint: '#f3fbf7' },
  { key: 'in_control', label: 'In control', icon: ShieldCheck, tone: '#2563eb', soft: '#eff6ff', faint: '#f7fbff' },
  { key: 'not_conform', label: 'Non-compliant', icon: XCircle, tone: '#dc2626', soft: '#fef2f2', faint: '#fff7f7' },
];

function itemKey(section: InspectionTemplateSection, item: InspectionTemplateItem) {
  return `${section.code}:${item.code}`;
}

function pretty(value?: string) {
  if (value === 'conform') return 'Compliant';
  if (value === 'not_conform' || value === 'repair_required' || value === 'defect') return 'Non-compliant';
  if (value === 'not_applicable') return 'N/A';
  return 'In control';
}

function statusClass(value?: string) {
  if (value === 'conform') return 'is-conform';
  if (value === 'not_conform' || value === 'repair_required' || value === 'defect') return 'is-nonconform';
  return 'is-control';
}

function toneFor(value?: string) {
  if (value === 'conform') return '#16a34a';
  if (value === 'not_conform' || value === 'repair_required' || value === 'defect') return '#dc2626';
  return '#2563eb';
}

function softFor(value?: string) {
  if (value === 'conform') return '#ecfdf5';
  if (value === 'not_conform' || value === 'repair_required' || value === 'defect') return '#fef2f2';
  return '#eff6ff';
}

function normalizeInspectionResult(value?: string) {
  const raw = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (raw === 'not_conform' || raw === 'non_conform' || raw === 'defect' || raw === 'rejected' || raw === 'repair_required') return 'not_conform';
  if (raw === 'conform' || raw === 'compliant' || raw === 'ok' || raw === 'approved') return 'conform';
  if (raw === 'not_applicable' || raw === 'na' || raw === 'n_a') return 'not_applicable';
  return 'in_control';
}

function calcOverall(items: InspectionTemplateItem[]) {
  if (items.some((item) => ['not_conform', 'repair_required', 'defect'].includes(normalizeInspectionResult(String(item.result || ''))))) return 'not_conform';
  if (items.length && items.every((item) => ['conform', 'not_applicable'].includes(normalizeInspectionResult(String(item.result || ''))))) return 'conform';
  return 'in_control';
}

function normText(item: InspectionTemplateItem) {
  return item.norm_reference || item.norm_code || 'No norm linked';
}

function weldDisplayName(weld: Weld | null, fallback = 'Weld without number') {
  const record = weld as any;
  const raw = String(record?.weld_no || record?.weld_number || record?.number || record?.display_name || '').trim();
  if (raw && raw.toLowerCase() !== 'null' && raw.toLowerCase() !== 'none') return raw;
  const location = String(record?.location || '').trim();
  if (location && location !== '-' && location !== '—') return `Weld without number · ${location}`;
  return fallback;
}

function formatProjectName(project: Project | null, fallback: string) {
  const name = String(project?.name || (project as any)?.project_name || '').trim();
  return name || fallback;
}

function formatWeldLocation(weld: Weld | null) {
  const record = weld as any;
  const location = String(record?.location || record?.zone || record?.positie || '').trim();
  return location || '—';
}

function todayLabel() {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());
}

const s: Record<string, CSSProperties> = {
  shell: { display: 'block', maxWidth: 1040, margin: '0 auto', paddingBottom: 96 },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: 10, color: '#64748b', fontSize: 14, fontWeight: 700, marginBottom: 18 },
  topTitle: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 },
  title: { margin: 0, color: '#071b45', fontSize: 'clamp(30px, 5vw, 42px)', lineHeight: 1.04, letterSpacing: '-.04em', fontWeight: 900 },
  statusPill: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 999, border: '1px solid rgba(22, 163, 74, .18)', background: '#ecfdf5', color: '#16a34a', fontWeight: 900, marginTop: 10 },
  card: { background: '#fff', border: '1px solid #dbe7f7', borderRadius: 24, boxShadow: '0 18px 44px rgba(15,23,42,.06)' },
  meta: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 0, marginBottom: 20, overflow: 'hidden' },
  metaCell: { display: 'grid', gridTemplateColumns: '32px 1fr', gap: 12, alignItems: 'start', padding: 22, borderRight: '1px solid #e4edf8', minWidth: 0 },
  metaIcon: { width: 32, height: 32, borderRadius: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#f4f8ff', color: '#46618a' },
  metaLabel: { display: 'block', color: '#64748b', fontSize: 13, fontWeight: 800, marginBottom: 5 },
  metaValue: { color: '#071b45', fontSize: 16, lineHeight: 1.25, fontWeight: 900, wordBreak: 'break-word' },
  sectionCard: { background: '#fff', border: '1px solid #dbe7f7', borderRadius: 26, boxShadow: '0 20px 54px rgba(15,23,42,.07)', padding: 24, overflow: 'hidden' },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 12 },
  sectionTitleRow: { display: 'flex', alignItems: 'center', gap: 14 },
  sectionIcon: { width: 46, height: 46, borderRadius: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#eff6ff', color: '#2563eb' },
  sectionTitle: { margin: 0, color: '#071b45', fontWeight: 950, letterSpacing: '-.02em', fontSize: 24 },
  progressText: { color: '#071b45', fontWeight: 950, fontSize: 22 },
  progressTrack: { height: 6, background: '#e6eefb', borderRadius: 999, overflow: 'hidden', margin: '16px 0 20px' },
  progressBar: { height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #2563eb, #1d4ed8)' },
  hint: { color: '#64748b', fontSize: 15, margin: '0 0 18px' },
  phase: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 },
  phaseBtn: { padding: 16, border: '1px solid #dbe7f7', borderRadius: 18, background: '#fff', textAlign: 'left', cursor: 'pointer', minWidth: 0, boxShadow: '0 12px 30px rgba(15,23,42,.045)' },
  item: { padding: 22, marginBottom: 16, border: '1px solid #dbe7f7', borderRadius: 24, background: '#fff', overflow: 'hidden', boxShadow: '0 14px 36px rgba(15,23,42,.045)' },
  itemHead: { display: 'grid', gridTemplateColumns: '44px 1fr', gap: 14, alignItems: 'start', marginBottom: 16 },
  itemIndex: { width: 38, height: 38, borderRadius: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 950, fontSize: 18 },
  itemTitle: { margin: 0, color: '#071b45', fontSize: 18, fontWeight: 950, lineHeight: 1.2 },
  itemRef: { margin: '4px 0 0', color: '#64748b', fontSize: 14, fontWeight: 700 },
  statusRow: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', border: '1px solid #bfd0e8', borderRadius: 16, overflow: 'hidden', margin: '14px 0 18px' },
  statusButton: { minHeight: 54, border: 0, borderRight: '1px solid #d3deee', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 15, fontWeight: 900, cursor: 'pointer' },
  fieldGrid: { display: 'grid', gridTemplateColumns: 'minmax(180px, 280px) minmax(280px, 1fr)', gap: 14, alignItems: 'start' },
  label: { display: 'block', color: '#60708e', fontSize: 12, fontWeight: 950, letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 8 },
  input: { width: '100%', border: '1px solid #cfe0f7', borderRadius: 16, padding: '14px 16px', fontSize: 15, background: '#fff', color: '#071b45', outline: 'none' },
  textareaWrap: { position: 'relative' },
  counter: { position: 'absolute', right: 14, bottom: 10, color: '#64748b', fontSize: 12, fontWeight: 800 },
  sticky: { position: 'sticky', bottom: 0, zIndex: 10, display: 'grid', gridTemplateColumns: 'minmax(140px, 1fr) minmax(180px, 1.2fr)', gap: 12, padding: 14, marginTop: 18, background: 'rgba(248,251,255,.94)', backdropFilter: 'blur(14px)', border: '1px solid #dbe7f7', borderRadius: 22, boxShadow: '0 -18px 50px rgba(15,23,42,.10)' },
  cancel: { minHeight: 56, borderRadius: 16, border: '1.5px solid #2563eb', background: '#fff', color: '#2563eb', fontSize: 16, fontWeight: 950, cursor: 'pointer' },
  save: { minHeight: 56, borderRadius: 16, border: 0, background: 'linear-gradient(135deg, #2563eb, #004eea)', color: '#fff', fontSize: 16, fontWeight: 950, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', boxShadow: '0 16px 34px rgba(37,99,235,.25)' },
};

export function WeldInspectionDetailPage() {
  const navigate = useNavigate();
  const { projectId = '', weldId = '' } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [weld, setWeld] = useState<Weld | null>(null);
  const [run, setRun] = useState<WeldInspectionRun | null>(null);
  const [values, setValues] = useState<Record<string, InspectionTemplateItem>>({});
  const [notes, setNotes] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getProject(projectId).catch(() => null), getWeld(projectId, weldId).catch(() => null), getWeldInspection(projectId, weldId)])
      .then(([projectRecord, weldRecord, inspection]) => {
        if (!active) return;
        setProject(projectRecord as Project | null);
        setWeld(weldRecord as Weld | null);
        setRun(inspection);
        setNotes(String(inspection.notes || ''));
        const next: Record<string, InspectionTemplateItem> = {};
        const results = Array.isArray(inspection.results) ? inspection.results : [];
        (inspection.sections || []).forEach((section) => (section.items || []).forEach((item) => {
          const match = results.find((result) => result.code === item.code || (result as any).template_item_code === item.code || (result as any).item_code === item.code);
          next[itemKey(section, item)] = { ...item, ...match, result: normalizeInspectionResult(match?.result || item.result || 'conform'), comment: match?.comment || item.comment || '' };
        }));
        setValues(next);
        setSelectedSection(inspection.sections?.[0]?.code || '');
        setError(null);
      })
      .catch((err) => { if (active) setError(normalizeApiError(err, 'The inspection could not be loaded.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId, weldId]);

  const sections = run?.sections || [];
  const activeSection = sections.find((section) => section.code === selectedSection) || sections[0];
  const allItems = useMemo(() => sections.flatMap((section) => (section.items || []).map((item) => values[itemKey(section, item)] || item)), [sections, values]);
  const overall = calcOverall(allItems);
  const activeItems = activeSection?.items || [];
  const sectionDone = activeSection ? activeItems.filter((item) => ['conform', 'not_applicable'].includes(normalizeInspectionResult(values[itemKey(activeSection, item)]?.result || item.result))).length : 0;
  const progressPct = activeItems.length ? Math.max(6, Math.round((sectionDone / activeItems.length) * 100)) : 0;

  function patch(section: InspectionTemplateSection, item: InspectionTemplateItem, next: Partial<InspectionTemplateItem>) {
    const key = itemKey(section, item);
    setValues((current) => ({ ...current, [key]: { ...(current[key] || item), ...next } }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        notes,
        status: overall,
        overall_status: overall,
        result: overall,
        results: allItems.map((item) => ({
          template_item_code: item.code,
          item_code: item.code,
          code: item.code,
          section_code: (item as any).section_code,
          result: normalizeInspectionResult(item.result || 'conform'),
          status: normalizeInspectionResult(item.result || 'conform'),
          measured_value: item.measured_value || '',
          comment: item.comment || '',
          remark: item.comment || '',
          norm_code: item.norm_code,
          norm_reference: item.norm_reference,
          label: item.label,
          approved: !['not_conform', 'repair_required', 'defect'].includes(normalizeInspectionResult(item.result || '')),
        })),
      };
      const saved = await saveWeldInspection(projectId, weldId, payload);
      setRun(saved);
      setMessage('Inspection saved.');
      dispatchAppRefresh({ scope: 'welds', projectId, weldId, reason: 'inspection-saved' });
      window.setTimeout(() => navigate(`/projecten/${projectId}/lassen`, { replace: true, state: { saved: true, weldId } }), 180);
    } catch (err) {
      setError(normalizeApiError(err, 'Inspection could not be saved.'));
    } finally {
      setSaving(false);
    }
  }

  function renderMetaCell(icon: ReactElement, label: string, value: string) {
    return (
      <div style={s.metaCell} className="inspection-meta-cell">
        <div style={s.metaIcon}>{icon}</div>
        <div>
          <span style={s.metaLabel}>{label}</span>
          <strong style={s.metaValue}>{value}</strong>
        </div>
      </div>
    );
  }

  return (
    <MobilePageScaffold title="" backTo={`/projecten/${projectId}/lassen`} rightSlot={<button className="mobile-icon-button" onClick={() => navigate(`/projecten/${projectId}/lassen`)} aria-label="Back"><ArrowLeft size={18} /></button>}>
      {loading ? <div className="mobile-state-card">Loading inspection…</div> : null}
      {error ? <div className="mobile-state-card mobile-state-card-error">{error}</div> : null}
      {message ? <div className="mobile-state-card mobile-state-card-success">{message}</div> : null}

      {!loading && run ? (
        <div style={s.shell} className="weld-inspection-layout clean-inspection inspection-full-width inspection-optimized-v2">
          <div style={s.breadcrumb}>
            <ArrowLeft size={18} />
            <span>Inspections</span><span>›</span><span>Welds</span><span>›</span><span>{weldDisplayName(weld, String(weldId).slice(0, 8))}</span>
          </div>

          <div style={s.topTitle}>
            <div>
              <h1 style={s.title}>Weld inspection</h1>
              <span style={{ ...s.statusPill, color: toneFor(overall), background: softFor(overall), borderColor: `${toneFor(overall)}33` }}>
                {overall === 'conform' ? <CheckCircle2 size={18} /> : overall === 'not_conform' ? <XCircle size={18} /> : <ShieldCheck size={18} />}
                {pretty(overall)}
              </span>
            </div>
          </div>

          <div style={{ ...s.card, ...s.meta }} className="inspection-meta-grid">
            {renderMetaCell(<ClipboardList size={18} />, 'Project', formatProjectName(project, projectId))}
            {renderMetaCell(<ShieldCheck size={18} />, 'Weld ID', weldDisplayName(weld, String(weldId).slice(0, 8)))}
            {renderMetaCell(<MapPin size={18} />, 'Location', formatWeldLocation(weld))}
            {renderMetaCell(<CalendarDays size={18} />, 'Date', todayLabel())}
          </div>

          {sections.length > 1 ? (
            <div style={s.phase} className="inspection-phase-grid-clean">
              {sections.map((section) => {
                const items = section.items || [];
                const resolved = items.map((item) => values[itemKey(section, item)] || item);
                const done = resolved.filter((item) => normalizeInspectionResult(item.result) === 'conform' || normalizeInspectionResult(item.result) === 'not_applicable').length;
                const active = selectedSection === section.code;
                return (
                  <button key={section.code} type="button" style={{ ...s.phaseBtn, borderColor: active ? '#93c5fd' : '#dbe7f7', borderBottom: active ? '4px solid #2563eb' : '4px solid #dbe7f7' }} onClick={() => setSelectedSection(section.code)}>
                    <strong style={{ display: 'block', color: '#071b45', fontWeight: 950 }}>{section.name}</strong>
                    <span style={{ color: active ? '#2563eb' : '#64748b', fontWeight: 900 }}>{done}/{items.length}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {activeSection ? (
            <div style={s.sectionCard} className="inspection-section-card">
              <div style={s.sectionHeader}>
                <div style={s.sectionTitleRow}><span style={s.sectionIcon}><Eye size={22} /></span><h2 style={s.sectionTitle}>{activeSection.name || 'Visual inspection'}</h2></div>
                <strong style={s.progressText}>{sectionDone} / {activeItems.length}</strong>
              </div>
              <div style={s.progressTrack}><span style={{ ...s.progressBar, width: `${progressPct}%` }} /></div>
              <p style={s.hint}>Visually check the weld against the items below.</p>

              {activeItems.map((item, index) => {
                const key = itemKey(activeSection, item);
                const value = values[key] || item;
                const result = normalizeInspectionResult(value.result || 'conform');
                const color = toneFor(result);
                const soft = softFor(result);
                const commentLength = String(value.comment || '').length;

                return (
                  <article key={key} style={{ ...s.item, borderColor: `${color}33`, background: `linear-gradient(90deg, ${soft} 0, #fff 20%, #fff 100%)` }} className={`inspection-item-card ${statusClass(result)}`}>
                    <div style={s.itemHead}>
                      <div style={{ ...s.itemIndex, color, background: soft }}>{index + 1}</div>
                      <div><h3 style={s.itemTitle}>{item.label}</h3><p style={s.itemRef}>Ref. {normText(item)}</p></div>
                    </div>

                    <div style={s.statusRow} className="inspection-status-grid">
                      {STATUS_CHOICES.map((choice, choiceIndex) => {
                        const Icon = choice.icon;
                        const active = result === choice.key;
                        return (
                          <button key={choice.key} type="button" onClick={() => patch(activeSection, item, { result: choice.key })} style={{ ...s.statusButton, borderRight: choiceIndex === STATUS_CHOICES.length - 1 ? 0 : s.statusButton.borderRight, color: active ? choice.tone : '#475569', background: active ? choice.soft : choice.faint, boxShadow: active ? `inset 0 0 0 2px ${choice.tone}` : 'none' }}>
                            <Icon size={18} /><span>{choice.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div style={s.fieldGrid} className="inspection-fields">
                      <label><span style={s.label}>Value</span><input style={s.input} value={value.measured_value || ''} onChange={(event) => patch(activeSection, item, { measured_value: event.target.value })} placeholder="Optional value" /></label>
                      <label><span style={s.label}>Remarks</span><div style={s.textareaWrap}><textarea style={{ ...s.input, minHeight: 78, paddingBottom: 30, resize: 'vertical' }} value={value.comment || ''} onChange={(event) => patch(activeSection, item, { comment: event.target.value })} placeholder="Add remarks" maxLength={250} /><span style={s.counter}>{commentLength} / 250</span></div></label>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}

          <div style={{ ...s.card, padding: 20, marginTop: 18 }} className="inspection-notes-clean">
            <label><strong style={{ color: '#071b45', fontWeight: 950 }}>General remarks</strong><textarea style={{ ...s.input, minHeight: 90, marginTop: 10, resize: 'vertical' }} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add general inspection remarks" /></label>
          </div>

          <div style={s.sticky} className="inspection-sticky-actions">
            <button type="button" style={s.cancel} onClick={() => navigate(`/projecten/${projectId}/lassen`)} disabled={saving}>Cancel</button>
            <button type="button" style={{ ...s.save, opacity: saving ? .72 : 1 }} disabled={saving} onClick={handleSave}>{saving ? <MinusCircle size={18} /> : <Save size={18} />}{saving ? 'Saving…' : 'Save & close'}</button>
          </div>
        </div>
      ) : null}
    </MobilePageScaffold>
  );
}

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, FileUp, History, Save, ShieldCheck, XCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { createWeldNonconformity, getWeldInspection, saveWeldInspection, uploadWeldInspectionAttachment, type InspectionTemplateItem, type InspectionTemplateSection, type WeldInspectionRun } from '@/api/norms';
import { getProject } from '@/api/projects';
import { getWeld } from '@/api/welds';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { dispatchAppRefresh, normalizeApiError } from '@/features/mobile/mobile-utils';
import type { Project, Weld } from '@/types/domain';

const choices = [
  { key: 'conform', label: 'Compliant', icon: CheckCircle2, tone: '#16a34a', bg: '#ecfdf3' },
  { key: 'in_control', label: 'In control', icon: ShieldCheck, tone: '#2563eb', bg: '#eff6ff' },
  { key: 'not_conform', label: 'Non-compliant', icon: XCircle, tone: '#dc2626', bg: '#fef2f2' },
];

function itemKey(section: InspectionTemplateSection, item: InspectionTemplateItem) { return `${section.code}:${item.code}`; }
function pretty(value?: string) { if (value === 'conform') return 'Compliant'; if (value === 'not_conform') return 'Non-compliant'; if (value === 'repair_required') return 'Repair required'; if (value === 'not_applicable') return 'N/A'; return 'In control'; }
function calcOverall(items: InspectionTemplateItem[]) { if (items.some((i) => ['not_conform', 'repair_required', 'defect'].includes(String(i.result || '')))) return 'not_conform'; if (items.length && items.every((i) => ['conform', 'not_applicable'].includes(String(i.result || '')))) return 'conform'; return 'in_control'; }
function toneFor(value?: string) { if (value === 'conform') return '#16a34a'; if (value === 'not_conform' || value === 'repair_required') return '#dc2626'; return '#2563eb'; }
function normText(item: InspectionTemplateItem) { return item.norm_reference || item.norm_code || 'Standard not linked'; }

const s: Record<string, CSSProperties> = {
  grid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 18, alignItems: 'start' },
  meta: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 14 },
  card: { background: '#fff', border: '1px solid #dbe7f7', borderRadius: 18, boxShadow: '0 18px 40px rgba(15,23,42,.06)' },
  phase: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 16 },
  phaseBtn: { padding: 16, border: '1px solid #dbe7f7', borderRadius: 16, background: '#fff', textAlign: 'left', cursor: 'pointer', minWidth: 0 },
  item: { padding: 16, marginBottom: 12, border: '1px solid #dbe7f7', borderRadius: 18, background: '#fff', overflow: 'hidden' },
  statusRow: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, margin: '14px 0' },
  fieldGrid: { display: 'grid', gridTemplateColumns: 'minmax(160px, 240px) minmax(220px, 1fr)', gap: 12 },
  input: { width: '100%', border: '1px solid #cfe0f7', borderRadius: 12, padding: '12px 14px', fontSize: 14, background: '#fff' },
  sticky: { position: 'sticky', bottom: 0, zIndex: 10, display: 'grid', gridTemplateColumns: 'minmax(170px, 1fr) minmax(210px, 1.4fr)', gap: 12, padding: 14, marginTop: 16, background: 'rgba(248,251,255,.94)', backdropFilter: 'blur(12px)', borderTop: '1px solid #dbe7f7' },
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
  const [uploaded, setUploaded] = useState<Record<string, string[]>>({});
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
          next[itemKey(section, item)] = { ...item, ...match, result: match?.result || item.result || 'in_control', comment: match?.comment || item.comment || '' };
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
  const counts = useMemo(() => ({ compliant: allItems.filter((i) => i.result === 'conform').length, control: allItems.filter((i) => !i.result || i.result === 'in_control' || i.result === 'not_checked').length, failed: allItems.filter((i) => i.result === 'not_conform' || i.result === 'repair_required').length }), [allItems]);

  function patch(section: InspectionTemplateSection, item: InspectionTemplateItem, next: Partial<InspectionTemplateItem>) {
    const key = itemKey(section, item);
    setValues((current) => ({ ...current, [key]: { ...(current[key] || item), ...next } }));
  }

  async function handleSave() {
    setSaving(true); setError(null); setMessage(null);
    try {
      const payload = { notes, status: overall, overall_status: overall, result: overall, results: allItems.map((item) => ({ template_item_code: item.code, item_code: item.code, code: item.code, section_code: (item as any).section_code, result: item.result || 'in_control', status: item.result || 'in_control', measured_value: item.measured_value || '', comment: item.comment || '', remark: item.comment || '', norm_code: item.norm_code, norm_reference: item.norm_reference, label: item.label, approved: item.result === 'conform' })) };
      const saved = await saveWeldInspection(projectId, weldId, payload);
      setRun(saved);
      setMessage('Inspection saved.');
      dispatchAppRefresh({ scope: 'welds', projectId, weldId, reason: 'inspection-saved' });
      window.setTimeout(() => navigate(`/projecten/${projectId}/lassen`, { replace: true, state: { saved: true, weldId } }), 180);
    } catch (err) { setError(normalizeApiError(err, 'Could not save the inspection.')); }
    finally { setSaving(false); }
  }

  async function handleAttachment(section: InspectionTemplateSection, item: InspectionTemplateItem, files?: FileList | null) {
    const file = files?.[0]; if (!file) return;
    const key = itemKey(section, item);
    const formData = new FormData();
    formData.set('file', file);
    formData.set('template_item_code', item.code);
    try {
      await uploadWeldInspectionAttachment(projectId, weldId, formData);
      setUploaded((cur) => ({ ...cur, [key]: [...(cur[key] || []), file.name] }));
      setMessage('Photo uploaded.');
    } catch (err) { setError(normalizeApiError(err, 'Could not upload the photo.')); }
  }

  async function handleCreateNc(item?: InspectionTemplateItem) {
    try { await createWeldNonconformity(projectId, weldId, { title: item?.label || 'Inspection deviation', description: item?.comment || notes || 'Deviation created from inspection.', norm_code: item?.norm_code, norm_reference: item?.norm_reference, severity: item?.severity_on_fail || 'major' }); setMessage('Deviation / NC created.'); }
    catch (err) { setError(normalizeApiError(err, 'Could not create the NC.')); }
  }

  return (
    <MobilePageScaffold title={`Weld inspection ${String((weld as any)?.weld_number || (weld as any)?.number || weldId)}`} backTo={`/projecten/${projectId}/lassen`} rightSlot={<button className="mobile-icon-button" onClick={() => navigate(`/projecten/${projectId}/lassen`)} aria-label="Back"><ArrowLeft size={18} /></button>}>
      {loading ? <div className="mobile-state-card">Loading inspection…</div> : null}
      {error ? <div className="mobile-state-card mobile-state-card-error">{error}</div> : null}
      {message ? <div className="mobile-state-card mobile-state-card-success">{message}</div> : null}
      {!loading && run ? <div style={s.grid} className="weld-inspection-layout clean-inspection">
        <section>
          <div style={s.meta} className="inspection-meta-grid">
            {[['Project', project?.name || projectId], ['Weld', String((weld as any)?.weld_number || (weld as any)?.number || weldId)], ['Material', String((weld as any)?.material || '—')], ['Welder', String((weld as any)?.welder_name || '—')], ['Status', pretty(overall)]].map(([label, value]) => <div key={label} style={{ ...s.card, padding: 16 }} className="inspection-meta-card"><span>{label}</span><strong style={{ color: label === 'Status' ? toneFor(overall) : '#0f172a' }}>{value}</strong></div>)}
          </div>

          <div style={s.phase} className="inspection-phase-grid-clean">{sections.map((section) => { const items = section.items || []; const resolved = items.map((item) => values[itemKey(section, item)] || item); const done = resolved.filter((item) => item.result === 'conform' || item.result === 'not_applicable').length; const active = selectedSection === section.code; return <button key={section.code} type="button" style={{ ...s.phaseBtn, borderBottom: active ? '4px solid #2563eb' : '4px solid #22c55e' }} onClick={() => setSelectedSection(section.code)}><strong>{section.name}</strong><span>{done}/{items.length}</span></button>; })}</div>

          {activeSection ? <div style={{ ...s.card, padding: 16 }} className="inspection-section-card"><div className="inspection-section-title"><h3>{activeSection.name}</h3><span>{(activeSection.items || []).length} items</span></div>{(activeSection.items || []).map((item, index) => { const key = itemKey(activeSection, item); const value = values[key] || item; return <article key={key} style={{ ...s.item, borderLeft: `5px solid ${toneFor(value.result)}` }} className="inspection-item-card"><div className="inspection-item-head"><div className="inspection-item-index">{index + 1}</div><div><h4>{item.label}</h4><p>{normText(item)}</p></div></div><div style={s.statusRow} className="inspection-status-grid">{choices.map((choice) => { const Icon = choice.icon; const active = value.result === choice.key; return <button key={choice.key} type="button" onClick={() => patch(activeSection, item, { result: choice.key })} style={{ border: `1.5px solid ${active ? choice.tone : '#dbe7f7'}`, color: active ? choice.tone : '#0f172a', background: active ? choice.bg : '#fff' }}><Icon size={16} />{choice.label}</button>; })}</div><div style={s.fieldGrid} className="inspection-fields"><label><span>Value</span><input style={s.input} value={value.measured_value || ''} onChange={(event) => patch(activeSection, item, { measured_value: event.target.value })} placeholder="Optional value" /></label><label><span>Remarks</span><textarea style={{ ...s.input, minHeight: 72 }} value={value.comment || ''} onChange={(event) => patch(activeSection, item, { comment: event.target.value })} placeholder="Add remarks" /></label></div><div className="inspection-actions"><label className="mobile-secondary-button"><Camera size={16} /> Photo<input type="file" accept="image/*" style={{ display: 'none' }} onChange={(event) => handleAttachment(activeSection, item, event.target.files)} /></label>{(uploaded[key] || []).map((name) => <span key={name} className="inspection-file-pill"><FileUp size={13} /> {name}</span>)}<button type="button" className="mobile-secondary-button" onClick={() => handleCreateNc(value)}><AlertTriangle size={15} /> NC</button></div></article>; })}</div> : null}

          <div style={{ ...s.card, padding: 16, marginTop: 14 }} className="inspection-notes-clean"><label><strong>General remarks</strong><textarea style={{ ...s.input, minHeight: 80, marginTop: 8 }} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add general remarks" /></label></div>
          <div style={s.sticky} className="inspection-sticky-actions"><button className="mobile-secondary-button" onClick={() => handleCreateNc()}><AlertTriangle size={16} /> Create NC</button><button className="mobile-primary-button" disabled={saving} onClick={handleSave}><Save size={16} /> {saving ? 'Saving…' : 'Save & close'}</button></div>
        </section>
        <aside className="inspection-side-clean"><div style={{ ...s.card, padding: 18 }}><h3><ShieldCheck size={18} /> Status</h3><strong style={{ color: toneFor(overall) }}>{pretty(overall)}</strong></div><div style={{ ...s.card, padding: 18 }}><h3>Summary</h3><p>Total <strong>{allItems.length}</strong></p><p>Compliant <strong style={{ color: '#16a34a' }}>{counts.compliant}</strong></p><p>In control <strong style={{ color: '#2563eb' }}>{counts.control}</strong></p><p>Non-compliant <strong style={{ color: '#dc2626' }}>{counts.failed}</strong></p></div><div style={{ ...s.card, padding: 18 }}><h3><History size={18} /> History</h3>{(run.history || []).length ? (run.history || []).map((row, idx) => <p key={idx}>{String(row.action || row.status || 'Change')}</p>) : <p>No history.</p>}</div></aside>
      </div> : null}
    </MobilePageScaffold>
  );
}

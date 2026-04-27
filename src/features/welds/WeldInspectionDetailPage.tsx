import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, CircleDot, FileUp, History, Save, ShieldCheck, XCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { createWeldNonconformity, getWeldInspection, saveWeldInspection, uploadWeldInspectionAttachment, type InspectionTemplateItem, type InspectionTemplateSection, type WeldInspectionRun } from '@/api/norms';
import { getProject } from '@/api/projects';
import { getWeld } from '@/api/welds';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { dispatchAppRefresh, normalizeApiError } from '@/features/mobile/mobile-utils';
import type { Project, Weld } from '@/types/domain';

const choices = [
  { key: 'conform', label: 'Conform', icon: CheckCircle2, tone: '#16a34a', bg: '#ecfdf3' },
  { key: 'in_control', label: 'In control', icon: ShieldCheck, tone: '#2563eb', bg: '#eff6ff' },
  { key: 'not_conform', label: 'Niet conform', icon: XCircle, tone: '#dc2626', bg: '#fef2f2' },
];
function itemKey(section: InspectionTemplateSection, item: InspectionTemplateItem) { return `${section.code}:${item.code}`; }
function pretty(value?: string) { if (value === 'conform') return 'Conform'; if (value === 'not_conform') return 'Niet conform'; if (value === 'repair_required') return 'Reparatie nodig'; if (value === 'not_applicable') return 'N.v.t.'; return 'In control'; }
function calcOverall(items: InspectionTemplateItem[]) { if (items.some((i) => ['not_conform', 'repair_required', 'defect'].includes(String(i.result || '')))) return 'not_conform'; if (items.length && items.every((i) => ['conform', 'not_applicable'].includes(String(i.result || '')))) return 'conform'; return 'in_control'; }
function toneFor(value?: string) { if (value === 'conform') return '#16a34a'; if (value === 'not_conform' || value === 'repair_required') return '#dc2626'; return '#2563eb'; }

const s: Record<string, React.CSSProperties> = {
  grid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 18, alignItems: 'start' },
  meta: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 12, marginBottom: 14 },
  card: { background: '#fff', border: '1px solid #dbe7f7', borderRadius: 18, boxShadow: '0 18px 40px rgba(15,23,42,.06)' },
  phase: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 },
  phaseBtn: { padding: 16, border: '1px solid #dbe7f7', borderRadius: 16, background: '#fff', textAlign: 'left', cursor: 'pointer' },
  item: { padding: 16, marginBottom: 12, border: '1px solid #dbe7f7', borderRadius: 18, background: '#fff' },
  statusRow: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(120px, 1fr))', gap: 10, margin: '14px 0' },
  fieldGrid: { display: 'grid', gridTemplateColumns: 'minmax(180px, 260px) minmax(260px, 1fr)', gap: 12 },
  input: { width: '100%', border: '1px solid #cfe0f7', borderRadius: 12, padding: '12px 14px', fontSize: 14, background: '#fff' },
  sticky: { position: 'sticky', bottom: 0, zIndex: 10, display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) minmax(220px, 1.4fr)', gap: 12, padding: 14, marginTop: 16, background: 'rgba(248,251,255,.92)', backdropFilter: 'blur(12px)', borderTop: '1px solid #dbe7f7' },
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
      .catch((err) => { if (active) setError(normalizeApiError(err, 'Lasinspectie kon niet worden geladen.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId, weldId]);

  const sections = run?.sections || [];
  const activeSection = sections.find((section) => section.code === selectedSection) || sections[0];
  const allItems = useMemo(() => sections.flatMap((section) => (section.items || []).map((item) => values[itemKey(section, item)] || item)), [sections, values]);
  const overall = calcOverall(allItems);
  const counts = useMemo(() => ({ conform: allItems.filter((i) => i.result === 'conform').length, inControl: allItems.filter((i) => !i.result || i.result === 'in_control' || i.result === 'not_checked').length, bad: allItems.filter((i) => i.result === 'not_conform' || i.result === 'repair_required').length }), [allItems]);

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
      setMessage('Inspectie opgeslagen.');
      dispatchAppRefresh({ scope: 'welds', projectId, weldId, reason: 'inspection-saved' });
      window.setTimeout(() => navigate(`/projecten/${projectId}/lassen`, { replace: true, state: { saved: true, weldId } }), 180);
    } catch (err) { setError(normalizeApiError(err, 'Inspectie opslaan mislukt.')); }
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
      setMessage('Foto geüpload.');
    } catch (err) { setError(normalizeApiError(err, 'Foto uploaden mislukt.')); }
  }

  async function handleCreateNc(item?: InspectionTemplateItem) {
    try { await createWeldNonconformity(projectId, weldId, { title: item?.label || 'Afwijking uit lasinspectie', description: item?.comment || notes || 'Afwijking aangemaakt vanuit inspectie.', norm_code: item?.norm_code, norm_reference: item?.norm_reference, severity: item?.severity_on_fail || 'major' }); setMessage('Afwijking / NC aangemaakt.'); }
    catch (err) { setError(normalizeApiError(err, 'NC aanmaken mislukt.')); }
  }

  return (
    <MobilePageScaffold title={`Lasinspectie ${String((weld as any)?.weld_number || (weld as any)?.number || weldId)}`} subtitle="Card workflow met statusknoppen, foto’s en directe opslag" backTo={`/projecten/${projectId}/lassen`} rightSlot={<button className="mobile-icon-button" onClick={() => navigate(`/projecten/${projectId}/lassen`)}><ArrowLeft size={18} /></button>}>
      {loading ? <div className="mobile-state-card">Lasinspectie laden…</div> : null}
      {error ? <div className="mobile-state-card mobile-state-card-error">{error}</div> : null}
      {message ? <div className="mobile-state-card mobile-state-card-success">{message}</div> : null}
      {!loading && run ? <div style={s.grid} className="weld-inspection-layout">
        <section>
          <div style={s.meta}>
            {[['Project', project?.name || projectId], ['Lasnummer', String((weld as any)?.weld_number || (weld as any)?.number || weldId)], ['Materiaal', String((weld as any)?.material || '—')], ['Lasser', String((weld as any)?.welder_name || '—')], ['Status', pretty(overall)]].map(([label, value]) => <div key={label} style={{ ...s.card, padding: 16 }}><span style={{ color: '#64748b', fontSize: 13 }}>{label}</span><strong style={{ display: 'block', marginTop: 5, color: label === 'Status' ? toneFor(overall) : '#0f172a' }}>{value}</strong></div>)}
          </div>

          <div style={s.phase}>{sections.map((section) => { const items = section.items || []; const resolved = items.map((item) => values[itemKey(section, item)] || item); const done = resolved.filter((item) => item.result === 'conform' || item.result === 'not_applicable').length; return <button key={section.code} type="button" style={{ ...s.phaseBtn, borderBottom: selectedSection === section.code ? '4px solid #2563eb' : '4px solid #22c55e' }} onClick={() => setSelectedSection(section.code)}><strong>{section.name}</strong><span style={{ display: 'block', marginTop: 4, color: '#64748b' }}>{done} / {items.length} gecontroleerd</span></button>; })}</div>

          {activeSection ? <div style={{ ...s.card, padding: 16 }}><h3 style={{ margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}><CircleDot size={18} /> {activeSection.name}<span style={{ fontSize: 12, color: '#2563eb', background: '#eff6ff', borderRadius: 999, padding: '4px 9px' }}>{(activeSection.items || []).length} punten</span></h3>{(activeSection.items || []).map((item, index) => { const key = itemKey(activeSection, item); const value = values[key] || item; return <article key={key} style={{ ...s.item, borderLeft: `5px solid ${toneFor(value.result)}` }}><div style={{ display: 'grid', gridTemplateColumns: '42px 1fr', gap: 12 }}><div style={{ width: 34, height: 34, borderRadius: 999, background: '#eef4fb', display: 'grid', placeItems: 'center', fontWeight: 800 }}>{index + 1}</div><div><h4 style={{ margin: 0 }}>{item.label}</h4><p style={{ margin: '4px 0 0', color: '#475569' }}>{item.norm_reference || item.norm_code || 'Norm niet gekoppeld'}</p></div></div><div style={s.statusRow}>{choices.map((choice) => { const Icon = choice.icon; const active = value.result === choice.key; return <button key={choice.key} type="button" onClick={() => patch(activeSection, item, { result: choice.key })} style={{ border: `1.5px solid ${active ? choice.tone : '#dbe7f7'}`, color: active ? choice.tone : '#0f172a', background: active ? choice.bg : '#fff', borderRadius: 12, padding: '12px 10px', fontWeight: 800, cursor: 'pointer' }}><Icon size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />{choice.label}</button>; })}</div><div style={s.fieldGrid}><label><span style={{ fontSize: 12, color: '#64748b' }}>Waarde</span><input style={s.input} value={value.measured_value || ''} onChange={(event) => patch(activeSection, item, { measured_value: event.target.value })} placeholder="Waarde indien van toepassing" /></label><label><span style={{ fontSize: 12, color: '#64748b' }}>Opmerking</span><textarea style={{ ...s.input, minHeight: 72 }} value={value.comment || ''} onChange={(event) => patch(activeSection, item, { comment: event.target.value })} placeholder="Opmerking" /></label></div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 12 }}><label className="mobile-secondary-button" style={{ cursor: 'pointer' }}><Camera size={16} /> Foto uploaden<input type="file" accept="image/*" style={{ display: 'none' }} onChange={(event) => handleAttachment(activeSection, item, event.target.files)} /></label>{(uploaded[key] || []).map((name) => <span key={name} style={{ border: '1px solid #dbe7f7', borderRadius: 10, padding: '8px 10px', color: '#475569' }}><FileUp size={13} /> {name}</span>)}<button type="button" className="mobile-secondary-button" onClick={() => handleCreateNc(value)}><AlertTriangle size={15} /> Afwijking / NC</button></div></article>; })}</div> : null}

          <div style={{ ...s.card, padding: 16, marginTop: 14 }}><label><strong>Algemene opmerking</strong><textarea style={{ ...s.input, minHeight: 80, marginTop: 8 }} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Algemene inspectie-opmerking" /></label></div>
          <div style={s.sticky}><button className="mobile-secondary-button" onClick={() => handleCreateNc()}><AlertTriangle size={16} /> Afwijking / NC aanmaken</button><button className="mobile-primary-button" disabled={saving} onClick={handleSave}><Save size={16} /> {saving ? 'Opslaan…' : 'Opslaan en sluiten'}</button></div>
        </section>
        <aside style={{ display: 'grid', gap: 14 }}><div style={{ ...s.card, padding: 18 }}><h3><ShieldCheck size={18} /> Huidige status</h3><strong style={{ display: 'block', color: toneFor(overall), fontSize: 22 }}>{pretty(overall)}</strong></div><div style={{ ...s.card, padding: 18 }}><h3>Samenvatting</h3><p>Totaal punten <strong style={{ float: 'right' }}>{allItems.length}</strong></p><p>Conform <strong style={{ float: 'right', color: '#16a34a' }}>{counts.conform}</strong></p><p>In control <strong style={{ float: 'right', color: '#2563eb' }}>{counts.inControl}</strong></p><p>Niet conform <strong style={{ float: 'right', color: '#dc2626' }}>{counts.bad}</strong></p></div><div style={{ ...s.card, padding: 18 }}><h3><History size={18} /> Historie</h3>{(run.history || []).length ? (run.history || []).map((row, idx) => <p key={idx}>{String(row.action || row.status || 'Wijziging')}</p>) : <p>Geen historie beschikbaar.</p>}</div></aside>
      </div> : null}
    </MobilePageScaffold>
  );
}

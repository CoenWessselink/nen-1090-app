import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, FileUp, History, Save, ShieldCheck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { createWeldNonconformity, getWeldInspection, saveWeldInspection, uploadWeldInspectionAttachment, type InspectionTemplateItem, type InspectionTemplateSection, type WeldInspectionRun } from '@/api/norms';
import { getProject } from '@/api/projects';
import { getWeld } from '@/api/welds';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { normalizeApiError } from '@/features/mobile/mobile-utils';
import type { Project, Weld } from '@/types/domain';

const resultOptions = [
  ['not_checked', 'Niet gecontroleerd'], ['conform', 'Conform'], ['in_control', 'In control'], ['not_conform', 'Niet conform'], ['not_applicable', 'N.v.t.'], ['repair_required', 'Reparatie nodig'],
];
function tone(value?: string) { const status = String(value || '').toLowerCase(); if (status.includes('conform') && !status.includes('not')) return 'success'; if (status.includes('reject') || status.includes('not_conform') || status.includes('repair')) return 'danger'; return 'warning'; }
function labelForResult(value?: string) { return resultOptions.find(([key]) => key === value)?.[1] || 'Niet gecontroleerd'; }
function itemKey(section: InspectionTemplateSection, item: InspectionTemplateItem) { return `${section.code}:${item.code}`; }

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
    Promise.all([getProject(projectId).catch(() => null), getWeld(projectId, weldId).catch(() => null), getWeldInspection(weldId)])
      .then(([projectRecord, weldRecord, inspection]) => {
        if (!active) return;
        setProject(projectRecord as Project | null); setWeld(weldRecord as Weld | null); setRun(inspection); setNotes(String(inspection.notes || ''));
        const next: Record<string, InspectionTemplateItem> = {};
        const results = Array.isArray(inspection.results) ? inspection.results : [];
        (inspection.sections || []).forEach((section) => (section.items || []).forEach((item) => {
          const match = results.find((result) => result.code === item.code || (result as any).template_item_code === item.code);
          next[itemKey(section, item)] = { ...item, ...match, result: match?.result || item.result || 'not_checked', comment: match?.comment || item.comment || '' };
        }));
        setValues(next); setSelectedSection(inspection.sections?.[0]?.code || ''); setError(null);
      })
      .catch((err) => { if (!active) return; setError(normalizeApiError(err, 'Lasinspectie kon niet worden geladen.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId, weldId]);

  const sections = run?.sections || [];
  const activeSection = sections.find((section) => section.code === selectedSection) || sections[0];
  const allItems = useMemo(() => sections.flatMap((section) => (section.items || []).map((item) => values[itemKey(section, item)] || item)), [sections, values]);
  const phaseStats = useMemo(() => sections.map((section) => {
    const items = section.items || [];
    const resolved = items.map((item) => values[itemKey(section, item)] || item);
    const conform = resolved.filter((item) => item.result === 'conform' || item.result === 'not_applicable').length;
    const rejected = resolved.some((item) => ['not_conform', 'repair_required', 'reinspection_required'].includes(String(item.result || '')));
    return { section, conform, total: items.length, tone: rejected ? 'danger' : conform === items.length && items.length ? 'success' : 'warning' };
  }), [sections, values]);

  function patch(section: InspectionTemplateSection, item: InspectionTemplateItem, next: Partial<InspectionTemplateItem>) {
    const key = itemKey(section, item);
    setValues((current) => ({ ...current, [key]: { ...(current[key] || item), ...next } }));
  }

  async function handleSave() {
    setSaving(true); setError(null); setMessage(null);
    try {
      const payload = { notes, results: allItems.map((item) => ({ template_item_code: item.code, code: item.code, section_code: (item as any).section_code, result: item.result || 'not_checked', measured_value: item.measured_value || '', comment: item.comment || '', norm_code: item.norm_code, norm_reference: item.norm_reference, label: item.label })) };
      const saved = await saveWeldInspection(weldId, payload);
      setRun(saved); setMessage('Inspectie opgeslagen.');
    } catch (err) { setError(normalizeApiError(err, 'Inspectie opslaan mislukt.')); }
    finally { setSaving(false); }
  }

  async function handleCreateNc(item?: InspectionTemplateItem) {
    try { await createWeldNonconformity(weldId, { title: item?.label || 'Afwijking uit lasinspectie', description: item?.comment || notes || 'Afwijking aangemaakt vanuit normgestuurde inspectie.', norm_code: item?.norm_code, norm_reference: item?.norm_reference, severity: item?.severity_on_fail || 'major' }); setMessage('Afwijking / NC aangemaakt.'); }
    catch (err) { setError(normalizeApiError(err, 'NC aanmaken mislukt.')); }
  }

  async function handleAttachment(item?: InspectionTemplateItem, files?: FileList | null) {
    const file = files?.[0]; if (!file) return;
    const formData = new FormData(); formData.set('file', file); if (item?.code) formData.set('template_item_code', item.code);
    try { await uploadWeldInspectionAttachment(weldId, formData); setMessage('Bijlage geüpload.'); }
    catch (err) { setError(normalizeApiError(err, 'Bijlage uploaden mislukt.')); }
  }

  return (
    <MobilePageScaffold title={`Lasinspectie ${String((weld as any)?.weld_number || (weld as any)?.number || weldId)}`} subtitle="Normprofiel → template snapshot → resultaat → NC → CE checks" backTo={`/projecten/${projectId}/lassen`} rightSlot={<button className="mobile-icon-button" onClick={() => navigate(`/projecten/${projectId}/lassen`)}><ArrowLeft size={18} /></button>}>
      {loading ? <div className="mobile-state-card">Lasinspectie laden…</div> : null}
      {error ? <div className="mobile-state-card mobile-state-card-error">{error}</div> : null}
      {message ? <div className="mobile-state-card mobile-state-card-success">{message}</div> : null}
      {!loading && run ? <div className="weld-inspection-layout">
        <section className="weld-inspection-main">
          <div className="weld-meta-strip"><div><span>Project</span><strong>{project?.name || projectId}</strong></div><div><span>Lasnummer</span><strong>{String((weld as any)?.weld_number || (weld as any)?.number || weldId)}</strong></div><div><span>Materiaal</span><strong>{String((weld as any)?.material || '—')}</strong></div><div><span>Lasser</span><strong>{String((weld as any)?.welder_name || '—')}</strong></div><div><span>Status</span><strong>{run.overall_result || run.status || 'in_control'}</strong></div></div>
          <div className="inspection-phase-grid">{phaseStats.map(({ section, conform, total, tone }) => <button key={section.code} className={`inspection-phase-card tone-${tone} ${selectedSection === section.code ? 'is-active' : ''}`} onClick={() => setSelectedSection(section.code)}><strong>{section.name}</strong><span>{conform}/{total} conform</span></button>)}</div>
          {activeSection ? <div className="inspection-table-card"><div className="section-title-row"><h3>{activeSection.name}</h3><span>{activeSection.phase || activeSection.code}</span></div><div className="responsive-table-wrap"><table className="enterprise-table inspection-items-table"><thead><tr><th>Nr.</th><th>Inspectiepunt</th><th>Norm</th><th>Resultaat</th><th>Waarde / opmerking</th><th>Bijlagen</th><th>NC</th></tr></thead><tbody>{(activeSection.items || []).map((item, index) => { const value = values[itemKey(activeSection, item)] || item; return <tr key={item.code}><td>{index + 1}</td><td><strong>{item.label}</strong>{item.required ? <small>Verplicht</small> : null}</td><td>{item.norm_code || '—'}<small>{item.norm_reference || ''}</small></td><td><select value={value.result || 'not_checked'} onChange={(event) => patch(activeSection, item, { result: event.target.value })}>{resultOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></td><td><input value={value.measured_value || ''} onChange={(event) => patch(activeSection, item, { measured_value: event.target.value })} placeholder="Waarde" /><textarea value={value.comment || ''} onChange={(event) => patch(activeSection, item, { comment: event.target.value })} placeholder="Opmerking" /></td><td><label className="file-cell-button"><FileUp size={16} /> Upload<input type="file" onChange={(event) => handleAttachment(value, event.target.files)} /></label></td><td><button type="button" className="mobile-secondary-button" onClick={() => handleCreateNc(value)}><AlertTriangle size={14} /> NC</button></td></tr>; })}</tbody></table></div></div> : null}
          <div className="inspection-notes-card"><label><span>Algemene opmerking</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label><div className="mobile-inline-actions"><button className="mobile-secondary-button" onClick={() => handleCreateNc()}><AlertTriangle size={16} /> Afwijking / NC aanmaken</button><button className="mobile-primary-button" disabled={saving} onClick={handleSave}><Save size={16} /> {saving ? 'Opslaan…' : 'Opslaan'}</button></div></div>
        </section>
        <aside className="inspection-side-panel"><div className="side-panel-card"><h3><ShieldCheck size={18} /> Normen & acceptatie</h3><p>Backend smart rules zijn leidend. Niet-conform met verplichte opmerking wordt server-side gevalideerd.</p></div><div className="side-panel-card"><h3><History size={18} /> Historie</h3>{(run.history || []).length ? (run.history || []).map((row, idx) => <p key={idx}>{String(row.action || row.status || 'Wijziging')}</p>) : <p>Geen historie beschikbaar.</p>}</div><div className={`side-panel-card tone-${tone(run.overall_result)}`}><h3><CheckCircle2 size={18} /> Resultaat</h3><strong>{labelForResult(run.overall_result)}</strong></div></aside>
      </div> : null}
    </MobilePageScaffold>
  );
}

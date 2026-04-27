import { useEffect, useState } from 'react';
import { RefreshCcw, Save, ShieldCheck } from 'lucide-react';
import { getCeDossierChecks, updateCeDossierCheck, type CeNormCheck } from '@/api/norms';

function tone(status?: string) { const value = String(status || '').toLowerCase(); if (['approved','present','conform'].includes(value)) return 'success'; if (['missing','rejected'].includes(value)) return 'danger'; return 'warning'; }

export function CeNormChecksPanel({ projectId }: { projectId: string }) {
  const [checks, setChecks] = useState<CeNormCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() { setLoading(true); setError(null); try { setChecks(await getCeDossierChecks(projectId)); } catch (err) { setError(err instanceof Error ? err.message : 'Normchecks konden niet worden geladen.'); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, [projectId]);
  async function patch(check: CeNormCheck, next: Partial<CeNormCheck>) { setSavingId(check.id); setError(null); try { const saved = await updateCeDossierCheck(projectId, check.id, next); setChecks((rows) => rows.map((row) => row.id === check.id ? { ...row, ...saved } : row)); } catch (err) { setError(err instanceof Error ? err.message : 'Normcheck opslaan mislukt.'); } finally { setSavingId(null); } }

  return <section className="ce-norm-checks-panel">
    <div className="section-title-row"><h3><ShieldCheck size={18} /> Normchecks CE-dossier</h3><button type="button" className="mobile-secondary-button" onClick={load}><RefreshCcw size={14} /> Verversen</button></div>
    {loading ? <div className="mobile-state-card">Normchecks laden…</div> : null}{error ? <div className="mobile-state-card mobile-state-card-error">{error}</div> : null}
    {!loading && !error && checks.length === 0 ? <div className="mobile-state-card">Geen normchecks gevonden. De API genereert deze uit het projecttemplate zodra een normprofiel actief is.</div> : null}
    <div className="ce-norm-check-list">{checks.map((check) => <div key={check.id} className={`ce-norm-check-row tone-${tone(check.status)}`}><div><strong>{check.label}</strong><span>{check.norm_code || '—'} {check.norm_reference || ''}</span></div><select value={check.status || 'missing'} onChange={(event) => patch(check, { status: event.target.value })}><option value="missing">Ontbreekt</option><option value="present">Aanwezig</option><option value="approved">Goedgekeurd</option><option value="not_applicable">N.v.t.</option><option value="rejected">Afgekeurd</option></select><input value={check.comment || ''} placeholder="Opmerking" onChange={(event) => setChecks((rows) => rows.map((row) => row.id === check.id ? { ...row, comment: event.target.value } : row))} onBlur={(event) => patch(check, { comment: event.target.value })} /><button type="button" className="mobile-secondary-button" disabled={savingId === check.id} onClick={() => patch(check, check)}><Save size={14} /> Opslaan</button></div>)}</div>
  </section>;
}

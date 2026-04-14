import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getWeld, updateWeld } from '@/api/welds';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';

type WeldFormState = {
  assembly_id: string;
  weld_no: string;
  inspected_at: string;
  process: string;
  material: string;
  welders: string;
};

export function MobileWeldEditPage() {
  const navigate = useNavigate();
  const { projectId = '', weldId = '' } = useParams();
  const [form, setForm] = useState<WeldFormState>({
    assembly_id: '',
    weld_no: '',
    inspected_at: '',
    process: '',
    material: '',
    welders: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getWeld(projectId, weldId)
      .then((result) => {
        if (!active) return;
        const record = (result || {}) as Record<string, unknown>;
        setForm({
          assembly_id: String(record.assembly_id || record.assemblyId || ''),
          weld_no: String(record.weld_no || record.weld_number || ''),
          inspected_at: String(record.inspected_at || record.inspection_date || '').slice(0, 10),
          process: String(record.process || record.lasmethode || ''),
          material: String(record.material || ''),
          welders: String(record.welders || record.welder_name || ''),
        });
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Las kon niet worden geladen.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId, weldId]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateWeld(projectId, weldId, {
        assembly_id: form.assembly_id || null,
        weld_no: form.weld_no,
        inspected_at: form.inspected_at || null,
        process: form.process,
        material: form.material,
        welders: form.welders,
      });
      navigate(`/projecten/${projectId}/lassen`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan mislukt.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <MobilePageScaffold title="Las Bewerken" backTo={`/projecten/${projectId}/lassen`}>
      {loading ? <div className="mobile-state-card">Las laden…</div> : null}
      {error ? <div className="mobile-state-card mobile-state-card-error">{error}</div> : null}
      {!loading ? (
        <div className="mobile-form-card">
          <label className="mobile-form-field"><span>Assemblage</span><input value={form.assembly_id} onChange={(e) => setForm((s) => ({ ...s, assembly_id: e.target.value }))} /></label>
          <label className="mobile-form-field"><span>Lasnummer</span><input value={form.weld_no} onChange={(e) => setForm((s) => ({ ...s, weld_no: e.target.value }))} /></label>
          <label className="mobile-form-field"><span>Lasdatum</span><input type="date" value={form.inspected_at} onChange={(e) => setForm((s) => ({ ...s, inspected_at: e.target.value }))} /></label>
          <label className="mobile-form-field"><span>Lasmethode</span><input value={form.process} onChange={(e) => setForm((s) => ({ ...s, process: e.target.value }))} /></label>
          <label className="mobile-form-field"><span>Materiaal</span><input value={form.material} onChange={(e) => setForm((s) => ({ ...s, material: e.target.value }))} /></label>
          <label className="mobile-form-field"><span>Lasser</span><input value={form.welders} onChange={(e) => setForm((s) => ({ ...s, welders: e.target.value }))} /></label>
          <div className="mobile-form-actions">
            <button type="button" className="mobile-primary-button" onClick={handleSave} disabled={saving}>{saving ? 'Opslaan…' : 'Opslaan'}</button>
            <button type="button" className="mobile-danger-button" onClick={() => navigate(`/projecten/${projectId}/lassen`)}>Annuleren</button>
          </div>
        </div>
      ) : null}
    </MobilePageScaffold>
  );
}

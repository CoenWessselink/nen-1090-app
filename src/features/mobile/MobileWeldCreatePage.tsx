import { useMemo, useState } from 'react';
import { Camera, ImagePlus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { createWeld, uploadWeldAttachment } from '@/api/welds';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { normalizeApiError } from '@/features/mobile/mobile-utils';
import type { WeldFormValues } from '@/types/forms';

function defaultForm(projectId: string): WeldFormValues {
  return {
    project_id: projectId,
    weld_number: '',
    assembly_id: '',
    wps_id: '',
    welder_name: '',
    coordinator_id: '',
    process: '135',
    location: '',
    status: 'conform',
    execution_class: 'EXC2',
    template_id: '',
  };
}

export function MobileWeldCreatePage() {
  const navigate = useNavigate();
  const { projectId = '' } = useParams();
  const [form, setForm] = useState<WeldFormValues>(defaultForm(projectId));
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = useMemo(() => Boolean(form.weld_number.trim() && form.location.trim()), [form]);

  function patch<K extends keyof WeldFormValues>(key: K, value: WeldFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    if (!canSave) {
      setError('Vul minimaal lasnummer en locatie in.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const created = await createWeld({ ...form, project_id: projectId }) as Record<string, unknown>;
      const weldId = String(created.id || created.weld_id || '');
      if (weldId && files.length) {
        for (const file of files) {
          const formData = new FormData();
          formData.append('files', file);
          formData.append('file', file);
          await uploadWeldAttachment(projectId, weldId, formData);
        }
      }
      navigate(`/projecten/${projectId}/lassen`, { replace: true });
    } catch (err) {
      setError(normalizeApiError(err, 'Las aanmaken mislukt.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <MobilePageScaffold title="Nieuwe las" subtitle="Las toevoegen" backTo={`/projecten/${projectId}/lassen`}>
      {error ? <div className="mobile-inline-alert is-error">{error}</div> : null}
      <div className="mobile-form-card" data-testid="mobile-weld-create-form">
        <label className="mobile-form-field"><span>Lasnummer</span><input value={form.weld_number} onChange={(event) => patch('weld_number', event.target.value)} placeholder="Bijv. L-101" /></label>
        <label className="mobile-form-field"><span>Assemblage</span><input value={form.assembly_id || ''} onChange={(event) => patch('assembly_id', event.target.value)} placeholder="Bijv. TR-01" /></label>
        <label className="mobile-form-field mobile-select-field"><span>Lasmethode</span><select value={form.process || '135'} onChange={(event) => patch('process', event.target.value)}><option value="135">135 (MAG)</option><option value="111">111 (BMBE)</option><option value="141">141 (TIG)</option></select></label>
        <label className="mobile-form-field"><span>Materiaal / locatie</span><input value={form.location} onChange={(event) => patch('location', event.target.value)} placeholder="Bijv. S355 / Hal A" /></label>
        <label className="mobile-form-field"><span>Lasser</span><input value={form.welder_name || ''} onChange={(event) => patch('welder_name', event.target.value)} placeholder="Naam lasser" /></label>
        <label className="mobile-form-field mobile-select-field"><span>Status</span><select value={form.status} onChange={(event) => patch('status', event.target.value as WeldFormValues['status'])}><option value="conform">Conform</option><option value="defect">Niet conform</option><option value="gerepareerd">Gerepareerd</option></select></label>
        <label className="mobile-upload-field">
          <span><ImagePlus size={16} /> Foto’s toevoegen</span>
          <input type="file" accept="image/*" capture="environment" multiple onChange={(event) => setFiles(Array.from(event.target.files || []))} />
          <small><Camera size={14} /> Camera of fotobibliotheek</small>
        </label>
        {files.length ? <div className="mobile-file-list">{files.map((file) => <div key={`${file.name}-${file.size}`} className="mobile-file-pill">{file.name}</div>)}</div> : null}
        <div className="mobile-inline-actions stack-on-mobile">
          <button type="button" className="mobile-secondary-button" onClick={() => navigate(`/projecten/${projectId}/lassen`)}>Annuleren</button>
          <button type="button" className="mobile-primary-button" onClick={handleSave} disabled={saving || !canSave}>{saving ? 'Las opslaan…' : 'Las aanmaken'}</button>
        </div>
      </div>
    </MobilePageScaffold>
  );
}

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createProjectAssembly } from '@/api/projects';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { normalizeApiError } from '@/features/mobile/mobile-utils';

export function MobileAssemblyCreatePage() {
  const navigate = useNavigate();
  const { projectId = '' } = useParams();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [drawingNo, setDrawingNo] = useState('');
  const [revision, setRevision] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = useMemo(() => Boolean(code.trim() && name.trim()), [code, name]);

  async function handleSave() {
    if (!canSave) {
      setError('Vul assembly code en naam in.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createProjectAssembly(projectId, {
        temp_id: crypto.randomUUID(),
        code,
        name,
        drawing_no: drawingNo || undefined,
        revision: revision || undefined,
      });
      navigate(`/projecten/${projectId}/overzicht`, { replace: true });
    } catch (err) {
      setError(normalizeApiError(err, 'Assembly aanmaken mislukt.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <MobilePageScaffold title="Nieuwe assembly" subtitle="Assembly wizard" backTo={`/projecten/${projectId}/overzicht`}>
      {error ? <div className="mobile-inline-alert is-error">{error}</div> : null}
      <div className="mobile-form-card">
        <label className="mobile-form-field"><span>Assembly code</span><input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Bijv. A-001" /></label>
        <label className="mobile-form-field"><span>Naam</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Bijv. Kolom 1" /></label>
        <label className="mobile-form-field"><span>Tekeningnummer</span><input value={drawingNo} onChange={(event) => setDrawingNo(event.target.value)} placeholder="Optioneel" /></label>
        <label className="mobile-form-field"><span>Revisie</span><input value={revision} onChange={(event) => setRevision(event.target.value)} placeholder="Optioneel" /></label>
        <div className="mobile-inline-actions stack-on-mobile">
          <button type="button" className="mobile-secondary-button" onClick={() => navigate(`/projecten/${projectId}/overzicht`)}>Annuleren</button>
          <button type="button" className="mobile-primary-button" onClick={handleSave} disabled={!canSave || saving}>{saving ? 'Opslaan…' : 'Assembly aanmaken'}</button>
        </div>
      </div>
    </MobilePageScaffold>
  );
}
